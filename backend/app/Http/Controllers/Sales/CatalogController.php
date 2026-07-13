<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index()
    {
        return response()->json([
            'categories' => ServiceCategory::all()
        ]);
    }
}
