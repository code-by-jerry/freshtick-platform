<?php

namespace App\Providers;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SubscriptionPlan;
use App\Observers\HomePayloadCacheObserver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }
        $this->configureDefaults();
        $this->registerObservers();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }

    protected function registerObservers(): void
    {
        Banner::observe(HomePayloadCacheObserver::class);
        Category::observe(HomePayloadCacheObserver::class);
        Collection::observe(HomePayloadCacheObserver::class);
        Coupon::observe(HomePayloadCacheObserver::class);
        Product::observe(HomePayloadCacheObserver::class);
        ProductVariant::observe(HomePayloadCacheObserver::class);
        SubscriptionPlan::observe(HomePayloadCacheObserver::class);
    }
}
