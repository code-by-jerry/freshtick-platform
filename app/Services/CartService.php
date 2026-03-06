<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\Zone;

class CartService
{
    /**
     * Get or create cart for user or session
     */
    public function getOrCreateCart(?User $user, ?string $sessionId = null): Cart
    {
        if ($user) {
            $cart = Cart::notExpired()
                ->forUser($user->id)
                ->first();

            if ($cart) {
                return $cart;
            }

            // Check for session cart to merge
            if ($sessionId) {
                $sessionCart = Cart::notExpired()
                    ->forSession($sessionId)
                    ->first();

                if ($sessionCart) {
                    // Migrate session cart to user
                    $sessionCart->user_id = $user->id;
                    $sessionCart->session_id = null;
                    $sessionCart->save();

                    return $sessionCart;
                }
            }

            return Cart::create([
                'user_id' => $user->id,
                'expires_at' => now()->addDays(7),
            ]);
        }

        if ($sessionId) {
            return Cart::notExpired()
                ->forSession($sessionId)
                ->firstOrCreate(
                    ['session_id' => $sessionId],
                    ['expires_at' => now()->addDays(7)]
                );
        }

        return Cart::create(['expires_at' => now()->addDays(7)]);
    }

    /**
     * Add product to cart
     */
    public function addProduct(
        Cart $cart,
        Product $product,
        int $quantity = 1,
        ?Zone $zone = null,
        bool $isSubscription = false,
        ?SubscriptionPlan $plan = null,
        ?ProductVariant $variant = null
    ): CartItem {
        // Variant price overrides product/zone price when selected.
        $price = $variant ? (float) $variant->price : ($zone ? $product->getPriceForZone($zone) : $product->price);

        // Determine vertical
        $vertical = $product->vertical ?? 'daily_fresh';
        if ($vertical === 'both') {
            $vertical = $isSubscription ? 'society_fresh' : 'daily_fresh';
        }

        // Check for existing item
        $existingItemQuery = $cart->items()
            ->where('product_id', $product->id)
            ->where('is_subscription', $isSubscription);

        if ($variant) {
            $existingItemQuery->where('variant_id', $variant->id);
        } else {
            $existingItemQuery->whereNull('variant_id');
        }

        $existingItem = $existingItemQuery->first();

        if ($existingItem) {
            $existingItem->quantity += $quantity;
            $existingItem->price = $price;
            $existingItem->save();

            return $existingItem;
        }

        return CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'variant_id' => $variant?->id,
            'quantity' => $quantity,
            'price' => $price,
            'subtotal' => $price * $quantity,
            'vertical' => $vertical,
            'is_subscription' => $isSubscription,
            'subscription_plan_id' => $plan ? $plan->id : null,
        ]);
    }

    /**
     * Update cart item quantity
     */
    public function updateItem(CartItem $cartItem, int $quantity): CartItem
    {
        if ($quantity <= 0) {
            $this->removeItem($cartItem);

            return $cartItem;
        }

        $cartItem->updateQuantity($quantity);

        return $cartItem;
    }

    /**
     * Remove item from cart
     */
    public function removeItem(CartItem $cartItem): bool
    {
        return $cartItem->delete();
    }

    /**
     * Calculate delivery charge based on zone and order value
     */
    public function calculateDeliveryCharge(Cart $cart, ?Zone $zone): float
    {
        if (! $zone) {
            return 0;
        }

        $subtotal = $cart->subtotal;

        // Check if minimum order amount is met for free delivery
        if ($zone->min_order_amount && $subtotal >= $zone->min_order_amount) {
            return 0;
        }

        return (float) ($zone->delivery_charge ?? 0);
    }

    /**
     * Validate cart before checkout
     *
     * @return array{valid: bool, errors: array<string>}
     */
    public function validateCart(Cart $cart, ?Zone $zone = null): array
    {
        $errors = [];

        if ($cart->isEmpty()) {
            $errors[] = 'Your cart is empty.';

            return ['valid' => false, 'errors' => $errors];
        }

        $items = $cart->items()->with('product')->get();

        foreach ($items as $item) {
            $product = $item->product;

            if (! $product || ! $product->is_active) {
                $productName = $product?->name ?? 'Unknown';
                $errors[] = "Product '{$productName}' is no longer available.";

                continue;
            }

            if ($product->stock_quantity !== null && $item->quantity > $product->stock_quantity) {
                $errors[] = "Not enough stock for '{$product->name}'. Available: {$product->stock_quantity}";
            }

            if ($zone && ! $product->isAvailableInZone($zone)) {
                $errors[] = "'{$product->name}' is not available in your delivery zone.";
            }

            // Check min/max quantity
            if ($product->min_quantity && $item->quantity < $product->min_quantity) {
                $errors[] = "Minimum quantity for '{$product->name}' is {$product->min_quantity}.";
            }

            if ($product->max_quantity && $item->quantity > $product->max_quantity) {
                $errors[] = "Maximum quantity for '{$product->name}' is {$product->max_quantity}.";
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Check product availability for all items
     *
     * @return array{available: bool, unavailable_items: array<string>}
     */
    public function checkProductAvailability(Cart $cart, ?Zone $zone = null): array
    {
        $unavailable = [];
        $items = $cart->items()->with('product')->get();

        foreach ($items as $item) {
            $product = $item->product;

            if (! $product || ! $product->is_active) {
                $unavailable[] = $product?->name ?? 'Unknown product';

                continue;
            }

            if ($zone && ! $product->isAvailableInZone($zone)) {
                $unavailable[] = $product->name;
            }
        }

        return [
            'available' => empty($unavailable),
            'unavailable_items' => $unavailable,
        ];
    }

    /**
     * Apply delivery charge to cart
     */
    public function applyDeliveryCharge(Cart $cart, float $charge): Cart
    {
        $cart->delivery_charge = $charge;
        $cart->total = $cart->subtotal - $cart->discount + $charge;
        $cart->save();

        return $cart;
    }

    /**
     * Get cart summary
     *
     * @return array{
     *     items_count: int,
     *     subtotal: float,
     *     discount: float,
     *     delivery_charge: float,
     *     total: float,
     *     has_subscription_items: bool,
     *     verticals: array<string>
     * }
     */
    public function getCartSummary(Cart $cart): array
    {
        $items = $cart->items()->with('product')->get();

        return [
            'items_count' => $items->sum('quantity'),
            'unique_items' => $items->count(),
            'subtotal' => (float) $cart->subtotal,
            'discount' => (float) $cart->discount,
            'delivery_charge' => (float) $cart->delivery_charge,
            'total' => (float) $cart->total,
            'has_subscription_items' => $items->where('is_subscription', true)->isNotEmpty(),
            'verticals' => $cart->getVerticals(),
        ];
    }
}
