<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PackingListItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'packing_list_id', 'description', 'quantity',
        'weight', 'length', 'width', 'height', 'cbm',
        'unit_price', 'total_price', 'notes', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:2',
            'length' => 'decimal:2',
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'cbm' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
            'received_at' => 'date',
        ];
    }

    public function packingList()
    {
        return $this->belongsTo(PackingList::class);
    }

    public static function booted(): void
    {
        static::saving(function (PackingListItem $item) {
            if ($item->length && $item->width && $item->height) {
                $item->cbm = ($item->length * $item->width * $item->height) / 1000000;
            }
            $item->total_price = $item->quantity * $item->unit_price;
        });
    }
}
