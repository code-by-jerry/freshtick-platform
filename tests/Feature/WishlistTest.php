<?php

namespace Tests\Feature;

use App\Enums\BusinessVertical;
use App\Models\Product;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->zone = Zone::factory()->create([
            'is_active' => true,
            'verticals' => [BusinessVertical::DailyFresh->value],
        ]);

        $this->user = User::factory()->create();
        // ensure user has an address so middleware/location won't block
        // user address factory is used in ProductTest so we can do same here
        \App\Models\UserAddress::factory()->create([
            'user_id' => $this->user->id,
            'zone_id' => $this->zone->id,
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    public function test_guest_redirected_from_wishlist_pages(): void
    {
        $product = Product::factory()->create();

        $this->get('/wishlist')->assertRedirect('/login');
        $this->post("/wishlist/toggle/{$product->id}")->assertRedirect('/login');
    }

    public function test_user_can_add_and_remove_product(): void
    {
        $product = Product::factory()->create();
        $product->zones()->attach($this->zone->id, ['is_available' => true, 'stock_quantity' => 10]);

        $this->actingAs($this->user)
            ->post("/wishlist/toggle/{$product->id}")
            ->assertSessionHas('message', 'Product added to wishlist.');

        $this->assertDatabaseHas('wishlists', [
            'user_id' => $this->user->id,
            'product_id' => $product->id,
        ]);

        // toggling again should remove
        $this->actingAs($this->user)
            ->post("/wishlist/toggle/{$product->id}")
            ->assertSessionHas('message', 'Product removed from wishlist.');

        $this->assertDatabaseMissing('wishlists', [
            'user_id' => $this->user->id,
            'product_id' => $product->id,
        ]);
    }

    public function test_wishlist_index_shows_products(): void
    {
        $product = Product::factory()->create();
        $product->zones()->attach($this->zone->id, ['is_available' => true, 'stock_quantity' => 10]);

        // add entry
        $this->actingAs($this->user)->post("/wishlist/toggle/{$product->id}");

        $response = $this->actingAs($this->user)->get('/wishlist');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('products.0.id')
            ->where('products.0.id', $product->id)
        );
    }

    public function test_admin_can_view_insights(): void
    {
        $admin = \App\Models\Admin::factory()->create();
        $product = Product::factory()->create();
        $product->zones()->attach($this->zone->id, ['is_available' => true, 'stock_quantity' => 10]);
        \App\Models\Wishlist::factory()->create([
            'user_id' => $this->user->id,
            'product_id' => $product->id,
        ]);

        $response = $this->withoutVite()
            ->actingAs($admin, 'admin')
            ->get(route('admin.wishlist-insights.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('stats.total_wishlisted_items')
        );
    }
}
