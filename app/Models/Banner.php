<?php

namespace App\Models;

use App\Enums\BusinessVertical;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    use HasFactory;

    public const TYPE_HOME = 'home';

    public const TYPE_CATEGORY = 'category';

    public const TYPE_PRODUCT = 'product';

    public const TYPE_PROMOTIONAL = 'promotional';

    public const VERTICAL_BOTH = 'both';

    public const LINK_PRODUCT = 'product';

    public const LINK_CATEGORY = 'category';

    public const LINK_COLLECTION = 'collection';

    public const LINK_EXTERNAL = 'external';

    public const LINK_NONE = 'none';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'type',
        'vertical',
        'title',
        'description',
        'image',
        'mobile_image',
        'link_url',
        'link_type',
        'link_id',
        'display_order',
        'is_active',
        'starts_at',
        'ends_at',
        'zones',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'zones' => 'array',
        ];
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrent($query)
    {
        $now = Carbon::now();

        return $query->active()
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', $now);
            });
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForVertical($query, string $vertical)
    {
        if ($vertical === 'all') {
            return $query;
        }

        return $query->where(function ($q) use ($vertical) {
            $q->where('vertical', $vertical)->orWhere('vertical', self::VERTICAL_BOTH);
        });
    }

    public function scopeByZone($query, ?int $zoneId)
    {
        if (! $zoneId) {
            return $query;
        }

        return $query->where(function ($q) use ($zoneId) {
            $q->whereNull('zones')
                ->orWhereJsonContains('zones', $zoneId);
        });
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    // Helper Methods

    public function isActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = Carbon::now();

        if ($this->starts_at && $this->starts_at->gt($now)) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->lt($now)) {
            return false;
        }

        return true;
    }

    public function isVisibleInZone(?int $zoneId): bool
    {
        if (! $this->zones || empty($this->zones)) {
            return true;
        }

        if (! $zoneId) {
            return true;
        }

        return in_array($zoneId, $this->zones);
    }

    public function getImageUrl(): string
    {
        return $this->image;
    }

    public function getMobileImageUrl(): string
    {
        return $this->mobile_image ?? $this->image;
    }

    public function getLink(): ?string
    {
        if ($this->link_type === self::LINK_NONE) {
            return null;
        }

        if ($this->link_type === self::LINK_EXTERNAL) {
            return $this->link_url;
        }

        return match ($this->link_type) {
            self::LINK_PRODUCT => "/products/{$this->link_id}",
            self::LINK_CATEGORY => "/categories/{$this->link_id}",
            self::LINK_COLLECTION => "/collections/{$this->link_id}",
            default => $this->link_url,
        };
    }

    /**
     * @return array<string, string>
     */
    public static function typeOptions(): array
    {
        return [
            self::TYPE_HOME => 'Home',
            self::TYPE_CATEGORY => 'Category',
            self::TYPE_PRODUCT => 'Product',
            self::TYPE_PROMOTIONAL => 'Promotional',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function linkTypeOptions(): array
    {
        return [
            self::LINK_NONE => 'No Link',
            self::LINK_PRODUCT => 'Product',
            self::LINK_CATEGORY => 'Category',
            self::LINK_COLLECTION => 'Collection',
            self::LINK_EXTERNAL => 'External URL',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function verticalOptions(bool $withBoth = true): array
    {
        if ($withBoth) {
            return array_merge([self::VERTICAL_BOTH => 'Both'], BusinessVertical::options());
        }

        return BusinessVertical::options();
    }
}
