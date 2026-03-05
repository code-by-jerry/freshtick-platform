<?php

namespace App\Services;

use App\Enums\BusinessVertical;
use App\Models\UserAddress;
use App\Models\Zone;
use App\Models\ZoneOverride;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class LocationService
{
    private const CACHE_TTL_SECONDS = 3600;

    private const CACHE_KEY_VERSION = 'location:zones:cache-version';

    private const CACHE_KEY_ZONE_PINCODE = 'location:v%s:zone:pincode:%s';

    private const CACHE_KEY_ZONE_COORDS = 'location:v%s:zone:coords:%s';

    private const CACHE_KEY_SERVICEABLE_ZONES = 'location:v%s:zones:serviceable';

    /**
     * Validate address against zones; return zone if serviceable, null otherwise.
     * Checks zone overrides first when user_id or address (with id) is provided.
     *
     * @param  UserAddress|array{pincode?: string|null, latitude?: float|null, longitude?: float|null}  $address
     */
    public function validateAddress(UserAddress|array $address, ?int $userId = null): ?Zone
    {
        $addressId = $address instanceof UserAddress ? $address->id : null;
        $overrideZone = $this->resolveOverrideZone($userId, $addressId);
        if ($overrideZone !== null) {
            return $overrideZone;
        }

        $pincode = $address instanceof UserAddress
            ? trim((string) $address->pincode)
            : trim((string) ($address['pincode'] ?? ''));
        $lat = $address instanceof UserAddress
            ? ($address->latitude ? (float) $address->latitude : null)
            : (isset($address['latitude']) ? (float) $address['latitude'] : null);
        $lng = $address instanceof UserAddress
            ? ($address->longitude ? (float) $address->longitude : null)
            : (isset($address['longitude']) ? (float) $address['longitude'] : null);

        $zone = null;

        if ($lat !== null && $lng !== null) {
            $zone = $this->findZoneByCoordinates($lat, $lng);
        }

        if ($zone === null && $pincode !== '') {
            $zone = $this->findZoneByPincode($pincode);

            if ($zone !== null && $lat !== null && $lng !== null && $zone->hasBoundary() && ! $zone->isWithinBoundary($lat, $lng)) {
                return null;
            }
        }

        if ($zone === null) {
            return null;
        }

        if (! $zone->isServiceableOnDay(now()->dayOfWeek)) {
            return null;
        }

        if (! $zone->isServiceableAtTime()) {
            return null;
        }

        return $zone;
    }

    public function invalidateZoneCache(): void
    {
        $currentVersion = (int) Cache::get(self::CACHE_KEY_VERSION, 1);
        Cache::forever(self::CACHE_KEY_VERSION, $currentVersion + 1);
    }

    private function cacheVersion(): int
    {
        return (int) Cache::get(self::CACHE_KEY_VERSION, 1);
    }

    /**
     * Resolve zone from active overrides for user or address. Returns null if none.
     */
    public function resolveOverrideZone(?int $userId, ?int $addressId): ?Zone
    {
        if ($userId === null && $addressId === null) {
            return null;
        }

        $override = ZoneOverride::query()
            ->active()
            ->notExpired()
            ->when($addressId !== null, fn ($q) => $q->where('address_id', $addressId))
            ->when($addressId === null && $userId !== null, fn ($q) => $q->where('user_id', $userId))
            ->with('zone')
            ->orderByRaw('address_id IS NOT NULL DESC')
            ->first();

        if ($override === null || ! $override->zone) {
            return null;
        }

        return $override->zone->is_active ? $override->zone : null;
    }

    public function findZoneByPincode(string $pincode): ?Zone
    {
        $normalized = preg_replace('/\s+/', '', $pincode);
        if ($normalized === '') {
            return null;
        }

        $key = sprintf(self::CACHE_KEY_ZONE_PINCODE, $this->cacheVersion(), $normalized);

        return Cache::remember($key, self::CACHE_TTL_SECONDS, function () use ($normalized) {
            return Zone::query()
                ->active()
                ->get()
                ->first(fn (Zone $zone) => $zone->isServiceable($normalized));
        });
    }

    public function findZoneByCoordinates(float $lat, float $lng): ?Zone
    {
        $key = sprintf(self::CACHE_KEY_ZONE_COORDS, $this->cacheVersion(), number_format($lat, 5).'_'.number_format($lng, 5));

        return Cache::remember($key, self::CACHE_TTL_SECONDS, function () use ($lat, $lng) {
            return Zone::query()
                ->active()
                ->get()
                ->first(fn (Zone $zone) => $zone->isWithinBoundary($lat, $lng));
        });
    }

    /**
     * @param  UserAddress|array{pincode?: string|null, latitude?: float|null, longitude?: float|null}  $address
     */
    public function isAddressServiceable(UserAddress|array $address): bool
    {
        return $this->validateAddress($address) !== null;
    }

    /**
     * @return Collection<int, Zone>
     */
    public function getServiceableZones(): Collection
    {
        $key = sprintf(self::CACHE_KEY_SERVICEABLE_ZONES, $this->cacheVersion());

        return Cache::remember($key, self::CACHE_TTL_SECONDS, function () {
            return Zone::query()->active()->orderBy('name')->get();
        });
    }

    /**
     * Return verticals supported by this zone. Empty array = both (backward compat).
     *
     * @return array<int, string>
     */
    public function getVerticalsForZone(Zone $zone): array
    {
        $v = $zone->verticals;
        if ($v === null || ! is_array($v) || count($v) === 0) {
            return BusinessVertical::values();
        }

        return array_values(array_intersect($v, BusinessVertical::values()));
    }

    /**
     * Return verticals available at the given address (from zone). Empty = none serviceable.
     *
     * @param  UserAddress|array{pincode?: string|null, latitude?: float|null, longitude?: float|null}  $address
     * @return array<int, string>
     */
    public function getVerticalsForAddress(UserAddress|array $address, ?int $userId = null): array
    {
        $zone = $this->validateAddress($address, $userId);
        if ($zone === null) {
            return [];
        }

        return $this->getVerticalsForZone($zone);
    }
}
