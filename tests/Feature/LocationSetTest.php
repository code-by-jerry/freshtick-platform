<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserAddress;
use App\Models\Zone;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LocationSetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public function test_authenticated_user_can_set_location_and_create_default_address(): void
    {
        $user = User::factory()->create();
        $zone = Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682001'],
        ]);

        $response = $this->actingAs($user)->post(route('location.set'), [
            'type' => UserAddress::TYPE_HOME,
            'label' => 'Selected location',
            'address_line_1' => 'Marine Drive',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
            'latitude' => 10.000001,
            'longitude' => 76.000001,
        ]);

        $response->assertRedirect(route('catalog.home'));
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $user->id,
            'address_line_1' => 'Marine Drive',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
            'zone_id' => $zone->id,
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    public function test_setting_location_updates_existing_default_address(): void
    {
        $user = User::factory()->create();
        Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682002'],
        ]);

        $address = UserAddress::factory()->create([
            'user_id' => $user->id,
            'is_default' => true,
            'is_active' => true,
            'address_line_1' => 'Old Address',
            'pincode' => '600001',
        ]);

        $this->actingAs($user)->post(route('location.set'), [
            'type' => UserAddress::TYPE_HOME,
            'label' => 'Selected location',
            'address_line_1' => 'Panampilly Nagar',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682002',
            'latitude' => 10.010001,
            'longitude' => 76.010001,
        ])->assertRedirect(route('catalog.home'));

        $this->assertDatabaseCount('user_addresses', 1);
        $this->assertDatabaseHas('user_addresses', [
            'id' => $address->id,
            'address_line_1' => 'Panampilly Nagar',
            'pincode' => '682002',
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    public function test_setting_non_serviceable_location_returns_validation_error(): void
    {
        $user = User::factory()->create();

        $response = $this->from(route('location.select'))
            ->actingAs($user)
            ->post(route('location.set'), [
                'type' => UserAddress::TYPE_HOME,
                'label' => 'Selected location',
                'address_line_1' => 'Unknown Place',
                'city' => 'Nowhere',
                'state' => 'Unknown',
                'pincode' => '999999',
                'latitude' => 12.000001,
                'longitude' => 77.000001,
            ]);

        $response->assertRedirect(route('location.select'));
        $response->assertSessionHasErrors('location');
        $this->assertDatabaseMissing('user_addresses', [
            'user_id' => $user->id,
            'pincode' => '999999',
        ]);
    }

    public function test_guest_can_set_location_for_serviceable_zone(): void
    {
        $zone = Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682001'],
        ]);

        $response = $this->post(route('location.set'), [
            'type' => UserAddress::TYPE_HOME,
            'label' => 'Selected location',
            'address_line_1' => 'Marine Drive',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
            'latitude' => 10.000001,
            'longitude' => 76.000001,
        ]);

        $response->assertRedirect(route('catalog.home'));
        $response->assertSessionHasNoErrors();
        $this->assertSame($zone->id, session('guest_zone_id'));
        $this->assertNotNull(session('guest_address'));
    }

    public function test_check_serviceability_returns_true_for_coordinates_inside_active_zone(): void
    {
        Zone::factory()->create([
            'is_active' => true,
            'verticals' => ['daily_fresh'],
            'boundary_coordinates' => [
                [10.0800, 76.2000],
                [10.0900, 76.2000],
                [10.0900, 76.2100],
                [10.0800, 76.2100],
            ],
            'service_time_start' => null,
            'service_time_end' => null,
        ]);

        $response = $this->postJson(route('location.check-serviceability'), [
            'latitude' => 10.0850,
            'longitude' => 76.2050,
        ]);

        $response->assertOk();
        $response->assertJsonPath('serviceable', true);
        $response->assertJsonPath('verticals.0', 'daily_fresh');
        $response->assertJsonStructure([
            'serviceable',
            'zone' => ['id', 'name', 'code', 'city', 'state', 'delivery_charge', 'min_order_amount'],
            'verticals',
        ]);
    }

    public function test_check_serviceability_returns_false_for_coordinates_outside_zone(): void
    {
        Zone::factory()->create([
            'is_active' => true,
            'boundary_coordinates' => [
                [10.0800, 76.2000],
                [10.0900, 76.2000],
                [10.0900, 76.2100],
                [10.0800, 76.2100],
            ],
            'service_time_start' => null,
            'service_time_end' => null,
        ]);

        $response = $this->postJson(route('location.check-serviceability'), [
            'latitude' => 11.0000,
            'longitude' => 77.0000,
        ]);

        $response->assertOk();
        $response->assertJsonPath('serviceable', false);
        $response->assertJsonPath('zone', null);
    }

    public function test_check_serviceability_prefers_coordinates_when_pincode_does_not_match(): void
    {
        $zone = Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682001'],
            'boundary_coordinates' => [
                [10.0800, 76.2000],
                [10.0900, 76.2000],
                [10.0900, 76.2100],
                [10.0800, 76.2100],
            ],
            'service_time_start' => null,
            'service_time_end' => null,
        ]);

        $response = $this->postJson(route('location.check-serviceability'), [
            'pincode' => '999999',
            'latitude' => 10.0850,
            'longitude' => 76.2050,
        ]);

        $response->assertOk();
        $response->assertJsonPath('serviceable', true);
        $response->assertJsonPath('zone.id', $zone->id);
    }

    public function test_check_serviceability_uses_latest_boundary_after_zone_update(): void
    {
        $zone = Zone::factory()->create([
            'is_active' => true,
            'boundary_coordinates' => [
                [10.0800, 76.2000],
                [10.0900, 76.2000],
                [10.0900, 76.2100],
                [10.0800, 76.2100],
            ],
            'service_time_start' => null,
            'service_time_end' => null,
        ]);

        $initialResponse = $this->postJson(route('location.check-serviceability'), [
            'latitude' => 10.0850,
            'longitude' => 76.2050,
        ]);

        $initialResponse->assertOk();
        $initialResponse->assertJsonPath('serviceable', true);

        $zone->update([
            'boundary_coordinates' => [
                [11.0000, 77.0000],
                [11.0100, 77.0000],
                [11.0100, 77.0100],
                [11.0000, 77.0100],
            ],
        ]);

        $afterUpdateResponse = $this->postJson(route('location.check-serviceability'), [
            'latitude' => 10.0850,
            'longitude' => 76.2050,
        ]);

        $afterUpdateResponse->assertOk();
        $afterUpdateResponse->assertJsonPath('serviceable', false);
        $afterUpdateResponse->assertJsonPath('zone', null);
    }

    public function test_setting_location_from_navbar_redirects_back(): void
    {
        $user = User::factory()->create();
        Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682001'],
        ]);

        $response = $this->from(route('home'))
            ->actingAs($user)
            ->post(route('location.set'), [
                'from_navbar' => true,
                'type' => UserAddress::TYPE_HOME,
                'label' => 'Selected location',
                'address_line_1' => 'Marine Drive',
                'city' => 'Kochi',
                'state' => 'Kerala',
                'pincode' => '682001',
                'latitude' => 10.000001,
                'longitude' => 76.000001,
            ]);

        $response->assertRedirect(route('home'));
        $response->assertSessionHas('message', 'Delivery location updated.');
    }

    public function test_setting_location_without_pincode_uses_zone_pincode_from_coordinates(): void
    {
        $user = User::factory()->create();
        $zone = Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682502'],
            'boundary_coordinates' => [
                [10.0800, 76.2000],
                [10.0900, 76.2000],
                [10.0900, 76.2100],
                [10.0800, 76.2100],
            ],
            'service_time_start' => null,
            'service_time_end' => null,
        ]);

        $response = $this->actingAs($user)->post(route('location.set'), [
            'type' => UserAddress::TYPE_HOME,
            'label' => 'Selected location',
            'address_line_1' => 'Vypin',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '',
            'latitude' => 10.0850,
            'longitude' => 76.2050,
        ]);

        $response->assertRedirect(route('catalog.home'));
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $user->id,
            'zone_id' => $zone->id,
            'pincode' => '682502',
            'is_default' => true,
        ]);
    }

    public function test_authenticated_user_can_fetch_saved_addresses_for_location_picker(): void
    {
        $user = User::factory()->create();

        UserAddress::factory()->create([
            'user_id' => $user->id,
            'is_default' => false,
            'is_active' => true,
            'label' => 'Work',
            'address_line_1' => 'Old Office',
        ]);

        UserAddress::factory()->create([
            'user_id' => $user->id,
            'is_default' => true,
            'is_active' => true,
            'label' => 'Home',
            'address_line_1' => 'Current Home',
        ]);

        $response = $this->actingAs($user)->getJson(route('location.addresses'));

        $response->assertOk();
        $response->assertJsonCount(2, 'addresses');
        $response->assertJsonPath('addresses.0.is_default', true);
        $response->assertJsonPath('addresses.0.label', 'Home');
    }

    public function test_guest_fetching_location_addresses_gets_empty_list_without_error(): void
    {
        $response = $this->getJson(route('location.addresses'));

        $response->assertOk();
        $response->assertJsonPath('can_manage', false);
        $response->assertJsonPath('addresses', []);
    }

    public function test_adding_address_from_location_flow_redirects_back_to_location_page(): void
    {
        $user = User::factory()->create();

        $response = $this->from(route('location.select'))
            ->actingAs($user)
            ->post(route('profile.addresses.store'), [
                'from_location' => true,
                'type' => UserAddress::TYPE_HOME,
                'label' => 'Home',
                'address_line_1' => 'Marine Drive',
                'city' => 'Kochi',
                'state' => 'Kerala',
                'pincode' => '682001',
                'latitude' => 10.000001,
                'longitude' => 76.000001,
            ]);

        $response->assertRedirect(route('location.select'));
        $response->assertSessionHas('message', 'Address added.');

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $user->id,
            'label' => 'Home',
            'address_line_1' => 'Marine Drive',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
            'is_active' => true,
        ]);
    }

    public function test_authenticated_user_with_non_default_serviceable_address_can_access_location_protected_routes(): void
    {
        $user = User::factory()->create();
        $zone = Zone::factory()->create([
            'is_active' => true,
            'pincodes' => ['682001'],
        ]);

        $oldDefaultAddress = UserAddress::factory()->create([
            'user_id' => $user->id,
            'is_default' => true,
            'is_active' => true,
            'zone_id' => null,
            'pincode' => '600001',
        ]);

        $serviceableAddress = UserAddress::factory()->create([
            'user_id' => $user->id,
            'is_default' => false,
            'is_active' => true,
            'zone_id' => $zone->id,
            'pincode' => '682001',
        ]);

        $response = $this->actingAs($user)->get(route('cart.show'));

        $response->assertOk();
        $this->assertDatabaseHas('user_addresses', [
            'id' => $serviceableAddress->id,
            'is_default' => true,
        ]);
        $this->assertDatabaseHas('user_addresses', [
            'id' => $oldDefaultAddress->id,
            'is_default' => false,
        ]);
    }
}
