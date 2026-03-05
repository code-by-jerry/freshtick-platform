<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckServiceabilityRequest;
use App\Http\Requests\SetLocationRequest;
use App\Models\UserAddress;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ZoneController extends Controller
{
    public function __construct(
        private LocationService $locationService
    ) {}

    public function index(): Response|RedirectResponse
    {
        if (! Auth::check()) {
            return redirect()->route('login');
        }

        $zones = $this->locationService->getServiceableZones()->map(function ($zone) {
            return [
                'id' => $zone->id,
                'name' => $zone->name,
                'code' => $zone->code,
                'city' => $zone->city,
                'state' => $zone->state,
                'delivery_charge' => $zone->delivery_charge,
                'min_order_amount' => $zone->min_order_amount,
            ];
        });

        return Inertia::render('location/select', [
            'zones' => $zones,
        ]);
    }

    public function checkServiceability(CheckServiceabilityRequest $request): JsonResponse
    {
        $pincode = trim((string) ($request->validated('pincode') ?? ''));
        $lat = $request->validated('latitude');
        $lng = $request->validated('longitude');

        $zone = $this->locationService->validateAddress([
            'pincode' => $pincode,
            'latitude' => $lat !== null ? (float) $lat : null,
            'longitude' => $lng !== null ? (float) $lng : null,
        ], Auth::id());

        return response()->json([
            'serviceable' => $zone !== null,
            'zone' => $zone?->only(['id', 'name', 'code', 'city', 'state', 'delivery_charge', 'min_order_amount']),
            'verticals' => $zone !== null ? $this->locationService->getVerticalsForZone($zone) : [],
        ]);
    }

    public function getZoneByPincode(string $pincode): JsonResponse
    {
        $zone = $this->locationService->findZoneByPincode($pincode);

        return response()->json([
            'zone' => $zone?->only(['id', 'name', 'code', 'city', 'state', 'delivery_charge', 'min_order_amount']),
        ]);
    }

    public function setLocation(SetLocationRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $resolvedPincode = trim((string) ($data['pincode'] ?? ''));

        $zone = $this->locationService->validateAddress([
            'pincode' => $resolvedPincode,
            'latitude' => (float) $data['latitude'],
            'longitude' => (float) $data['longitude'],
        ], $user?->id);

        if ($zone === null) {
            return back()->withErrors([
                'location' => 'Selected location is outside our delivery zones.',
            ]);
        }

        if ($resolvedPincode === '') {
            $zonePincodes = is_array($zone->pincodes) ? $zone->pincodes : [];
            $resolvedPincode = trim((string) ($zonePincodes[0] ?? ''));
        }

        if ($user) {
            $user->addresses()->update(['is_default' => false]);

            $defaultAddress = $user->addresses()
                ->active()
                ->latest('id')
                ->first();

            $addressData = [
                'type' => $data['type'] ?? UserAddress::TYPE_HOME,
                'label' => $data['label'] ?? 'Selected location',
                'address_line_1' => $data['address_line_1'],
                'address_line_2' => $data['address_line_2'] ?? null,
                'landmark' => $data['landmark'] ?? null,
                'city' => $data['city'],
                'state' => $data['state'],
                'pincode' => $resolvedPincode,
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'zone_id' => $zone->id,
                'is_default' => true,
                'is_active' => true,
            ];

            if ($defaultAddress !== null) {
                $defaultAddress->update($addressData);
            } else {
                $user->addresses()->create($addressData);
            }
        } else {
            // Guest user logic: store in session
            session([
                'guest_zone_id' => $zone->id,
                'guest_address' => [
                    'address_line_1' => $data['address_line_1'],
                    'city' => $data['city'],
                    'state' => $data['state'],
                    'pincode' => $resolvedPincode,
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                ],
            ]);
        }

        if ((bool) ($data['from_navbar'] ?? false)) {
            return back()->with('message', 'Delivery location updated.');
        }

        return redirect()->route('catalog.home')->with('message', 'Delivery location updated.');
    }
}
