<?php

namespace App\Http\Controllers;

use App\Enums\BusinessVertical;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use App\Services\CatalogService;
use App\Services\FreeSampleService;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    public function __construct(private CatalogService $catalogService, private LocationService $locationService, private FreeSampleService $freeSampleService
    ) {}

    /**
     * Home page with banners, categories, featured products
     */
    public function index(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $vertical = $request->string('vertical', BusinessVertical::DailyFresh->value)->toString();

        // Validate vertical
        if (! in_array($vertical, array_merge(BusinessVertical::values(), ['both']), true)) {
            $vertical = BusinessVertical::DailyFresh->value;
        }

        $zone = $this->getUserZone($request);
        if ($zone === null) {
            // Return view with empty data instead of redirecting
            return Inertia::render('catalog/home', [
                'vertical' => $vertical,
                'verticalOptions' => BusinessVertical::options(),
                'zone' => null,
                'banners' => collect([]),
                'categories' => collect([]),
                'featuredProducts' => collect([]),
            ]);
        }

        $banners = $this->catalogService->getActiveBanners($zone, $vertical);
        $categories = $this->catalogService->getCategoriesWithProducts($zone, $vertical);
        $featuredProducts = $this->catalogService->getFeaturedProducts($zone, $vertical, 12);

        return Inertia::render('catalog/home', [
            'vertical' => $vertical,
            'verticalOptions' => BusinessVertical::options(),
            'zone' => $zone->only(['id', 'name', 'code', 'city', 'state']),
            'banners' => $banners,
            'categories' => $categories,
            'featuredProducts' => $featuredProducts,
        ]);
    }

    /**
     * Show category page with products
     */
    public function showCategory(Request $request, Category $category): Response|\Illuminate\Http\RedirectResponse
    {
        $vertical = $request->string('vertical', BusinessVertical::DailyFresh->value)->toString();
        if (! in_array($vertical, array_merge(BusinessVertical::values(), ['both']), true)) {
            $vertical = BusinessVertical::DailyFresh->value;
        }

        $zone = $this->getUserZone($request);
        if ($zone === null) {
            return redirect()->route('location.select');
        }

        // Verify category is for this vertical
        if ($category->vertical !== $vertical && $category->vertical !== Category::VERTICAL_BOTH) {
            abort(404);
        }

        $filters = [
            'category_id' => $category->id,
            'sort' => $request->string('sort', 'display_order')->toString(),
            'min_price' => $request->float('min_price', 0),
            'max_price' => $request->float('max_price', 0),
        ];

        if ($request->has('max_price') && $request->float('max_price') > 0) {
            $filters['max_price'] = $request->float('max_price');
        }

        $products = $this->catalogService->getProductsForZone($zone, $vertical, $filters);

        return Inertia::render('catalog/category', [
            'category' => $category,
            'vertical' => $vertical,
            'zone' => $zone->only(['id', 'name', 'code']),
            'products' => $products,
            'filters' => $filters,
        ]);
    }

    /**
     * Show collection page
     */
    public function showCollection(Request $request, Collection $collection): Response|\Illuminate\Http\RedirectResponse
    {
        $vertical = $request->string('vertical', BusinessVertical::DailyFresh->value)->toString();
        if (! in_array($vertical, array_merge(BusinessVertical::values(), ['both']), true)) {
            $vertical = BusinessVertical::DailyFresh->value;
        }

        $zone = $this->getUserZone($request);
        if ($zone === null) {
            return redirect()->route('location.select');
        }

        // Verify collection is for this vertical
        if ($collection->vertical !== $vertical && $collection->vertical !== Collection::VERTICAL_BOTH) {
            abort(404);
        }

        $products = $collection->configuredProductsQuery($vertical)
            ->whereHas('zones', function ($query) use ($zone) {
                $query->where('zones.id', $zone->id)->where('product_zones.is_available', true);
            })
            ->with(['category:id,name,slug', 'collection:id,name,slug', 'variants'])
            ->get();

        $filters = [
            'collection_id' => $collection->id,
            'sort' => $request->string('sort', 'display_order')->toString(),
        ];

        return Inertia::render('catalog/collection', [
            'collection' => $collection,
            'vertical' => $vertical,
            'zone' => $zone->only(['id', 'name', 'code']),
            'products' => $products,
            'filters' => $filters,
        ]);
    }

    /**
     * Show product detail page
     */
    public function showProduct(Request $request, Product $product): Response|\Illuminate\Http\RedirectResponse
    {
        $requestedVertical = $request->string('vertical', '')->toString();
        if (! in_array($requestedVertical, array_merge(BusinessVertical::values(), ['both']), true)) {
            $requestedVertical = '';
        }

        $vertical = $requestedVertical !== ''
            ? $requestedVertical
            : ($product->vertical === Product::VERTICAL_BOTH ? BusinessVertical::DailyFresh->value : $product->vertical);

        $zone = $this->getUserZone($request);
        if ($zone === null) {
            return redirect()->route('location.select');
        }

        // Only enforce vertical check when explicitly requested
        if ($requestedVertical !== '' && $product->vertical !== $vertical && $product->vertical !== Product::VERTICAL_BOTH) {
            abort(404);
        }

        // Check if product is available in zone
        if (! $product->isAvailableInZone($zone)) {
            abort(404, 'Product not available in your area.');
        }

        $relatedProducts = $this->catalogService->getRelatedProducts($product, $zone, $vertical, 8);

        // Get cross-sell and upsell products
        $crossSellProducts = $product->relatedProducts()
            ->wherePivot('relation_type', 'cross_sell')
            ->whereHas('zones', function ($q) use ($zone) {
                $q->where('zones.id', $zone->id)->where('product_zones.is_available', true);
            })
            ->active()
            ->inStock()
            ->orderByPivot('display_order')
            ->limit(6)
            ->get();

        $upsellProducts = $product->relatedProducts()
            ->wherePivot('relation_type', 'upsell')
            ->whereHas('zones', function ($q) use ($zone) {
                $q->where('zones.id', $zone->id)->where('product_zones.is_available', true);
            })
            ->active()
            ->inStock()
            ->orderByPivot('display_order')
            ->limit(4)
            ->get();

        // Check free sample eligibility
        $user = $request->user();
        $isFreeSampleEligible = $this->freeSampleService->checkEligibility($user, $product);

        $product->load(['category:id,name,slug', 'collection:id,name,slug', 'variants']);

        return Inertia::render('product-detail', [
            'product' => $product,
            'vertical' => $vertical,
            'zone' => $zone->only(['id', 'name', 'code']),
            'relatedProducts' => $relatedProducts,
            'crossSellProducts' => $crossSellProducts,
            'upsellProducts' => $upsellProducts,
            'price' => $product->getPriceForZone($zone),
            'isFreeSampleEligible' => $isFreeSampleEligible,
        ]);
    }

    /**
     * Search products
     */
    public function search(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $query = $request->string('q', '')->toString();
        $vertical = $request->string('vertical', BusinessVertical::DailyFresh->value)->toString();
        if (! in_array($vertical, array_merge(BusinessVertical::values(), ['both']), true)) {
            $vertical = BusinessVertical::DailyFresh->value;
        }

        $zone = $this->getUserZone($request);
        if ($zone === null) {
            return redirect()->route('location.select');
        }

        $products = $this->catalogService->searchProducts($query, $zone, $vertical);

        return Inertia::render('catalog/search', [
            'query' => $query,
            'vertical' => $vertical,
            'zone' => $zone->only(['id', 'name', 'code']),
            'products' => $products,
        ]);
    }

    /**
     * Get user's zone from default address
     */
    private function getUserZone(Request $request): ?\App\Models\Zone
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        $defaultAddress = $user->addresses()
            ->active()
            ->where('is_default', true)
            ->first();

        if ($defaultAddress === null) {
            return null;
        }

        // Development bypass: auto-assign zone if missing
        if ($defaultAddress->zone_id === null && config('app.debug')) {
            $defaultAddress->autoAssignZone();
            $defaultAddress->refresh();
        }

        if ($defaultAddress->zone_id === null) {
            return null;
        }

        return $defaultAddress->zone;
    }
}
