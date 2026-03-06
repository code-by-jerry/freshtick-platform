<?php

/*
|--------------------------------------------------------------------------
| Customer web routes (Inertia)
|--------------------------------------------------------------------------
*/

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\BottleController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\UserAddressController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $banners = \App\Models\Banner::current()
        ->byType(\App\Models\Banner::TYPE_HOME)
        ->ordered()
        ->get()
        ->map(fn (\App\Models\Banner $banner) => [
            'id' => $banner->id,
            'title' => $banner->title,
            'description' => $banner->description,
            'image' => $banner->getImageUrl(),
            'mobile_image' => $banner->getMobileImageUrl(),
            'link' => $banner->getLink(),
            'link_type' => $banner->link_type,
        ]);

    $categories = \App\Models\Category::active()
        ->ordered()
        ->get()
        ->map(fn (\App\Models\Category $category) => [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'image' => $category->image,
            'vertical' => $category->vertical,
        ]);

    $products = \App\Models\Product::with('variants')
        ->active()
        ->inStock()
        ->ordered()
        ->get()
        ->map(fn (\App\Models\Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'image' => $product->image,
            'short_description' => $product->short_description,
            'price' => (float) $product->price,
            'compare_at_price' => $product->compare_at_price ? (float) $product->compare_at_price : null,
            'is_subscription_eligible' => (bool) $product->is_subscription_eligible,
            'unit' => $product->unit,
            'weight' => $product->weight ? (float) $product->weight : null,
            'variants' => $product->variants->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
                'price' => (float) $v->price,
                'is_active' => $v->is_active,
            ])->values(),
        ]);

    $subscriptionPlans = \App\Models\SubscriptionPlan::with(['items.product', 'features'])
        ->active()
        ->ordered()
        ->get()
        ->map(fn (\App\Models\SubscriptionPlan $plan) => [
            'id' => $plan->id,
            'name' => $plan->name,
            'description' => $plan->description,
            'frequency_type' => $plan->frequency_type,
            'discount_type' => $plan->discount_type,
            'discount_value' => (float) $plan->discount_value,
            'items' => $plan->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product ? $item->product->name : 'Unknown Product',
                'units' => $item->units,
                'total_price' => (float) $item->total_price,
                'per_unit_price' => (float) $item->per_unit_price,
            ]),
            'features' => $plan->features->map(fn ($feature) => [
                'id' => $feature->id,
                'title' => $feature->title,
                'highlight' => $feature->highlight,
            ]),
        ]);

    return Inertia::render('home', [
        'banners' => $banners,
        'categories' => $categories,
        'products' => $products,
        'subscriptionPlans' => $subscriptionPlans,
    ]);
})->name('home')->middleware(['auth', 'location']);

Route::middleware('location')->group(function () {
    // Catalog home
    Route::get('/catalog', [CatalogController::class, 'index'])->name('catalog.home');

    // Catalog routes
    Route::get('/catalog/search', [CatalogController::class, 'search'])->name('catalog.search');
    Route::get('/categories/{category:slug}', [CatalogController::class, 'showCategory'])->name('catalog.category');
    Route::get('/collections/{collection:slug}', [CatalogController::class, 'showCollection'])->name('catalog.collection');
    Route::get('/products/{product:slug}', [CatalogController::class, 'showProduct'])->name('catalog.product');

    // Product routes
    Route::get('/products', [ProductController::class, 'index'])->name('products');
    Route::get('/products/{product}/related', [ProductController::class, 'relatedProducts'])->name('products.related');

    // Free sample routes
    Route::post('/products/{product}/free-sample/claim', [\App\Http\Controllers\FreeSampleController::class, 'claim'])->name('products.free-sample.claim');
    Route::get('/products/{product}/free-sample/check', [\App\Http\Controllers\FreeSampleController::class, 'checkEligibility'])->name('products.free-sample.check');

    // Cart routes (works for both guests and authenticated users)
    Route::get('/cart', [CartController::class, 'show'])->name('cart.show');
    Route::get('/cart/data', [CartController::class, 'index'])->name('cart.index');
    Route::get('/cart/mini', [CartController::class, 'miniCart'])->name('cart.mini');
    Route::post('/cart/add', [CartController::class, 'addItem'])->name('cart.add');
    Route::put('/cart/items/{cartItem}', [CartController::class, 'updateItem'])->name('cart.update');
    Route::delete('/cart/items/{cartItem}', [CartController::class, 'removeItem'])->name('cart.remove');
    Route::delete('/cart/clear', [CartController::class, 'clear'])->name('cart.clear');

    Route::get('/subscription', [SubscriptionController::class, 'plans'])->name('subscription');
});

