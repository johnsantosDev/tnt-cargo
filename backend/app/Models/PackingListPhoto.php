<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackingListPhoto extends Model
{
    protected $fillable = [
        'packing_list_id', 'file_path', 'original_name', 'sort_order',
    ];

    public function packingList(): BelongsTo
    {
        return $this->belongsTo(PackingList::class);
    }
}
