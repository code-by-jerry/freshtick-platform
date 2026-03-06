<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserAddress;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckoutService
{
    public function __construct(
        private CartService $cartService,
        private LocationService $locationService,
        private PaymentService $paymentService,
        private WalletService $walletService
    ) {}

    /**
     * Process checkout and create order
     *
     * @param  array<string, mixed>  $data
     * @return array{success: bool, order?: Order, error?: string}
     */
    public function processCheckout(
        Cart $cart,
        User $user,
        UserAddress $address,
        array $data = []
    ): array {
        // Validate checkout
        $validation = $this->validateCheckout($cart, $user, $address);
        if (! $validation['valid']) {
            return [
                'success' => false,
                'error' => implode(' ', $validation['errors']),
            ];
        }

        try {
            return DB::transaction(function () use ($cart, $user, $address, $data) {
                // Create order
                $order = $this->createOrderFromCart($cart, $user, $address, $data);

                // Create order items
                $this->createOrderItems($order, $cart);

                // Create delivery
                $this->createDeliveryForOrder($order, $address, $data);

                // Process payment
                $paymentMethod = $data['payment_method'] ?? 'cod';
                $paymentResult = $this->processPaymentForOrder($order, $user, $paymentMethod);

                if (! $paymentResult['success'] && $paymentMethod !== 'cod') {
                    // For non-COD failed payments, throw to rollback
                    throw new \Exception($paymentResult['error'] ?? 'Payment failed');
                }

                // Clear cart
                $cart->clear();

                Log::info('Order created', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'user_id' => $user->id,
                    'total' => $order->total,
                    'payment_method' => $paymentMethod,
                ]);

                return [
                    'success' => true,
                    'order' => $order,
                    'payment' => $paymentResult['payment'] ?? null,
                ];
            });
        } catch (\Exception $e) {
            Log::error('Checkout failed', [
                'user_id' => $user->id,
                'cart_id' => $cart->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage() === 'Insufficient wallet balance.'
                    ? 'Insufficient wallet balance. Please add money to your wallet or choose a different payment method.'
                    : 'Checkout failed. Please try again.',
            ];
        }
    }

    /**
     * Process payment for order
     *
     * @return array{success: bool, payment?: Payment, error?: string}
     */
    protected function processPaymentForOrder(Order $order, User $user, string $paymentMethod): array
    {
        $total = (float) $order->total;

        if ($paymentMethod === 'wallet') {
            // Process wallet payment
            $wallet = $this->walletService->getOrCreateWallet($user);

            if (! $wallet->hasSufficientBalance($total)) {
                throw new \Exception('Insufficient wallet balance.');
            }

            $result = $this->paymentService->processWalletPayment($order, $wallet);

            if ($result['success']) {
                $order->update([
                    'payment_status' => Order::PAYMENT_PAID,
                    'payment_method' => 'wallet',
                    'status' => Order::STATUS_CONFIRMED,
                ]);
            }

            return $result;
        }

        if ($paymentMethod === 'cod') {
            // COD - create pending payment record
            $payment = Payment::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'amount' => $total,
                'currency' => 'INR',
                'method' => Payment::METHOD_COD,
                'status' => Payment::STATUS_PENDING,
            ]);

            $order->update([
                'payment_method' => 'cod',
                'status' => Order::STATUS_CONFIRMED,
            ]);

            return ['success' => true, 'payment' => $payment];
        }

        // Online payment (gateway/upi)
        $payment = Payment::create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'amount' => $total,
            'currency' => 'INR',
            'method' => Payment::METHOD_GATEWAY,
            'gateway' => 'razorpay', // Default gateway
            'status' => Payment::STATUS_PENDING,
        ]);

        // TODO: Initiate gateway payment and return redirect URL
        // For now, mock as pending - actual integration would redirect to gateway

        return ['success' => true, 'payment' => $payment, 'requires_redirect' => true];
    }

    /**
     * Validate checkout before processing
     *
     * @return array{valid: bool, errors: array<string>}
     */
    public function validateCheckout(Cart $cart, User $user, UserAddress $address): array
    {
        $errors = [];

        // Validate cart
        $cartValidation = $this->cartService->validateCart($cart, $address->zone);
        if (! $cartValidation['valid']) {
            $errors = array_merge($errors, $cartValidation['errors']);
        }

        // Validate address
        if (! $address->is_active) {
            $errors[] = 'Selected address is not active.';
        }

        if ($address->user_id !== $user->id) {
            $errors[] = 'Invalid delivery address.';
        }

        $zone = $address->zone;
        if (! $zone || ! $zone->is_active) {
            $errors[] = 'Delivery is not available at this address.';
        }

        // Check minimum order amount
        if ($zone && $zone->min_order_amount && $cart->subtotal < $zone->min_order_amount) {
            $errors[] = "Minimum order amount is ₹{$zone->min_order_amount}.";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Create order from cart
     *
     * @param  array<string, mixed>  $data
     */
    public function createOrderFromCart(
        Cart $cart,
        User $user,
        UserAddress $address,
        array $data = []
    ): Order {
        $zone = $address->zone;
        $deliveryCharge = $this->calculateDeliveryCharge($cart, $zone);

        // Determine vertical (use primary or first)
        $verticals = $cart->getVerticals();
        $vertical = $data['vertical'] ?? ($verticals[0] ?? 'daily_fresh');

        // Calculate delivery date
        $deliveryDate = $this->calculateDeliveryDate($data['scheduled_delivery_date'] ?? null, $vertical);

        return Order::create([
            'user_id' => $user->id,
            'user_address_id' => $address->id,
            'vertical' => $vertical,
            'type' => Order::TYPE_ONE_TIME,
            'status' => Order::STATUS_PENDING,
            'subtotal' => $cart->subtotal,
            'discount' => $cart->discount,
            'delivery_charge' => $deliveryCharge,
            'total' => $cart->subtotal - $cart->discount + $deliveryCharge,
            'payment_status' => Order::PAYMENT_PENDING,
            'coupon_code' => $cart->coupon_code,
            'coupon_id' => $cart->coupon_id,
            'delivery_instructions' => $data['delivery_instructions'] ?? null,
            'scheduled_delivery_date' => $deliveryDate,
            'scheduled_delivery_time' => $data['scheduled_delivery_time'] ?? null,
        ]);
    }

    /**
     * Create delivery for an order
     *
     * @param  array<string, mixed>  $data
     */
    protected function createDeliveryForOrder(Order $order, UserAddress $address, array $data = []): Delivery
    {
        $zone = $address->zone;

        return Delivery::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'user_address_id' => $address->id,
            'zone_id' => $zone->id,
            'status' => Delivery::STATUS_PENDING,
            'scheduled_date' => $order->scheduled_delivery_date ?? now()->addDay(),
            'scheduled_time' => $order->scheduled_delivery_time,
            'time_slot' => $data['time_slot'] ?? null,
            'delivery_instructions' => $order->delivery_instructions,
        ]);
    }

    /**
     * Create order from subscription
     */
    public function createOrderFromSubscription(
        Subscription $subscription,
        Carbon $deliveryDate
    ): Order {
        $user = $subscription->user;
        $address = $subscription->address;
        $zone = $address->zone;
        $items = $subscription->items()->active()->with('product')->get();

        $subtotal = $items->sum(fn ($item) => $item->price * $item->quantity);

        // Apply plan discount
        $discount = 0;
        $plan = $subscription->plan;
        if ($plan && $plan->discount_percent > 0) {
            $discount = $subtotal * ($plan->discount_percent / 100);
        }

        $deliveryCharge = $zone ? (float) ($zone->delivery_charge ?? 0) : 0;

        // Check for free delivery
        if ($zone && $zone->min_order_amount && $subtotal >= $zone->min_order_amount) {
            $deliveryCharge = 0;
        }

        $order = Order::create([
            'user_id' => $user->id,
            'user_address_id' => $address->id,
            'subscription_id' => $subscription->id,
            'vertical' => 'society_fresh',
            'type' => Order::TYPE_SUBSCRIPTION,
            'status' => Order::STATUS_CONFIRMED, // Auto-confirm subscription orders
            'subtotal' => $subtotal,
            'discount' => $discount,
            'delivery_charge' => $deliveryCharge,
            'total' => $subtotal - $discount + $deliveryCharge,
            'payment_status' => Order::PAYMENT_PENDING, // Will be processed later
            'delivery_instructions' => $subscription->notes,
            'scheduled_delivery_date' => $deliveryDate,
        ]);

        // Create order items from subscription items
        foreach ($items as $item) {
            $product = $item->product;
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'product_image' => $product->image,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'subtotal' => $item->price * $item->quantity,
            ]);
        }

        // Create delivery for subscription order
        Delivery::create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'user_address_id' => $address->id,
            'zone_id' => $zone->id,
            'status' => Delivery::STATUS_PENDING,
            'scheduled_date' => $deliveryDate,
            'delivery_instructions' => $subscription->notes,
        ]);

        return $order;
    }

    /**
     * Create order items from cart
     */
    protected function createOrderItems(Order $order, Cart $cart): void
    {
        $items = $cart->items()->with(['product', 'variant'])->get();

        foreach ($items as $cartItem) {
            OrderItem::createFromCartItem($order, $cartItem);
        }
    }

    /**
     * Calculate delivery charge
     */
    protected function calculateDeliveryCharge(Cart $cart, $zone): float
    {
        if (! $zone) {
            return 0;
        }

        $subtotal = $cart->subtotal - $cart->discount;

        // Free delivery above minimum order
        if ($zone->min_order_amount && $subtotal >= $zone->min_order_amount) {
            return 0;
        }

        return (float) ($zone->delivery_charge ?? 0);
    }

    /**
     * Calculate delivery date based on vertical
     */
    protected function calculateDeliveryDate(?string $requestedDate, string $vertical): Carbon
    {
        if ($requestedDate) {
            $date = Carbon::parse($requestedDate);
            if ($date->gt(Carbon::today())) {
                return $date;
            }
        }

        // Default: next day for daily_fresh, tomorrow or later for society_fresh
        return Carbon::tomorrow();
    }

    /**
     * Get available delivery dates
     *
     * @return array<string>
     */
    public function getAvailableDeliveryDates(string $vertical, int $days = 7): array
    {
        $dates = [];
        $start = Carbon::tomorrow();

        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i);

            // Skip certain days if needed (could check zone service days)
            $dates[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('D, M j'),
                'is_tomorrow' => $i === 0,
            ];
        }

        return $dates;
    }
}
