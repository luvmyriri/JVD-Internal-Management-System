<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Models\Service;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index()
    {
        return response()->json([
            'service_types' => collect(config('service_types'))->map(
                fn (array $type, string $code) => ['code' => $code, ...$type]
            )->values(),
            'legacy_categories' => ServiceCategory::all(),
            'services' => Service::where('is_active', true)->where('is_sales_catalog', true)->orderBy('name')->get([
                'id', 'name', 'description', 'category', 'service_type', 'price', 'adult_price', 'child_price', 'max_pax',
            ]),
            // Temporary alias for the unfinished legacy CheckoutWizard.
            'categories' => ServiceCategory::all(),
        ]);
    }
}
