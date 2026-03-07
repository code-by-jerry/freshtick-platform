<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BusinessVertical;
use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Zone;
use App\Traits\HandlesImageUploads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BannerController extends Controller
{
    use HandlesImageUploads;

    /**
     * Display banners list.
     */
    public function index(Request $request): Response
    {
        $query = Banner::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('type')) {
            $query->byType($request->type);
        }

        $vertical = $request->string('vertical')->toString();
        if ($vertical !== '' && in_array($vertical, array_merge(BusinessVertical::values(), [Banner::VERTICAL_BOTH]), true)) {
            $query->where('vertical', $vertical);
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->active();
            } else {
                $query->where('is_active', false);
            }
        }

        $banners = $query->ordered()->paginate(20)->withQueryString();

        return Inertia::render('admin/banners/index', [
            'banners' => $banners,
            'filters' => array_merge($request->only(['search', 'type', 'status']), ['vertical' => $vertical]),
            'typeOptions' => Banner::typeOptions(),
            'verticalOptions' => array_merge(['' => 'All verticals'], Banner::verticalOptions()),
        ]);
    }

    /**
     * Show create banner form.
     */
    public function create(): Response
    {
        return Inertia::render('admin/banners/create', [
            'typeOptions' => Banner::typeOptions(),
            'linkTypeOptions' => Banner::linkTypeOptions(),
            'verticalOptions' => Banner::verticalOptions(),
            'zones' => Zone::active()->select('id', 'name')->get(),
        ]);
    }

    /**
     * Store new banner.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:home,category,product,promotional'],
            'vertical' => ['required', 'string', Rule::in(array_merge(BusinessVertical::values(), [Banner::VERTICAL_BOTH]))],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['required', 'string', 'url'],
            'image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'mobile_image' => ['nullable', 'string', 'url'],
            'mobile_image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'link_url' => ['nullable', 'string', 'url'],
            'link_type' => ['required', 'in:product,category,collection,external,none'],
            'link_id' => ['nullable', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'zones' => ['nullable', 'array'],
        ]);

        // Handle image file upload if provided
        if ($request->hasFile('image_file')) {
            $validated['image'] = $this->handleImageUpload(
                null,
                $request->file('image_file'),
                'banners'
            );
        }

        // Handle mobile image file upload if provided
        if ($request->hasFile('mobile_image_file')) {
            $validated['mobile_image'] = $this->handleImageUpload(
                null,
                $request->file('mobile_image_file'),
                'banners/mobile'
            );
        }

        // Remove file fields from validated data
        unset($validated['image_file'], $validated['mobile_image_file']);

        Banner::create($validated);

        return redirect()->route('admin.banners.index')
            ->with('success', 'Banner created successfully.');
    }

    /**
     * Display banner details.
     */
    public function show(Banner $banner): Response
    {
        return Inertia::render('admin/banners/show', [
            'banner' => $banner,
            'typeOptions' => Banner::typeOptions(),
            'linkTypeOptions' => Banner::linkTypeOptions(),
        ]);
    }

    /**
     * Show edit banner form.
     */
    public function edit(Banner $banner): Response
    {
        return Inertia::render('admin/banners/edit', [
            'banner' => $banner,
            'typeOptions' => Banner::typeOptions(),
            'linkTypeOptions' => Banner::linkTypeOptions(),
            'verticalOptions' => Banner::verticalOptions(),
            'zones' => Zone::active()->select('id', 'name')->get(),
        ]);
    }

    /**
     * Update banner.
     */
    public function update(Request $request, Banner $banner): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:home,category,product,promotional'],
            'vertical' => ['required', 'string', Rule::in(array_merge(BusinessVertical::values(), [Banner::VERTICAL_BOTH]))],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['required', 'string', 'url'],
            'image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'mobile_image' => ['nullable', 'string', 'url'],
            'mobile_image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'link_url' => ['nullable', 'string', 'url'],
            'link_type' => ['required', 'in:product,category,collection,external,none'],
            'link_id' => ['nullable', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'zones' => ['nullable', 'array'],
        ]);

        // Handle image file upload if provided
        if ($request->hasFile('image_file')) {
            // Delete old image
            $this->deleteOldImage($banner->image);
            $validated['image'] = $this->handleImageUpload(
                null,
                $request->file('image_file'),
                'banners'
            );
        }

        // Handle mobile image file upload if provided
        if ($request->hasFile('mobile_image_file')) {
            // Delete old mobile image
            $this->deleteOldImage($banner->mobile_image);
            $validated['mobile_image'] = $this->handleImageUpload(
                null,
                $request->file('mobile_image_file'),
                'banners/mobile'
            );
        }

        // Remove file fields from validated data
        unset($validated['image_file'], $validated['mobile_image_file']);

        $banner->update($validated);

        return redirect()->route('admin.banners.index')
            ->with('success', 'Banner updated successfully.');
    }

    /**
     * Delete banner.
     */
    public function destroy(Banner $banner): RedirectResponse
    {
        $banner->delete();

        return redirect()->route('admin.banners.index')
            ->with('success', 'Banner deleted successfully.');
    }

    /**
     * Toggle banner status.
     */
    public function toggleStatus(Banner $banner): RedirectResponse
    {
        $banner->update(['is_active' => ! $banner->is_active]);

        $status = $banner->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Banner {$status}.");
    }

    /**
     * Update display order.
     */
    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'banners' => ['required', 'array'],
            'banners.*.id' => ['required', 'exists:banners,id'],
            'banners.*.display_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($validated['banners'] as $item) {
            Banner::where('id', $item['id'])->update(['display_order' => $item['display_order']]);
        }

        return back()->with('success', 'Banner order updated.');
    }
}
