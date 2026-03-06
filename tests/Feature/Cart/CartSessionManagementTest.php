<?php

namespace Tests\Feature\Cart;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartSessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_add_a_product_to_cart_using_session(): void
    {
        $zone = Zone::factory()->create();
        $product = Product::factory()->create(['price' => 42.50]);

        $this->startSession();
        session(['guest_zone_id' => $zone->id]);

        $response = $this->from('/products')
            ->withSession(['_token' => 'test-csrf-token'])
            ->post('/cart/add', [
                'product_id' => $product->id,
                'quantity' => 2,
            ], ['X-CSRF-TOKEN' => 'test-csrf-token']);

        $response->assertRedirect('/products');

        $cart = Cart::query()->where('session_id', session()->getId())->first();

        $this->assertNotNull($cart);
        $this->assertSame(2, $cart->itemCount());
        $this->assertEquals(85.00, (float) $cart->subtotal);

        $item = CartItem::query()->where('cart_id', $cart->id)->where('product_id', $product->id)->first();

        $this->assertNotNull($item);
        $this->assertSame(2, $item->quantity);
    }

    public function test_guest_can_update_and_remove_a_cart_item(): void
    {
        $zone = Zone::factory()->create();
        $product = Product::factory()->create(['price' => 20]);

        $this->startSession();
        session(['guest_zone_id' => $zone->id]);

        $cart = Cart::query()->create([
            'session_id' => session()->getId(),
            'expires_at' => now()->addDays(7),
        ]);

        $cartItem = CartItem::query()->create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 20,
            'subtotal' => 20,
            'vertical' => 'daily_fresh',
            'is_subscription' => false,
        ]);

        $updateResponse = $this->from('/cart')
            ->withSession(['_token' => 'test-csrf-token'])
            ->put("/cart/items/{$cartItem->id}", [
                'quantity' => 3,
            ], ['X-CSRF-TOKEN' => 'test-csrf-token']);

        $updateResponse->assertRedirect('/cart');

        $cartItem->refresh();
        $this->assertSame(3, $cartItem->quantity);

        $deleteResponse = $this->from('/cart')
            ->withSession(['_token' => 'test-csrf-token'])
            ->delete("/cart/items/{$cartItem->id}", [], ['X-CSRF-TOKEN' => 'test-csrf-token']);

        $deleteResponse->assertRedirect('/cart');
        $this->assertDatabaseMissing('cart_items', ['id' => $cartItem->id]);
    }

    public function test_guest_can_add_product_variants_as_distinct_cart_items(): void
    {
        $zone = Zone::factory()->create();
        $user = User::factory()->create();
        $user->addresses()->create([
            'type' => 'home',
            'label' => 'Home',
            'address_line_1' => 'Variant Street',
            'address_line_2' => null,
            'landmark' => 'Near Test Junction',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
            'latitude' => 10.0,
            'longitude' => 76.0,
            'zone_id' => $zone->id,
            'is_default' => true,
            'is_active' => true,
        ]);
        $product = Product::factory()->create(['price' => 42.50]);
        $variantA = $product->variants()->create([
            'name' => '500ml',
            'sku' => 'SKU-500ML-TEST',
            'price' => 50.00,
            'stock_quantity' => 100,
            'is_active' => true,
        ]);
        $variantB = $product->variants()->create([
            'name' => '1L',
            'sku' => 'SKU-1L-TEST',
            'price' => 80.00,
            'stock_quantity' => 100,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->from('/products')
            ->post('/cart/add', [
                'product_id' => $product->id,
                'variant_id' => $variantA->id,
                'quantity' => 1,
            ])
            ->assertRedirect('/products')
            ->assertSessionDoesntHaveErrors();

        $this->actingAs($user)
            ->from('/products')
            ->post('/cart/add', [
                'product_id' => $product->id,
                'variant_id' => $variantB->id,
                'quantity' => 1,
            ])
            ->assertRedirect('/products')
            ->assertSessionDoesntHaveErrors();

        $cart = Cart::query()->where('user_id', $user->id)->first();

        $this->assertNotNull($cart);
        $this->assertSame(2, $cart->itemCount());
        $this->assertEquals(130.00, (float) $cart->subtotal);
        $this->assertDatabaseCount('cart_items', 2);

        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'variant_id' => $variantA->id,
            'quantity' => 1,
            'price' => 50.00,
        ]);

        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'variant_id' => $variantB->id,
            'quantity' => 1,
            'price' => 80.00,
        ]);

        $this->actingAs($user)
            ->from('/products')
            ->post('/cart/add', [
                'product_id' => $product->id,
                'variant_id' => $variantA->id,
                'quantity' => 2,
            ])
            ->assertRedirect('/products');

        $cart->refresh();
        $this->assertSame(4, $cart->itemCount());

        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'variant_id' => $variantA->id,
            'quantity' => 3,
            'price' => 50.00,
        ]);
    }
}
