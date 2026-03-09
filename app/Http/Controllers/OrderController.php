<?php

namespace App\Http\Controllers;

use App\Http\Requests\CancelOrderRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\OrderStatusService;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private CheckoutService $checkoutService,
        private OrderStatusService $orderStatusService,
        private WalletService $walletService,
        private PaymentService $paymentService
    ) {}

    /**
     * List user's orders
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $status = $request->string('status')->toString();

        $query = Order::query()
            ->forUser($user->id)
            ->with(['address', 'items.product'])
            ->orderByDesc('created_at');

        if ($status && $status !== 'all') {
            $query->byStatus($status);
        }

        $orders = $query->paginate(10);

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'statusOptions' => Order::statusOptions(),
            'currentStatus' => $status ?: 'all',
        ]);
    }

    /**
     * Show order details
     */
    public function show(Request $request, Order $order): Response|RedirectResponse
    {
        $user = $request->user();

        if ($order->user_id !== $user->id) {
            return redirect()->route('orders.index')
                ->with('error', 'Order not found.');
        }

        $order->load(['address.zone', 'items.product', 'subscription', 'driver']);

        $timeline = $this->orderStatusService->getOrderTimeline($order);

        return Inertia::render('orders/show', [
            'order' => $order,
            'timeline' => $timeline,
            'canCancel' => $order->canCancel(),
            'statusOptions' => Order::statusOptions(),
        ]);
    }

    /**
     * Show checkout page
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $sessionId = $request->session()->getId();

        $cart = $this->cartService->getOrCreateCart($user, $sessionId);
        $cart->load(['items.product', 'items.variant', 'items.subscriptionPlan']);

        if ($cart->isEmpty()) {
            return redirect()->route('cart.show')
                ->with('error', 'Your cart is empty.');
        }

        $addresses = $user->addresses()->active()->with('zone')->get();
        $defaultAddress = $addresses->firstWhere('is_default', true) ?? $addresses->first();

        // Calculate delivery charge based on default address
        $zone = $defaultAddress?->zone;
        $deliveryCharge = $zone ? $this->cartService->calculateDeliveryCharge($cart, $zone) : 0;

        $summary = $this->cartService->getCartSummary($cart);
        $deliveryDates = $this->checkoutService->getAvailableDeliveryDates(
            $summary['verticals'][0] ?? 'daily_fresh'
        );

        // Get wallet balance
        $wallet = $this->walletService->getOrCreateWallet($user);

        return Inertia::render('checkout/index', [
            'cart' => $cart,
            'items' => $cart->items,
            'summary' => $summary,
            'addresses' => $addresses,
            'defaultAddressId' => $defaultAddress?->id,
            'deliveryCharge' => $deliveryCharge,
            'deliveryDates' => $deliveryDates,
            'walletBalance' => (float) $wallet->balance,
        ]);
    }

    /**
     * Process checkout and create order
     */
    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $user = $request->user();
        $sessionId = $request->session()->getId();
        $validated = $request->validated();

        $cart = $this->cartService->getOrCreateCart($user, $sessionId);

        if ($cart->isEmpty()) {
            return redirect()->route('cart.show')
                ->with('error', 'Your cart is empty.');
        }

        $address = $user->addresses()->findOrFail($validated['user_address_id']);

        $result = $this->checkoutService->processCheckout($cart, $user, $address, $validated);

        if (! $result['success']) {
            return back()->withErrors(['checkout' => $result['error']]);
        }

        return redirect()->route('orders.show', $result['order'])
            ->with('success', 'Order placed successfully! Order #'.$result['order']->order_number);
    }

    /**
     * Initiate an online checkout and return gateway checkout payload.
     */
    public function initiatePayment(StoreOrderRequest $request): JsonResponse
    {
        $user = $request->user();
        $sessionId = $request->session()->getId();
        $validated = $request->validated();

        $cart = $this->cartService->getOrCreateCart($user, $sessionId);

        if ($cart->isEmpty()) {
            return response()->json(['success' => false, 'error' => 'Your cart is empty.'], 422);
        }

        $paymentMethod = (string) ($validated['payment_method'] ?? 'upi');

        if (! in_array($paymentMethod, ['upi', 'gateway'], true)) {
            return response()->json(['success' => false, 'error' => 'Online payment method is required.'], 422);
        }

        $address = $user->addresses()->findOrFail($validated['user_address_id']);
        $result = $this->checkoutService->processCheckout($cart, $user, $address, $validated);

        if (! $result['success'] || ! isset($result['order'])) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Unable to initiate checkout.',
            ], 422);
        }

        $payment = $result['payment'] ?? null;

        if (! $payment || ! isset($result['gateway_data'])) {
            return response()->json([
                'success' => false,
                'error' => 'Online payment initialization failed.',
            ], 422);
        }

        $request->session()->put('checkout_payment_pending', [
            'order_id' => $result['order']->id,
            'payment_id' => $payment->id,
        ]);

        return response()->json([
            'success' => true,
            'order_id' => $result['order']->id,
            'order_number' => $result['order']->order_number,
            'gateway' => 'razorpay',
            'gateway_data' => $result['gateway_data'],
        ]);
    }

    /**
     * Verify online payment signature and finalize order payment status.
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        $pending = $request->session()->get('checkout_payment_pending');

        if (! is_array($pending) || ! isset($pending['payment_id'], $pending['order_id'])) {
            return response()->json(['success' => false, 'error' => 'Checkout payment session expired.'], 422);
        }

        $order = Order::query()->where('id', $pending['order_id'])->where('user_id', $request->user()->id)->first();

        if (! $order) {
            return response()->json(['success' => false, 'error' => 'Order not found.'], 404);
        }

        $payment = $order->payments()->where('id', $pending['payment_id'])->first();

        if (! $payment) {
            return response()->json(['success' => false, 'error' => 'Payment not found.'], 404);
        }

        $verifyResult = $this->paymentService->verifyRazorpayPayment(
            $payment,
            $validated['razorpay_order_id'],
            $validated['razorpay_payment_id'],
            $validated['razorpay_signature']
        );

        if (! $verifyResult['success']) {
            return response()->json([
                'success' => false,
                'error' => $verifyResult['error'] ?? 'Payment verification failed.',
            ], 422);
        }

        $request->session()->forget('checkout_payment_pending');

        return response()->json([
            'success' => true,
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'redirect_url' => route('orders.show', $order),
        ]);
    }

    /**
     * Cancel order
     */
    public function cancel(CancelOrderRequest $request, Order $order): RedirectResponse
    {
        $user = $request->user();

        if ($order->user_id !== $user->id) {
            return redirect()->route('orders.index')
                ->with('error', 'Order not found.');
        }

        if (! $order->canCancel()) {
            return back()->with('error', 'This order cannot be cancelled.');
        }

        $result = $this->orderStatusService->cancelOrder(
            $order,
            $request->validated('reason')
        );

        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return redirect()->route('orders.index')
            ->with('success', 'Order cancelled successfully.');
    }

    /**
     * Track order status (API)
     */
    public function track(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();

        if ($order->user_id !== $user->id) {
            return response()->json(['error' => 'Order not found.'], 404);
        }

        $order->load(['address', 'driver']);

        return response()->json([
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'scheduled_delivery_date' => $order->scheduled_delivery_date,
                'delivered_at' => $order->delivered_at,
            ],
            'timeline' => $this->orderStatusService->getOrderTimeline($order),
            'driver' => $order->driver ? [
                'name' => $order->driver->user->name ?? 'Driver',
                'phone' => $order->driver->user->phone ?? null,
            ] : null,
        ]);
    }

    /**
     * Reorder - add items back to cart
     */
    public function reorder(Request $request, Order $order): RedirectResponse
    {
        $user = $request->user();
        $sessionId = $request->session()->getId();

        if ($order->user_id !== $user->id) {
            return redirect()->route('orders.index')
                ->with('error', 'Order not found.');
        }

        $cart = $this->cartService->getOrCreateCart($user, $sessionId);

        // Get user's zone
        $defaultAddress = $user->addresses()->active()->where('is_default', true)->first();
        $zone = $defaultAddress?->zone;

        $addedCount = 0;
        foreach ($order->items as $item) {
            $product = $item->product;
            if ($product && $product->is_active) {
                $this->cartService->addProduct($cart, $product, $item->quantity, $zone);
                $addedCount++;
            }
        }

        return redirect()->route('cart.show')
            ->with('success', "{$addedCount} items added to cart.");
    }
}
