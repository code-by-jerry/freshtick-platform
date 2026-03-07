<?php

namespace App\Http\Requests\Admin;

use App\Enums\BusinessVertical;
use App\Models\Collection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('admin');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $collection = $this->route('collection');
        $verticals = array_merge(BusinessVertical::values(), [Collection::VERTICAL_BOTH]);
        $productModes = array_keys(Collection::productSelectionOptions());
        $categoryModes = array_keys(Collection::categorySelectionOptions());

        $rules = [
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('collections', 'name')->ignore($collection->id)],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('collections', 'slug')->ignore($collection->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'product_selection_mode' => ['required', 'string', Rule::in($productModes)],
            'category_selection_mode' => ['required', 'string', Rule::in($categoryModes)],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'distinct', 'exists:products,id'],
            'random_products_limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'banner_image' => ['nullable', 'string', 'max:500'],
            'banner_image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'banner_mobile_image' => ['nullable', 'string', 'max:500'],
            'banner_mobile_image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'vertical' => ['nullable', 'string', Rule::in($verticals)],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'link_url' => ['nullable', 'string', 'max:500'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ];

        if ($this->input('category_selection_mode') === Collection::CATEGORY_SELECTION_SELECTED) {
            $rules['category_ids'][] = 'min:1';
        }

        if ($this->input('product_selection_mode') === Collection::PRODUCT_SELECTION_MANUAL) {
            $rules['product_ids'][] = 'min:1';
        }

        return $rules;
    }

    protected function prepareForValidation(): void
    {
        $rawCategoryIds = $this->input('category_ids', []);
        $rawProductIds = $this->input('product_ids', []);

        $this->merge([
            'product_selection_mode' => $this->input('product_selection_mode', Collection::PRODUCT_SELECTION_CATEGORY),
            'category_selection_mode' => $this->input('category_selection_mode', Collection::CATEGORY_SELECTION_ALL),
            'random_products_limit' => (int) $this->input('random_products_limit', 12),
            'category_ids' => array_values(array_filter(array_map('intval', is_array($rawCategoryIds) ? $rawCategoryIds : []))),
            'product_ids' => array_values(array_filter(array_map('intval', is_array($rawProductIds) ? $rawProductIds : []))),
        ]);
    }
}
