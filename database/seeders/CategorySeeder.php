<?php

namespace Database\Seeders;

use App\Enums\BusinessVertical;
use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Fresh Milk',
                'slug' => 'fresh-milk',
                'description' => 'Farm fresh milk for daily use',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Cow Milk',
                'slug' => 'cow-milk',
                'description' => 'Pure cow milk delivered fresh',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Buffalo Milk',
                'slug' => 'buffalo-milk',
                'description' => 'Rich and creamy buffalo milk',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Toned Milk',
                'slug' => 'toned-milk',
                'description' => 'Balanced fat toned milk packs',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Double Toned Milk',
                'slug' => 'double-toned-milk',
                'description' => 'Light and healthy double toned milk',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Full Cream Milk',
                'slug' => 'full-cream-milk',
                'description' => 'Full cream milk for richer taste',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Skimmed Milk',
                'slug' => 'skimmed-milk',
                'description' => 'Low fat skimmed milk',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 7,
                'is_active' => true,
            ],
            [
                'name' => 'A2 Milk',
                'slug' => 'a2-milk',
                'description' => 'Premium A2 milk selection',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 8,
                'is_active' => true,
            ],
            [
                'name' => 'Organic Milk',
                'slug' => 'organic-milk',
                'description' => 'Certified organic fresh milk',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 9,
                'is_active' => true,
            ],
            [
                'name' => 'Lactose Free Milk',
                'slug' => 'lactose-free-milk',
                'description' => 'Easy to digest lactose free milk',
                'image' => '/demo/milk.png',
                'vertical' => BusinessVertical::DailyFresh->value,
                'display_order' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'Butter Milk',
                'slug' => 'butter-milk',
                'description' => 'Refreshing and natural butter milk',
                'image' => '/demo/butter milk.png',
                'vertical' => BusinessVertical::SocietyFresh->value,
                'display_order' => 11,
                'is_active' => true,
            ],
            [
                'name' => 'Country Butter',
                'slug' => 'country-butter',
                'description' => 'Pure and traditional country butter',
                'image' => '/demo/butter.png',
                'vertical' => BusinessVertical::SocietyFresh->value,
                'display_order' => 12,
                'is_active' => true,
            ],
            [
                'name' => 'Fresh Curd',
                'slug' => 'fresh-curd',
                'description' => 'Thick and creamy naturally set curd',
                'image' => '/demo/Fresh Curd.png',
                'vertical' => Category::VERTICAL_BOTH,
                'display_order' => 13,
                'is_active' => true,
            ],
            [
                'name' => 'Ghee',
                'slug' => 'ghee',
                'description' => 'Aromatic and pure cow ghee',
                'image' => '/demo/Ghee.png',
                'vertical' => Category::VERTICAL_BOTH,
                'display_order' => 14,
                'is_active' => true,
            ],
            [
                'name' => 'Paneer',
                'slug' => 'paneer',
                'description' => 'Soft and fresh cottage cheese',
                'image' => '/demo/panneer.png',
                'vertical' => BusinessVertical::SocietyFresh->value,
                'display_order' => 15,
                'is_active' => true,
            ],
        ];

        foreach ($categories as $data) {
            Category::query()->updateOrCreate(
                ['slug' => $data['slug']],
                $data,
            );
        }
    }
}
