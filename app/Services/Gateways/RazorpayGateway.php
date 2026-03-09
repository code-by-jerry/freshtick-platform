<?php

namespace App\Services\Gateways;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

class RazorpayGateway
{
    private Api $api;

    public function __construct()
    {
        $this->api = new Api(
            config('payment.gateways.razorpay.key_id'),
            config('payment.gateways.razorpay.key_secret')
        );
    }

    /**
     * Create a payment order
     *
     * @return array{success: bool, order_id?: string, gateway_order?: array, error?: string}
     */
    public function createOrder(Order $order): array
    {
        try {
            $razorpayOrder = $this->api->order->create($this->buildOrderPayload(
                receipt: $order->order_number,
                amount: (float) $order->total,
                notes: [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                ]
            ));

            return [
                'success' => true,
                'order_id' => $razorpayOrder->id,
                'gateway_order' => $razorpayOrder->toArray(),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay create order failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create a payment order not tied to an Order model.
     *
     * @param  array<string, scalar>  $notes
     * @return array{success: bool, order_id?: string, gateway_order?: array, error?: string}
     */
    public function createGenericOrder(float $amount, string $receipt, array $notes = []): array
    {
        try {
            $razorpayOrder = $this->api->order->create($this->buildOrderPayload(
                receipt: $receipt,
                amount: $amount,
                notes: $notes
            ));

            return [
                'success' => true,
                'order_id' => $razorpayOrder->id,
                'gateway_order' => $razorpayOrder->toArray(),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay create generic order failed', [
                'receipt' => $receipt,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verify payment signature
     *
     * @return array{success: bool, error?: string}
     */
    public function verifyPayment(string $orderId, string $paymentId, string $signature): array
    {
        try {
            $this->api->utility->verifyPaymentSignature([
                'razorpay_order_id' => $orderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $signature,
            ]);

            return ['success' => true];
        } catch (SignatureVerificationError $e) {
            Log::error('Razorpay signature verification failed', [
                'order_id' => $orderId,
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => 'Invalid payment signature'];
        }
    }

    /**
     * Capture a payment
     *
     * @return array{success: bool, payment?: array, error?: string}
     */
    public function capturePayment(string $paymentId, float $amount): array
    {
        try {
            $payment = $this->api->payment->fetch($paymentId);
            $payment->capture([
                'amount' => (int) ($amount * 100),
                'currency' => config('payment.currency', 'INR'),
            ]);

            return [
                'success' => true,
                'payment' => $payment->toArray(),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay capture failed', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fetch payment details
     *
     * @return array{success: bool, payment?: array, error?: string}
     */
    public function fetchPayment(string $paymentId): array
    {
        try {
            $payment = $this->api->payment->fetch($paymentId);

            return [
                'success' => true,
                'payment' => $payment->toArray(),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay fetch payment failed', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Process refund
     *
     * @return array{success: bool, refund_id?: string, refund?: array, error?: string}
     */
    public function refund(string $paymentId, float $amount, ?string $notes = null): array
    {
        try {
            $refund = $this->api->refund->create([
                'payment_id' => $paymentId,
                'amount' => (int) ($amount * 100),
                'notes' => $notes ? ['reason' => $notes] : [],
            ]);

            return [
                'success' => true,
                'refund_id' => $refund->id,
                'refund' => $refund->toArray(),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay refund failed', [
                'payment_id' => $paymentId,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $secret = config('payment.gateways.razorpay.webhook_secret');

        if (! $secret) {
            Log::warning('Razorpay webhook secret not configured');

            return false;
        }

        try {
            $this->api->utility->verifyWebhookSignature($payload, $signature, $secret);

            return true;
        } catch (SignatureVerificationError $e) {
            Log::error('Razorpay webhook signature verification failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get checkout options for frontend
     *
     * @return array<string, mixed>
     */
    public function getCheckoutOptions(Order $order, string $gatewayOrderId): array
    {
        return [
            'key' => config('payment.gateways.razorpay.key_id'),
            'amount' => (int) ($order->total * 100),
            'currency' => config('payment.currency', 'INR'),
            'name' => config('app.name'),
            'description' => "Order #{$order->order_number}",
            'order_id' => $gatewayOrderId,
            'prefill' => [
                'name' => $order->user->name,
                'email' => $order->user->email,
                'contact' => $order->user->phone,
            ],
            'notes' => [
                'order_id' => $order->id,
            ],
            'theme' => [
                'color' => '#10b981',
            ],
        ];
    }

    /**
     * Get checkout options for generic charges like wallet recharge.
     *
     * @param  array<string, mixed>  $prefill
     * @param  array<string, scalar>  $notes
     * @return array<string, mixed>
     */
    public function getGenericCheckoutOptions(
        float $amount,
        string $description,
        string $gatewayOrderId,
        array $prefill = [],
        array $notes = []
    ): array {
        return [
            'key' => config('payment.gateways.razorpay.key_id'),
            'amount' => (int) ($amount * 100),
            'currency' => config('payment.currency', 'INR'),
            'name' => config('app.name'),
            'description' => $description,
            'order_id' => $gatewayOrderId,
            'prefill' => [
                'name' => $prefill['name'] ?? '',
                'email' => $prefill['email'] ?? '',
                'contact' => $prefill['contact'] ?? '',
            ],
            'notes' => $notes,
            'theme' => [
                'color' => '#10b981',
            ],
        ];
    }

    /**
     * @param  array<string, scalar>  $notes
     * @return array<string, mixed>
     */
    private function buildOrderPayload(string $receipt, float $amount, array $notes = []): array
    {
        return [
            'receipt' => $receipt,
            'amount' => (int) ($amount * 100),
            'currency' => config('payment.currency', 'INR'),
            'notes' => $notes,
        ];
    }
}
