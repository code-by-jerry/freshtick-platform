<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'product_sku',
        'product_image',
        'quantity',
        'price',
        'subtotal',
        'is_free_sample',
        'free_sample_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'is_free_sample' => 'boolean',
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<FreeSample, $this>
     */
    public function freeSample(): BelongsTo
    {
        return $this->belongsTo(FreeSample::class);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────

    /**
     * Create from cart item
     */
    public static function createFromCartItem(Order $order, CartItem $cartItem): self
    {
        $product = $cartItem->product;
        $variantLabel = $cartItem->variant?->name;
        $productName = $variantLabel ? "{$product->name} ({$variantLabel})" : $product->name;

        return self::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $productName,
            'product_sku' => $product->sku,
            'product_image' => $product->image,
            'quantity' => $cartItem->quantity,
            'price' => $cartItem->price,
            'subtotal' => $cartItem->subtotal,
        ]);
    }

    /**
     * Get line total
     */
    public function getLineTotal(): float
    {
        return (float) $this->price * $this->quantity;
    }
}
