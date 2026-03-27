<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentStatus extends Model
{
    protected $fillable = [
        'name', 'slug', 'color', 'icon', 'order', 'is_default', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'status_id');
    }
}
