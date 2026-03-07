<?php

namespace App\Http\Controllers;

use App\Enums\BusinessVertical;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    /**
     * Get active banners (filtered by zone if provided).
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->get('type', Banner::TYPE_HOME);
        $zoneId = $request->get('zone_id');
        $vertical = $request->string('vertical', BusinessVertical::DailyFresh->value)->toString();

        if (! in_array($vertical, BusinessVertical::values(), true)) {
            $vertical = BusinessVertical::DailyFresh->value;
        }

        $banners = Banner::current()
            ->byType($type)
            ->forVertical($vertical)
            ->byZone($zoneId)
            ->ordered()
            ->get()
            ->map(fn (Banner $banner) => [
                'id' => $banner->id,
                'title' => $banner->title,
                'description' => $banner->description,
                'image' => $banner->getImageUrl(),
                'mobile_image' => $banner->getMobileImageUrl(),
                'link' => $banner->getLink(),
                'link_type' => $banner->link_type,
                'vertical' => $banner->vertical,
            ]);

        return response()->json(['banners' => $banners]);
    }
}
