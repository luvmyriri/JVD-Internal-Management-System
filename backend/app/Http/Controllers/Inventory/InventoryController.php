<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\InventoryItemResource;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    /**
     * List inventory items — filterable by category and low_stock flag.
     */
    public function index(Request $request): JsonResponse
    {
        $query = InventoryItem::query();

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // ?low_stock=true surfaces items at or below their reorder level
        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'reorder_level');
        }

        if ($request->filled('search')) {
            $query->where('item_name', \DB::connection()->getDriverName() === 'sqlite' ? 'like' : 'ilike', '%' . $request->search . '%');
        }

        $items = $query->orderBy('category')
                       ->orderBy('item_name')
                       ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => InventoryItemResource::collection($items)->resolve(),
            'meta'    => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'low_stock_count' => InventoryItem::whereColumn('quantity', '<=', 'reorder_level')->count(),
            ],
        ]);
    }

    /**
     * Create a new inventory item.
     */
    public function store(\App\Http\Requests\Inventory\StoreInventoryItemRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $item = InventoryItem::create($validated);

        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($item),
            'message' => 'Inventory item created successfully.',
        ], 201);
    }

    /**
     * Get a single inventory item.
     */
    public function show($id): JsonResponse
    {
        $inventoryItem = InventoryItem::findOrFail($id);
        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($inventoryItem),
        ]);
    }

    /**
     * Update item details or adjust quantity.
     */
    public function update(\App\Http\Requests\Inventory\UpdateInventoryItemRequest $request, $id): JsonResponse
    {
        $inventoryItem = InventoryItem::findOrFail($id);
        
        $validated = $request->validated();

        $inventoryItem->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($inventoryItem->fresh()),
            'message' => 'Inventory item updated.',
        ]);
    }
}
