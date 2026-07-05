<?php

namespace App\Traits;

use App\Models\Document;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

trait HasDocuments
{
    /**
     * Get all of the documents for the model.
     */
    public function documents(): MorphToMany
    {
        return $this->morphToMany(Document::class, 'linkable', 'document_links');
    }
}
