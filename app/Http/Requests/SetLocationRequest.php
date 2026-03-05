<?php

namespace App\Http\Requests;

use App\Models\UserAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SetLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from_navbar' => ['sometimes', 'boolean'],
            'type' => ['sometimes', 'string', Rule::in([UserAddress::TYPE_HOME, UserAddress::TYPE_WORK, UserAddress::TYPE_OTHER])],
            'label' => ['nullable', 'string', 'max:100'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'address_line_1.required' => 'Please select a valid location on the map.',
            'city.required' => 'City is required for delivery.',
            'state.required' => 'State is required for delivery.',
            'latitude.required' => 'Please pick your location on the map.',
            'longitude.required' => 'Please pick your location on the map.',
        ];
    }
}
