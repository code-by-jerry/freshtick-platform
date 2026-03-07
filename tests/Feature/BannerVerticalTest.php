<?php

namespace Tests\Feature;

use App\Enums\BusinessVertical;
use App\Models\Admin;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BannerVerticalTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_banner_with_vertical(): void
    {
        /** @var Admin $admin */
        $admin = Admin::factory()->create();

        $response = $this->actingAs($admin, 'admin')->post(route('admin.banners.store'), [
            'name' => 'Daily Home Banner',
            'type' => Banner::TYPE_HOME,
            'vertical' => BusinessVertical::DailyFresh->value,
            'title' => 'Daily Promo',
            'description' => 'Daily fresh banner',
            'image' => 'https://example.com/banner.jpg',
            'mobile_image' => 'https://example.com/banner-mobile.jpg',
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 1,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => [],
        ]);

        $response->assertRedirect(route('admin.banners.index'));

        $this->assertDatabaseHas('banners', [
            'name' => 'Daily Home Banner',
            'vertical' => BusinessVertical::DailyFresh->value,
            'type' => Banner::TYPE_HOME,
        ]);
    }

    public function test_home_route_filters_banners_by_vertical_and_includes_both(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $zone = Zone::factory()->create(['is_active' => true]);

        UserAddress::factory()->create([
            'user_id' => $user->id,
            'zone_id' => $zone->id,
            'is_default' => true,
            'is_active' => true,
        ]);

        $societyBanner = Banner::query()->create([
            'name' => 'Society Banner',
            'type' => Banner::TYPE_HOME,
            'vertical' => BusinessVertical::SocietyFresh->value,
            'title' => 'Society',
            'description' => null,
            'image' => 'https://example.com/society.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 1,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        $bothBanner = Banner::query()->create([
            'name' => 'Both Banner',
            'type' => Banner::TYPE_HOME,
            'vertical' => Banner::VERTICAL_BOTH,
            'title' => 'Both',
            'description' => null,
            'image' => 'https://example.com/both.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 2,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        Banner::query()->create([
            'name' => 'Daily Banner',
            'type' => Banner::TYPE_HOME,
            'vertical' => BusinessVertical::DailyFresh->value,
            'title' => 'Daily',
            'description' => null,
            'image' => 'https://example.com/daily.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 3,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        $societyPromoBanner = Banner::query()->create([
            'name' => 'Society Promo Banner',
            'type' => Banner::TYPE_PROMOTIONAL,
            'vertical' => BusinessVertical::SocietyFresh->value,
            'title' => 'Society Promo',
            'description' => null,
            'image' => 'https://example.com/society-promo.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 1,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        $bothPromoBanner = Banner::query()->create([
            'name' => 'Both Promo Banner',
            'type' => Banner::TYPE_PROMOTIONAL,
            'vertical' => Banner::VERTICAL_BOTH,
            'title' => 'Both Promo',
            'description' => null,
            'image' => 'https://example.com/both-promo.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 2,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        Banner::query()->create([
            'name' => 'Daily Promo Banner',
            'type' => Banner::TYPE_PROMOTIONAL,
            'vertical' => BusinessVertical::DailyFresh->value,
            'title' => 'Daily Promo',
            'description' => null,
            'image' => 'https://example.com/daily-promo.jpg',
            'mobile_image' => null,
            'link_url' => null,
            'link_type' => Banner::LINK_NONE,
            'link_id' => null,
            'display_order' => 3,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
            'zones' => null,
        ]);

        $response = $this->actingAs($user)->get(route('home', ['vertical' => BusinessVertical::SocietyFresh->value]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->has('banners', 2)
            ->where('banners.0.id', $societyBanner->id)
            ->where('banners.1.id', $bothBanner->id)
            ->has('promotionalBanners', 2)
            ->where('promotionalBanners.0.id', $societyPromoBanner->id)
            ->where('promotionalBanners.1.id', $bothPromoBanner->id)
        );
    }

    public function test_home_route_includes_daily_customer_favourites_collection_payload(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $zone = Zone::factory()->create(['is_active' => true]);

        UserAddress::factory()->create([
            'user_id' => $user->id,
            'zone_id' => $zone->id,
            'is_default' => true,
            'is_active' => true,
        ]);

        $category = Category::factory()->create([
            'vertical' => BusinessVertical::DailyFresh->value,
        ]);

        $productA = Product::factory()->create([
            'name' => 'A Daily Product',
            'category_id' => $category->id,
            'vertical' => BusinessVertical::DailyFresh->value,
            'is_active' => true,
            'is_in_stock' => true,
        ]);

        $productB = Product::factory()->create([
            'name' => 'B Daily Product',
            'category_id' => $category->id,
            'vertical' => BusinessVertical::DailyFresh->value,
            'is_active' => true,
            'is_in_stock' => true,
        ]);

        Collection::query()->create([
            'name' => 'Customer Favourites - daily fresh',
            'slug' => 'customer-favourites-daily-fresh',
            'description' => 'Daily favourites',
            'category_id' => $category->id,
            'product_selection_mode' => Collection::PRODUCT_SELECTION_MANUAL,
            'category_selection_mode' => Collection::CATEGORY_SELECTION_SELECTED,
            'category_ids' => [$category->id],
            'product_ids' => [$productA->id, $productB->id],
            'random_products_limit' => 12,
            'banner_image' => '/images/customer-favourites-web.png',
            'banner_mobile_image' => '/images/customer-favourites-mobile.png',
            'display_order' => 1,
            'is_active' => true,
            'vertical' => BusinessVertical::DailyFresh->value,
            'starts_at' => null,
            'ends_at' => null,
            'link_url' => null,
            'meta_title' => null,
            'meta_description' => null,
        ]);

        $response = $this->actingAs($user)->get(route('home', ['vertical' => BusinessVertical::DailyFresh->value]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->where('customerFavouritesCollection.slug', 'customer-favourites-daily-fresh')
            ->where('customerFavouritesCollection.banner_image', '/images/customer-favourites-web.png')
            ->where('customerFavouritesCollection.banner_mobile_image', '/images/customer-favourites-mobile.png')
            ->has('customerFavouritesCollection.products', 2)
            ->where('customerFavouritesCollection.products.0.id', $productA->id)
            ->where('customerFavouritesCollection.products.1.id', $productB->id)
        );
    }
}
