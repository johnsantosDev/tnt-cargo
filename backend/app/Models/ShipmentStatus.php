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

    /**
     * Seed the canonical workflow statuses (idempotent) so callers can rely on
     * slugs like "warehouse", "in-transit", "delivered" existing.
     */
    public static function ensureCanonicalSeeded(): void
    {
        $statuses = [
            ['name' => 'Achat effectué', 'slug' => 'purchased', 'color' => '#6366F1', 'icon' => 'shopping-cart', 'order' => 1, 'is_default' => false],
            ['name' => 'En entrepôt', 'slug' => 'warehouse', 'color' => '#F59E0B', 'icon' => 'warehouse', 'order' => 2, 'is_default' => true],
            ['name' => 'En transit', 'slug' => 'in-transit', 'color' => '#3B82F6', 'icon' => 'truck', 'order' => 3, 'is_default' => false],
            ['name' => 'En douane', 'slug' => 'customs', 'color' => '#EF4444', 'icon' => 'shield-check', 'order' => 4, 'is_default' => false],
            ['name' => 'Arrivé', 'slug' => 'arrived', 'color' => '#10B981', 'icon' => 'map-pin', 'order' => 5, 'is_default' => false],
            ['name' => 'Livré', 'slug' => 'delivered', 'color' => '#059669', 'icon' => 'check-circle', 'order' => 6, 'is_default' => false],
        ];

        foreach ($statuses as $status) {
            static::firstOrCreate(['slug' => $status['slug']], $status);
        }
    }

    /**
     * Status used when creating a new shipment. Prefers the "En entrepôt"
     * (warehouse) workflow step, with safe fallbacks if it isn't seeded yet.
     */
    public static function resolveInitialShipmentStatusId(): ?int
    {
        $warehouse = static::where('slug', 'warehouse')->where('is_active', true)->first();
        if ($warehouse) {
            return $warehouse->id;
        }

        static::ensureCanonicalSeeded();
        $warehouse = static::where('slug', 'warehouse')->first();
        if ($warehouse) {
            return $warehouse->id;
        }

        return static::resolveDefaultStatusId();
    }
}
