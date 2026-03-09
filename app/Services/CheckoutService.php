<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserAddress;
use Carbon\Carbon;
use Carbon\CarbonInterface;
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
     * @return array{success: bool, order?: Order, payment?: Payment|null, gateway_data?: array<string, mixed>|null, error?: string}
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
                    'gateway_data' => $paymentResult['gateway_data'] ?? null,
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
     * Add current cart items to the next available delivery order.
     *
     * @param  array<string, mixed>  $data
     * @return array{success: bool, order?: Order, merged?: bool, scheduled_delivery_date?: string, error?: string}
     */
    public function addCartToNextDelivery(
        Cart $cart,
        User $user,
        UserAddress $address,
        array $data = []
    ): array {
        $validation = $this->validateCheckout($cart, $user, $address);
        if (! $validation['valid']) {
            return [
                'success' => false,
                'error' => implode(' ', $validation['errors']),
            ];
        }

        try {
            return DB::transaction(function () use ($cart, $user, $address, $data) {
                $deliveryDate = $this->getEarliestDeliveryDate();

                $existingOrder = Order::query()
                    ->where('user_id', $user->id)
                    ->where('user_address_id', $address->id)
                    ->where('type', Order::TYPE_ONE_TIME)
                    ->whereDate('scheduled_delivery_date', $deliveryDate->toDateString())
                    ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_CONFIRMED, Order::STATUS_PROCESSING])
                    ->with('items')
                    ->first();

                if ($existingOrder) {
                    $this->mergeCartItemsIntoOrder($existingOrder, $cart);

                    if (! empty($data['delivery_instructions']) && empty($existingOrder->delivery_instructions)) {
                        $existingOrder->delivery_instructions = (string) $data['delivery_instructions'];
                    }

                    $existingOrder->save();

                    if (! $existingOrder->delivery()->exists()) {
                        $this->createDeliveryForOrder($existingOrder, $address, $data);
                    }

                    $cart->clear();

                    return [
                        'success' => true,
                        'order' => $existingOrder->fresh(['items']),
                        'merged' => true,
                        'scheduled_delivery_date' => $deliveryDate->toDateString(),
                    ];
                }

                $orderPayload = array_merge($data, [
                    'scheduled_delivery_date' => $deliveryDate->toDateString(),
                    'payment_method' => Payment::METHOD_WALLET,
                ]);

                $order = $this->createOrderFromCart($cart, $user, $address, $orderPayload);
                $this->createOrderItems($order, $cart);
                $this->createDeliveryForOrder($order, $address, $orderPayload);

                $cart->clear();

                return [
                    'success' => true,
                    'order' => $order->fresh(['items']),
                    'merged' => false,
                    'scheduled_delivery_date' => $deliveryDate->toDateString(),
                ];
            });
        } catch (\Throwable $exception) {
            Log::error('Add to next delivery failed', [
                'user_id' => $user->id,
                'cart_id' => $cart->id,
                'error' => $exception->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Unable to add items to next delivery. Please try again.',
            ];
        }
    }

    /**
     * Process payment for order
     *
     * @return array{success: bool, payment?: Payment, gateway_data?: array<string, mixed>, error?: string}
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

            $result = $this->paymentService->processWalletPayment($user, $order, $total);

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
        $order->update([
            'payment_method' => $paymentMethod,
            'status' => Order::STATUS_PENDING,
        ]);

        $gatewayResult = $this->paymentService->initiateGatewayPayment($order, 'razorpay');

        if (! $gatewayResult['success']) {
            return [
                'success' => false,
                'error' => $gatewayResult['error'] ?? 'Failed to initiate online payment.',
            ];
        }

        return [
            'success' => true,
            'payment' => $gatewayResult['payment'],
            'gateway_data' => $gatewayResult['gateway_data'] ?? [],
        ];
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
        if ($plan) {
            if ($plan->discount_type === SubscriptionPlan::DISCOUNT_PERCENTAGE && (float) $plan->discount_value > 0) {
                $discount = $subtotal * (((float) $plan->discount_value) / 100);
            }

            if ($plan->discount_type === SubscriptionPlan::DISCOUNT_FLAT && (float) $plan->discount_value > 0) {
                $discount = min($subtotal, (float) $plan->discount_value);
            }
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
            'payment_method' => Payment::METHOD_WALLET,
            'payment_attempts' => 0,
            'next_payment_retry_at' => null,
            'payment_failed_at' => null,
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
    protected function calculateDeliveryDate(?string $requestedDate, string $vertical): CarbonInterface
    {
        if ($requestedDate) {
            $date = Carbon::parse($requestedDate);
            if ($date->gte($this->getEarliestDeliveryDate())) {
                return $date;
            }
        }

        return $this->getEarliestDeliveryDate();
    }

    /**
     * Get available delivery dates
     *
     * @return array<string>
     */
    public function getAvailableDeliveryDates(string $vertical, int $days = 7): array
    {
        $dates = [];
        $start = $this->getEarliestDeliveryDate();

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

    public function getEarliestDeliveryDate(?CarbonInterface $asOf = null): CarbonInterface
    {
        $reference = $asOf ? Carbon::instance($asOf) : now();
        $cutoffTime = (string) config('business.next_day_cutoff_time', '22:30');
        $cutoffAt = Carbon::parse($reference->toDateString().' '.$cutoffTime, $reference->getTimezone());

        if ($reference->lessThanOrEqualTo($cutoffAt)) {
            return $reference->copy()->addDay()->startOfDay();
        }

        return $reference->copy()->addDays(2)->startOfDay();
    }

    private function mergeCartItemsIntoOrder(Order $order, Cart $cart): void
    {
        $cartItems = $cart->items()->with(['product', 'variant'])->get();

        foreach ($cartItems as $cartItem) {
            $variantLabel = $cartItem->variant?->name;
            $productName = $variantLabel
                ? "{$cartItem->product->name} ({$variantLabel})"
                : $cartItem->product->name;

            $matchingItem = $order->items
                ->first(fn (OrderItem $item) => (int) $item->product_id === (int) $cartItem->product_id
                    && (string) $item->product_name === (string) $productName
                    && abs((float) $item->price - (float) $cartItem->price) < 0.01
                );

            if ($matchingItem) {
                $matchingItem->quantity += (int) $cartItem->quantity;
                $matchingItem->subtotal = (float) $matchingItem->price * (int) $matchingItem->quantity;
                $matchingItem->save();

                continue;
            }

            OrderItem::createFromCartItem($order, $cartItem);
        }

        $order->refresh()->load('items');

        $orderSubtotal = (float) $order->items->sum(fn (OrderItem $item) => (float) $item->subtotal);
        $cartDiscount = (float) $cart->discount;
        $newDiscount = (float) $order->discount + $cartDiscount;

        $order->update([
            'subtotal' => $orderSubtotal,
            'discount' => $newDiscount,
            'total' => $orderSubtotal - $newDiscount + (float) $order->delivery_charge,
            'coupon_code' => $order->coupon_code ?: $cart->coupon_code,
            'coupon_id' => $order->coupon_id ?: $cart->coupon_id,
        ]);
    }
}
