<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'cart_id',
        'product_id',
        'variant_id',
        'quantity',
        'price',
        'subtotal',
        'vertical',
        'is_subscription',
        'subscription_plan_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'variant_id' => 'integer',
            'price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'is_subscription' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (CartItem $item) {
            $item->subtotal = $item->price * $item->quantity;
        });

        static::saved(function (CartItem $item) {
            $item->cart->calculateTotals();
        });

        static::deleted(function (CartItem $item) {
            $item->cart->calculateTotals();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────

    /**
     * @return BelongsTo<Cart, $this>
     */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * @return BelongsTo<SubscriptionPlan, $this>
     */
    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────

    /**
     * Update quantity and recalculate
     */
    public function updateQuantity(int $quantity): self
    {
        $this->quantity = max(1, $quantity);
        $this->save();

        return $this;
    }

    /**
     * Get calculated subtotal
     */
    public function getSubtotal(): float
    {
        return (float) $this->price * $this->quantity;
    }
}
