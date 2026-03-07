<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Collection extends Model
{
    use HasFactory;

    public const VERTICAL_BOTH = 'both';

    public const PRODUCT_SELECTION_MANUAL = 'manual';

    public const PRODUCT_SELECTION_RANDOM = 'random';

    public const PRODUCT_SELECTION_CATEGORY = 'category';

    public const CATEGORY_SELECTION_ALL = 'all';

    public const CATEGORY_SELECTION_SELECTED = 'selected';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category_id',
        'product_selection_mode',
        'category_selection_mode',
        'category_ids',
        'product_ids',
        'random_products_limit',
        'banner_image',
        'banner_mobile_image',
        'display_order',
        'is_active',
        'vertical',
        'starts_at',
        'ends_at',
        'link_url',
        'meta_title',
        'meta_description',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'display_order' => 'integer',
            'random_products_limit' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'category_ids' => 'array',
            'product_ids' => 'array',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function configuredProductsQuery(string $vertical = 'all'): Builder
    {
        $query = Product::query()->active()->inStock();

        if ($vertical !== 'all') {
            $query->forVertical($vertical);
        }

        $categoryMode = $this->category_selection_mode ?? self::CATEGORY_SELECTION_ALL;
        $categoryIds = array_values(array_filter(array_map('intval', $this->category_ids ?? [])));

        if ($categoryMode === self::CATEGORY_SELECTION_SELECTED) {
            if ($categoryIds !== []) {
                $query->whereIn('category_id', $categoryIds);
            } elseif ($this->category_id !== null) {
                $query->where('category_id', $this->category_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $productMode = $this->product_selection_mode ?? self::PRODUCT_SELECTION_CATEGORY;
        if ($productMode === self::PRODUCT_SELECTION_MANUAL) {
            $productIds = array_values(array_filter(array_map('intval', $this->product_ids ?? [])));
            if ($productIds === []) {
                return $query->whereRaw('1 = 0');
            }

            $query->whereIn('id', $productIds);
        } elseif ($productMode === self::PRODUCT_SELECTION_RANDOM) {
            $query->inRandomOrder()->limit(max(1, (int) $this->random_products_limit));
        } elseif ($productMode !== self::PRODUCT_SELECTION_CATEGORY) {
            // Legacy fallback for historical collections.
            $query->where('collection_id', $this->id);
        }

        if ($productMode !== self::PRODUCT_SELECTION_RANDOM) {
            $query->ordered();
        }

        return $query;
    }

    public function configuredProductsCount(string $vertical = 'all'): int
    {
        return $this->configuredProductsQuery($vertical)->count();
    }

    /**
     * @return array<string, string>
     */
    public static function productSelectionOptions(): array
    {
        return [
            self::PRODUCT_SELECTION_CATEGORY => 'Category wise',
            self::PRODUCT_SELECTION_MANUAL => 'Manual products',
            self::PRODUCT_SELECTION_RANDOM => 'Random products',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function categorySelectionOptions(): array
    {
        return [
            self::CATEGORY_SELECTION_ALL => 'All categories',
            self::CATEGORY_SELECTION_SELECTED => 'Selected categories',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrent(Builder $query): Builder
    {
        $now = now();

        return $query->where(function (Builder $q) use ($now) {
            $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
        })->where(function (Builder $q) use ($now) {
            $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
        });
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('display_order')->orderBy('name');
    }

    public function scopeForVertical(Builder $query, string $vertical): Builder
    {
        if ($vertical === 'all') {
            return $query;
        }

        return $query->where(function (Builder $q) use ($vertical) {
            $q->where('vertical', $vertical)->orWhere('vertical', self::VERTICAL_BOTH);
        });
    }

    public function isActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return false;
        }
        if ($this->ends_at !== null && $this->ends_at->isPast()) {
            return false;
        }

        return true;
    }

    public static function booted(): void
    {
        static::creating(function (Collection $collection) {
            if (empty($collection->slug)) {
                $collection->slug = Str::slug($collection->name);
            }
        });
    }
}