Route::get('/welcome', function () {
    return Inertia::render('welcome');
})->name('welcome');

/*
|--------------------------------------------------------------------------
| Location / Zone (customer-facing)
|--------------------------------------------------------------------------
*/
Route::get('/location', [ZoneController::class, 'index'])->name('location.select');
Route::post('/location/check-serviceability', [ZoneController::class, 'checkServiceability'])->name('location.check-serviceability');
Route::get('/location/zone/{pincode}', [ZoneController::class, 'getZoneByPincode'])->name('location.zone-by-pincode')->where('pincode', '[0-9]+');
Route::post('/location/set', [ZoneController::class, 'setLocation'])->name('location.set');
Route::get('/location/addresses', [UserAddressController::class, 'forLocation'])->name('location.addresses');

/*
|--------------------------------------------------------------------------
| User login (customers): phone OTP → users table, web guard
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/auth/email-continue', [AuthController::class, 'continueWithEmail'])
        ->middleware('throttle:5,1')
        ->name('auth.email-continue');
    Route::post('/auth/send-otp', [AuthController::class, 'sendOtp'])
        ->middleware('throttle:5,1')
        ->name('auth.send-otp');
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp'])
        ->middleware('throttle:10,1')
        ->name('auth.verify-otp');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // wishlist
    Route::get('/wishlist', [\App\Http\Controllers\WishlistController::class, 'index'])->name('wishlist.index');
    Route::post('/wishlist/toggle/{product}', [\App\Http\Controllers\WishlistController::class, 'toggle'])->name('wishlist.toggle');

    Route::get('/profile', [UserController::class, 'show'])->name('profile.index');
    Route::put('/profile', [UserController::class, 'update'])->name('profile.update');

    Route::get('/profile/addresses', [UserAddressController::class, 'index'])->name('profile.addresses');
    Route::post('/profile/addresses', [UserAddressController::class, 'store'])->name('profile.addresses.store');
    Route::put('/profile/addresses/{address}', [UserAddressController::class, 'update'])->name('profile.addresses.update');
    Route::delete('/profile/addresses/{address}', [UserAddressController::class, 'destroy'])->name('profile.addresses.destroy');
    Route::post('/profile/addresses/{address}/default', [UserAddressController::class, 'setDefault'])->name('profile.addresses.set-default');

    // Subscription routes
    Route::get('/subscriptions', [SubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::get('/subscriptions/create', [SubscriptionController::class, 'create'])->name('subscriptions.create');
    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::get('/subscriptions/{subscription}', [SubscriptionController::class, 'show'])->name('subscriptions.show');
    Route::get('/subscriptions/{subscription}/edit', [SubscriptionController::class, 'edit'])->name('subscriptions.edit');
    Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update'])->name('subscriptions.update');
    Route::post('/subscriptions/{subscription}/pause', [SubscriptionController::class, 'pause'])->name('subscriptions.pause');
    Route::post('/subscriptions/{subscription}/resume', [SubscriptionController::class, 'resume'])->name('subscriptions.resume');
    Route::post('/subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel'])->name('subscriptions.cancel');
    Route::post('/subscriptions/{subscription}/vacation', [SubscriptionController::class, 'setVacation'])->name('subscriptions.vacation');
    Route::delete('/subscriptions/{subscription}/vacation', [SubscriptionController::class, 'clearVacation'])->name('subscriptions.vacation.clear');
    Route::get('/subscriptions/{subscription}/schedule', [SubscriptionController::class, 'getSchedule'])->name('subscriptions.schedule');

    // Order routes
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/checkout', [OrderController::class, 'create'])->name('checkout');
    Route::post('/checkout', [OrderController::class, 'store'])->name('checkout.store');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::get('/orders/{order}/track', [OrderController::class, 'track'])->name('orders.track');
    Route::post('/orders/{order}/reorder', [OrderController::class, 'reorder'])->name('orders.reorder');

    // Wallet routes
    Route::get('/wallet', [WalletController::class, 'index'])->name('wallet.index');
    Route::get('/wallet/recharge', [WalletController::class, 'rechargeForm'])->name('wallet.recharge');
    Route::post('/wallet/recharge', [WalletController::class, 'recharge'])->name('wallet.recharge.store');
    Route::get('/wallet/transactions', [WalletController::class, 'transactions'])->name('wallet.transactions');
    Route::get('/wallet/balance', [WalletController::class, 'balance'])->name('wallet.balance');
    Route::get('/wallet/auto-recharge', [WalletController::class, 'autoRechargeSettings'])->name('wallet.auto-recharge');
    Route::post('/wallet/auto-recharge', [WalletController::class, 'setAutoRecharge'])->name('wallet.auto-recharge.store');
    Route::post('/wallet/low-balance-threshold', [WalletController::class, 'setLowBalanceThreshold'])->name('wallet.low-balance-threshold');

    // Delivery routes
    Route::get('/deliveries', [DeliveryController::class, 'index'])->name('deliveries.index');
    Route::get('/deliveries/{delivery}', [DeliveryController::class, 'show'])->name('deliveries.show');
    Route::get('/deliveries/{delivery}/track', [DeliveryController::class, 'track'])->name('deliveries.track');
    Route::get('/deliveries/{delivery}/status', [DeliveryController::class, 'getStatus'])->name('deliveries.status');
    Route::get('/deliveries/{delivery}/live-tracking', [DeliveryController::class, 'liveTracking'])->name('deliveries.live-tracking');

    // Bottle routes
    Route::get('/bottles', [BottleController::class, 'index'])->name('bottles.index');
    Route::get('/bottles/balance', [BottleController::class, 'getBalance'])->name('bottles.balance');
    Route::get('/bottles/history', [BottleController::class, 'history'])->name('bottles.history');
    Route::get('/bottles/{bottle}', [BottleController::class, 'show'])->name('bottles.show');

    // Loyalty routes
    Route::get('/loyalty', [LoyaltyController::class, 'index'])->name('loyalty.index');
    Route::get('/loyalty/balance', [LoyaltyController::class, 'balance'])->name('loyalty.balance');
    Route::get('/loyalty/transactions', [LoyaltyController::class, 'transactions'])->name('loyalty.transactions');
    Route::post('/loyalty/convert', [LoyaltyController::class, 'convertToWallet'])->name('loyalty.convert');

    // Referral routes
    Route::get('/referrals', [ReferralController::class, 'index'])->name('referrals.index');
    Route::get('/referrals/stats', [ReferralController::class, 'stats'])->name('referrals.stats');
    Route::get('/referrals/list', [ReferralController::class, 'referrals'])->name('referrals.list');
    Route::post('/referrals/apply', [ReferralController::class, 'applyCode'])->name('referrals.apply');
    Route::post('/referrals/validate', [ReferralController::class, 'validateCode'])->name('referrals.validate');

    // Coupon routes
    Route::post('/coupons/validate', [CouponController::class, 'validate'])->name('coupons.validate');
    Route::post('/coupons/apply', [CouponController::class, 'apply'])->name('coupons.apply');
    Route::delete('/coupons/remove', [CouponController::class, 'remove'])->name('coupons.remove');

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('/notifications/register-device', [NotificationController::class, 'registerDevice'])->name('notifications.register-device');
    Route::post('/notifications/unregister-device', [NotificationController::class, 'unregisterDevice'])->name('notifications.unregister-device');
});

// Public banner endpoint
Route::get('/banners', [BannerController::class, 'index'])->name('banners.index');

// Tracking API (works for both authenticated and anonymous users)
Route::post('/track', [TrackingController::class, 'track'])->name('tracking.track');
Route::post('/track/pageview', [TrackingController::class, 'pageView'])->name('tracking.pageview');
