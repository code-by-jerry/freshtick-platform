<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BusinessVertical;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCollectionRequest;
use App\Http\Requests\Admin\UpdateCollectionRequest;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use App\Traits\HandlesImageUploads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CollectionController extends Controller
{
    use HandlesImageUploads;

    public function index(Request $request): Response
    {
        $query = Collection::query()->with('category:id,name,slug')->ordered();

        $vertical = $request->string('vertical')->toString();
        if ($vertical !== '' && in_array($vertical, array_merge(BusinessVertical::values(), [Collection::VERTICAL_BOTH]), true)) {
            $query->forVertical($vertical);
        }

        $collections = $query->get()->map(function (Collection $collection) use ($vertical) {
            $configuredCategoryIds = array_values(array_filter(array_map('intval', $collection->category_ids ?? [])));
            $configuredCategoryNames = Category::query()
                ->whereIn('id', $configuredCategoryIds)
                ->ordered()
                ->pluck('name')
                ->values();

            $collection->setAttribute('products_count', $collection->configuredProductsCount($vertical !== '' ? $vertical : 'all'));
            $collection->setAttribute('configured_category_names', $configuredCategoryNames);

            return $collection;
        });

        return Inertia::render('admin/collections/index', [
            'collections' => $collections,
            'verticalOptions' => array_merge(['' => 'All verticals'], BusinessVertical::options(), [Collection::VERTICAL_BOTH => 'Both']),
            'productSelectionOptions' => Collection::productSelectionOptions(),
            'filters' => ['vertical' => $vertical],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/collections/create', [
            'verticalOptions' => array_merge([Collection::VERTICAL_BOTH => 'Both'], BusinessVertical::options()),
            'categories' => Category::query()->ordered()->get(['id', 'name', 'slug']),
            'products' => Product::query()->active()->ordered()->get(['id', 'name', 'slug', 'category_id']),
            'productSelectionOptions' => Collection::productSelectionOptions(),
            'categorySelectionOptions' => Collection::categorySelectionOptions(),
        ]);
    }

    public function store(StoreCollectionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        // Handle banner image upload
        if ($request->hasFile('banner_image_file')) {
            $data['banner_image'] = $this->handleImageUpload(null, $request->file('banner_image_file'), 'collections');
        }

        // Handle mobile banner image upload
        if ($request->hasFile('banner_mobile_image_file')) {
            $data['banner_mobile_image'] = $this->handleImageUpload(null, $request->file('banner_mobile_image_file'), 'collections');
        }

        $data = $this->normalizeSelectionPayload($data);

        unset($data['banner_image_file'], $data['banner_mobile_image_file']);

        Collection::query()->create($data);

        return redirect()->route('admin.collections.index')->with('message', 'Collection created.');
    }

    public function show(Collection $collection): Response
    {
        $configuredCategoryIds = array_values(array_filter(array_map('intval', $collection->category_ids ?? [])));
        $configuredCategories = Category::query()->whereIn('id', $configuredCategoryIds)->ordered()->get(['id', 'name', 'slug']);
        $previewProducts = $collection->configuredProductsQuery('all')->limit(10)->get(['id', 'name', 'slug', 'is_active']);

        $collection->load('category:id,name,slug');
        $collection->setAttribute('configured_categories', $configuredCategories);
        $collection->setAttribute('products', $previewProducts);
        $collection->setAttribute('products_count', $collection->configuredProductsCount());
        $collection->setAttribute('product_selection_label', Collection::productSelectionOptions()[$collection->product_selection_mode] ?? $collection->product_selection_mode);
        $collection->setAttribute('category_selection_label', Collection::categorySelectionOptions()[$collection->category_selection_mode] ?? $collection->category_selection_mode);

        return Inertia::render('admin/collections/show', [
            'collection' => $collection,
        ]);
    }

    public function edit(Collection $collection): Response
    {
        return Inertia::render('admin/collections/edit', [
            'collection' => $collection,
            'verticalOptions' => array_merge([Collection::VERTICAL_BOTH => 'Both'], BusinessVertical::options()),
            'categories' => Category::query()->ordered()->get(['id', 'name', 'slug']),
            'products' => Product::query()->active()->ordered()->get(['id', 'name', 'slug', 'category_id']),
            'productSelectionOptions' => Collection::productSelectionOptions(),
            'categorySelectionOptions' => Collection::categorySelectionOptions(),
        ]);
    }

    public function update(UpdateCollectionRequest $request, Collection $collection): RedirectResponse
    {
        $data = $request->validated();

        // Banner image: file upload or URL from frontend ImageKit upload
        if ($request->hasFile('banner_image_file')) {
            $this->deleteOldImage($collection->banner_image, false);
            $data['banner_image'] = $this->handleImageUpload(null, $request->file('banner_image_file'), 'collections');
        } elseif ($request->filled('banner_image')) {
            $newUrl = $request->input('banner_image');
            if ($newUrl !== $collection->banner_image) {
                if ($collection->banner_image) {
                    $this->deleteOldImage($collection->banner_image, false);
                }
                $data['banner_image'] = $newUrl;
            }
        }

        // Banner mobile image: file upload or URL from frontend ImageKit upload
        if ($request->hasFile('banner_mobile_image_file')) {
            $this->deleteOldImage($collection->banner_mobile_image, false);
            $data['banner_mobile_image'] = $this->handleImageUpload(null, $request->file('banner_mobile_image_file'), 'collections');
        } elseif ($request->filled('banner_mobile_image')) {
            $newUrl = $request->input('banner_mobile_image');
            if ($newUrl !== $collection->banner_mobile_image) {
                if ($collection->banner_mobile_image) {
                    $this->deleteOldImage($collection->banner_mobile_image, false);
                }
                $data['banner_mobile_image'] = $newUrl;
            }
        }

        $data = $this->normalizeSelectionPayload($data);

        unset($data['banner_image_file'], $data['banner_mobile_image_file']);

        $collection->update($data);

        return redirect()->route('admin.collections.index')->with('message', 'Collection updated.');
    }

    public function destroy(Collection $collection): RedirectResponse
    {
        $collection->delete();

        return redirect()->route('admin.collections.index')->with('message', 'Collection deleted.');
    }

    public function toggleStatus(Collection $collection): RedirectResponse
    {
        $collection->update(['is_active' => ! $collection->is_active]);

        return redirect()->back()->with('message', $collection->is_active ? 'Collection enabled.' : 'Collection disabled.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeSelectionPayload(array $data): array
    {
        $categoryIds = array_values(array_filter(array_map('intval', $data['category_ids'] ?? [])));
        $productIds = array_values(array_filter(array_map('intval', $data['product_ids'] ?? [])));
        $productMode = $data['product_selection_mode'] ?? Collection::PRODUCT_SELECTION_CATEGORY;
        $categoryMode = $data['category_selection_mode'] ?? Collection::CATEGORY_SELECTION_ALL;

        if ($categoryMode === Collection::CATEGORY_SELECTION_ALL) {
            $categoryIds = [];
        }

        if ($productMode !== Collection::PRODUCT_SELECTION_MANUAL) {
            $productIds = [];
        }

        if ($productMode === Collection::PRODUCT_SELECTION_MANUAL && $categoryMode === Collection::CATEGORY_SELECTION_SELECTED) {
            $allowedProductIds = Product::query()
                ->whereIn('id', $productIds)
                ->whereIn('category_id', $categoryIds)
                ->pluck('id')
                ->map(fn (int $id) => (int) $id)
                ->values()
                ->all();

            $productIds = $allowedProductIds;
        }

        $data['category_ids'] = $categoryIds;
        $data['product_ids'] = $productIds;
        $data['random_products_limit'] = max(1, (int) ($data['random_products_limit'] ?? 12));

        return $data;
    }
}
