<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Gateways\RazorpayGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class WalletRechargeTest extends TestCase
{
    use RefreshDatabase;

    public function test_wallet_recharge_initiate_returns_checkout_options(): void
    {
        config()->set('payment.gateways.razorpay.key_id', 'rzp_test_key');
        config()->set('payment.gateways.razorpay.key_secret', 'test_secret');
        config()->set('payment.mock', false);

        /** @var User $user */
        $user = User::factory()->create();

        $gateway = Mockery::mock(RazorpayGateway::class);
        $gateway->shouldReceive('createGenericOrder')
            ->once()
            ->andReturn([
                'success' => true,
                'order_id' => 'order_test_123',
            ]);

        $gateway->shouldReceive('getGenericCheckoutOptions')
            ->once()
            ->andReturn([
                'key' => 'rzp_test_key',
                'order_id' => 'order_test_123',
                'amount' => 50000,
                'currency' => 'INR',
            ]);

        $this->app->instance(RazorpayGateway::class, $gateway);

        $response = $this->actingAs($user)->postJson(route('wallet.recharge.initiate'), [
            'amount' => 500,
            'payment_method' => 'gateway',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('gateway', 'razorpay')
            ->assertJsonPath('gateway_data.order_id', 'order_test_123');

        $response->assertSessionHas('wallet_recharge_pending', function (array $pending): bool {
            return ($pending['order_id'] ?? null) === 'order_test_123'
                && (float) ($pending['amount'] ?? 0) === 500.0;
        });
    }

    public function test_wallet_recharge_verify_credits_wallet_after_signature_verification(): void
    {
        config()->set('payment.gateways.razorpay.key_id', 'rzp_test_key');
        config()->set('payment.gateways.razorpay.key_secret', 'test_secret');

        /** @var User $user */
        $user = User::factory()->create();
        $wallet = Wallet::query()->create([
            'user_id' => $user->id,
            'balance' => 0,
            'currency' => 'INR',
            'is_active' => true,
            'low_balance_threshold' => 100,
        ]);

        $gateway = Mockery::mock(RazorpayGateway::class);
        $gateway->shouldReceive('verifyPayment')
            ->once()
            ->with('order_test_123', 'pay_test_456', 'sig_test_789')
            ->andReturn(['success' => true]);

        $this->app->instance(RazorpayGateway::class, $gateway);

        $response = $this->actingAs($user)
            ->withSession([
                'wallet_recharge_pending' => [
                    'order_id' => 'order_test_123',
                    'wallet_id' => $wallet->id,
                    'amount' => 500,
                ],
            ])
            ->postJson(route('wallet.recharge.verify'), [
                'razorpay_order_id' => 'order_test_123',
                'razorpay_payment_id' => 'pay_test_456',
                'razorpay_signature' => 'sig_test_789',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('wallets', [
            'id' => $wallet->id,
            'balance' => '500.00',
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'transaction_type' => WalletTransaction::TRANSACTION_RECHARGE,
            'type' => WalletTransaction::TYPE_CREDIT,
            'amount' => '500.00',
        ]);
    }
}
