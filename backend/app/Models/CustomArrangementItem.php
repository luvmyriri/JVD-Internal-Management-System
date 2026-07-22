<?php
namespace App\Models;
class CustomArrangementItem extends SalesFulfillment
{
    protected function casts(): array { return ['target_starts_at'=>'datetime','target_ends_at'=>'datetime','deliverables'=>'array','supplier_cost'=>'decimal:2']; }
}
