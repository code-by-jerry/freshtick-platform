<?php

namespace Database\Seeders;

use App\Enums\BusinessVertical;
use App\Models\Hub;
use App\Models\Zone;
use Illuminate\Database\Seeder;

class ZoneSeeder extends Seeder
{
    public function run(): void
    {
        // Remove existing zones
        Zone::query()->forceDelete();

        $hub = Hub::where('name', 'Freshtick Default Hub (vypin-co-op society)')->first();

        Zone::query()->updateOrCreate(
            ['code' => 'VYPIN'],
            [
                'hub_id' => $hub?->id,
                'name' => 'vypin',
                'description' => 'Vypin area delivery zone',
                'pincodes' => ['682502', '682509'],
                'boundary_coordinates' => [
                    [10.09425, 76.190186],
                    [10.097292, 76.220741],
                    [10.119186, 76.209777],
                    [10.109824, 76.187096],
                ],
                'city' => 'Kochi',
                'state' => 'Kerala',
                'is_active' => true,
                'delivery_charge' => 0.00,
                'min_order_amount' => 0.00,
                'verticals' => [
                    BusinessVertical::DailyFresh->value,
                    BusinessVertical::SocietyFresh->value,
                ],
            ]
        );
    }
}
