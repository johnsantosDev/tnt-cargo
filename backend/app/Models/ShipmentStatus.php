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

    public static function resolveDefaultStatus(): ?ShipmentStatus
    {
        return static::where('is_default', true)->first()
            ?? static::where('is_active', true)->orderBy('order')->first()
            ?? static::orderBy('order')->first();
    }

    public static function resolveDefaultStatusId(): ?int
    {
        $status = static::resolveDefaultStatus();

        if (!$status) {
            $status = static::create([
                'name' => 'Nouveau',
                'slug' => 'new',
                'color' => 'gray',
                'icon' => 'truck',
                'order' => 1,
                'is_default' => true,
                'is_active' => true,
            ]);
        }

        return $status?->id;
    }
}
