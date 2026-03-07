<?php

namespace Database\Seeders;

use App\Enums\BusinessVertical;
use App\Models\Category;
use App\Models\Coupon;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CouponOfferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $dailyCategoryIds = Category::query()
            ->whereIn('vertical', [BusinessVertical::DailyFresh->value, Category::VERTICAL_BOTH])
            ->pluck('id')
            ->all();

        $societyCategoryIds = Category::query()
            ->whereIn('vertical', [BusinessVertical::SocietyFresh->value, Category::VERTICAL_BOTH])
            ->pluck('id')
            ->all();

        $offers = [
            [
                'code' => 'DAILY15',
                'name' => 'Daily Fresh Saver 15',
                'description' => 'Flat ₹15 off on Daily Fresh category orders above ₹149.',
                'type' => Coupon::TYPE_FIXED,
                'value' => 15,
                'min_order_amount' => 149,
                'max_discount' => 15,
                'category_ids' => $dailyCategoryIds,
            ],
            [
                'code' => 'DAILY25',
                'name' => 'Daily Fresh Saver 25',
                'description' => 'Flat ₹25 off on Daily Fresh category orders above ₹249.',
                'type' => Coupon::TYPE_FIXED,
                'value' => 25,
                'min_order_amount' => 249,
                'max_discount' => 25,
                'category_ids' => $dailyCategoryIds,
            ],
            [
                'code' => 'SOCIETY15',
                'name' => 'Society Fresh Saver 15',
                'description' => 'Flat ₹15 off on Society Fresh category orders above ₹149.',
                'type' => Coupon::TYPE_FIXED,
                'value' => 15,
                'min_order_amount' => 149,
                'max_discount' => 15,
                'category_ids' => $societyCategoryIds,
            ],
            [
                'code' => 'SOCIETY25',
                'name' => 'Society Fresh Saver 25',
                'description' => 'Flat ₹25 off on Society Fresh category orders above ₹249.',
                'type' => Coupon::TYPE_FIXED,
                'value' => 25,
                'min_order_amount' => 249,
                'max_discount' => 25,
                'category_ids' => $societyCategoryIds,
            ],
            [
                'code' => 'FRESHSAVE10',
                'name' => 'FreshTick Saver 10%',
                'description' => 'Get 10% off up to ₹40 on orders above ₹199 for all categories.',
                'type' => Coupon::TYPE_PERCENTAGE,
                'value' => 10,
                'min_order_amount' => 199,
                'max_discount' => 40,
                'category_ids' => [],
            ],
        ];

        foreach ($offers as $offer) {
            $applicableTo = empty($offer['category_ids']) ? Coupon::APPLICABLE_ALL : Coupon::APPLICABLE_CATEGORIES;

            Coupon::query()->updateOrCreate(
                ['code' => $offer['code']],
                [
                    'name' => $offer['name'],
                    'description' => $offer['description'],
                    'type' => $offer['type'],
                    'value' => $offer['value'],
                    'min_order_amount' => $offer['min_order_amount'],
                    'max_discount' => $offer['max_discount'],
                    'usage_limit' => 10000,
                    'usage_limit_per_user' => 3,
                    'used_count' => 0,
                    'is_active' => true,
                    'starts_at' => Carbon::now()->subDay(),
                    'ends_at' => Carbon::now()->addMonths(3),
                    'applicable_to' => $applicableTo,
                    'applicable_ids' => $applicableTo === Coupon::APPLICABLE_ALL ? null : $offer['category_ids'],
                    'exclude_free_samples' => true,
                    'exclude_subscriptions' => false,
                    'first_order_only' => false,
                    'new_users_only' => false,
                ]
            );
        }
    }
}
