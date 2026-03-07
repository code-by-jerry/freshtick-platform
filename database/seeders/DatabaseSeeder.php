<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(ThemeSettingSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(HubSeeder::class);
        $this->call(ZoneSeeder::class);
        $this->call(CategorySeeder::class);
        $this->call(ProductSeeder::class);
        $this->call(CollectionSeeder::class);
        $this->call(CouponOfferSeeder::class);
        $this->call(SubscriptionPlanSeeder::class);
        $this->call(UserSeeder::class);
        $this->call(DriverSeeder::class);
        $this->call(RouteSeeder::class);
        $this->call(WishlistSeeder::class);
    }
}
