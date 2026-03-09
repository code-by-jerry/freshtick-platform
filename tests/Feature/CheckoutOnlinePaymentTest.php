<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class CheckoutOnlinePaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_online_checkout_initiate_returns_gateway_payload(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $address = UserAddress::factory()->create(['user_id' => $user->id]);
        $order = Order::query()->create([
            'user_id' => $user->id,
            'user_address_id' => $address->id,
            'vertical' => 'daily_fresh',
            'type' => Order::TYPE_ONE_TIME,
            'status' => Order::STATUS_PENDING,
            'subtotal' => 100,
            'discount' => 0,
            'delivery_charge' => 0,
            'total' => 100,
            'currency' => 'INR',
            'payment_status' => Order::PAYMENT_PENDING,
            'scheduled_delivery_date' => now()->addDay()->toDateString(),
        ]);

        $payment = Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'amount' => 100,
            'currency' => 'INR',
            'method' => Payment::METHOD_GATEWAY,
            'gateway' => 'razorpay',
            'status' => Payment::STATUS_PENDING,
        ]);

        $cart = Mockery::mock(Cart::class);
        $cart->shouldReceive('isEmpty')->once()->andReturn(false);

        $cartService = Mockery::mock(CartService::class);
        $cartService->shouldReceive('getOrCreateCart')->once()->andReturn($cart);
        $this->app->instance(CartService::class, $cartService);

        $checkoutService = Mockery::mock(CheckoutService::class);
        $checkoutService->shouldReceive('processCheckout')->once()->andReturn([
            'success' => true,
            'order' => $order,
            'payment' => $payment,
            'gateway_data' => [
                'key' => 'rzp_test_key',
                'order_id' => 'order_abc123',
                'amount' => 10000,
                'currency' => 'INR',
            ],
        ]);
        $this->app->instance(CheckoutService::class, $checkoutService);

        $response = $this->actingAs($user)->postJson(route('checkout.initiate-payment'), [
            'user_address_id' => $address->id,
            'scheduled_delivery_date' => now()->addDay()->toDateString(),
            'scheduled_delivery_time' => '08:00',
            'payment_method' => 'upi',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('order_id', $order->id)
            ->assertJsonPath('gateway', 'razorpay')
            ->assertJsonPath('gateway_data.order_id', 'order_abc123');

        $response->assertSessionHas('checkout_payment_pending', function (array $pending) use ($order, $payment): bool {
            return ($pending['order_id'] ?? null) === $order->id
                && ($pending['payment_id'] ?? null) === $payment->id;
        });
    }

    public function test_online_checkout_verify_marks_payment_success_and_returns_redirect(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $address = UserAddress::factory()->create(['user_id' => $user->id]);
        $order = Order::query()->create([
            'user_id' => $user->id,
            'user_address_id' => $address->id,
            'vertical' => 'daily_fresh',
            'type' => Order::TYPE_ONE_TIME,
            'status' => Order::STATUS_PENDING,
            'subtotal' => 100,
            'discount' => 0,
            'delivery_charge' => 0,
            'total' => 100,
            'currency' => 'INR',
            'payment_status' => Order::PAYMENT_PENDING,
            'scheduled_delivery_date' => now()->addDay()->toDateString(),
        ]);

        $payment = Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'amount' => 100,
            'currency' => 'INR',
            'method' => Payment::METHOD_GATEWAY,
            'status' => Payment::STATUS_PENDING,
            'gateway' => 'razorpay',
        ]);

        $paymentService = Mockery::mock(PaymentService::class);
        $paymentService->shouldReceive('verifyRazorpayPayment')
            ->once()
            ->with(Mockery::type(Payment::class), 'order_abc123', 'pay_def456', 'sig_ghi789')
            ->andReturn(['success' => true, 'payment' => $payment]);
        $this->app->instance(PaymentService::class, $paymentService);

        $response = $this->actingAs($user)
            ->withSession([
                'checkout_payment_pending' => [
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                ],
            ])
            ->postJson(route('checkout.verify-payment'), [
                'razorpay_order_id' => 'order_abc123',
                'razorpay_payment_id' => 'pay_def456',
                'razorpay_signature' => 'sig_ghi789',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('order_id', $order->id)
            ->assertJsonPath('redirect_url', route('orders.show', $order));

        $this->assertNull(session('checkout_payment_pending'));
    }
}
