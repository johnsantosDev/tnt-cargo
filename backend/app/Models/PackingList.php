<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PackingList extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference', 'client_id', 'shipment_id', 'status',
        'total_cbm', 'total_weight', 'total_amount',
        'price_per_cbm', 'shipping_cost', 'additional_fees', 'fees_description',
        'notes', 'created_by', 'finalized_at',
    ];

    protected function casts(): array
    {
        return [
            'total_cbm' => 'decimal:4',
            'total_weight' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'price_per_cbm' => 'decimal:2',
            'shipping_cost' => 'decimal:2',
            'additional_fees' => 'decimal:2',
            'finalized_at' => 'date',
        ];
    }

    public static function generateReference(): string
    {
        do {
            $ref = 'PL-' . date('Ym') . '-' . str_pad(
                static::whereYear('created_at', date('Y'))
                    ->whereMonth('created_at', date('m'))
                    ->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );
        } while (static::where('reference', $ref)->exists());
        return $ref;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function items()
    {
        return $this->hasMany(PackingListItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recalculateTotals(): void
    {
        $this->total_cbm = $this->items()->selectRaw('COALESCE(SUM(cbm * quantity), 0) as total')->value('total');
        $this->total_weight = $this->items()->selectRaw('COALESCE(SUM(COALESCE(weight, 0) * quantity), 0) as total')->value('total');
        $this->total_amount = $this->items()->sum('total_price');
        $this->shipping_cost = $this->total_cbm * $this->price_per_cbm;
        $this->save();
    }
}
