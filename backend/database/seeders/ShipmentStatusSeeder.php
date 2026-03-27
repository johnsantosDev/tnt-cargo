<?php

namespace Database\Seeders;

use App\Models\ShipmentStatus;
use Illuminate\Database\Seeder;

class ShipmentStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['name' => 'Achat effectué', 'slug' => 'purchased', 'color' => '#6366F1', 'icon' => 'shopping-cart', 'order' => 1, 'is_default' => true],
            ['name' => 'En entrepôt', 'slug' => 'warehouse', 'color' => '#F59E0B', 'icon' => 'warehouse', 'order' => 2],
            ['name' => 'En transit', 'slug' => 'in-transit', 'color' => '#3B82F6', 'icon' => 'truck', 'order' => 3],
            ['name' => 'En douane', 'slug' => 'customs', 'color' => '#EF4444', 'icon' => 'shield-check', 'order' => 4],
            ['name' => 'Arrivé', 'slug' => 'arrived', 'color' => '#10B981', 'icon' => 'map-pin', 'order' => 5],
            ['name' => 'Livré', 'slug' => 'delivered', 'color' => '#059669', 'icon' => 'check-circle', 'order' => 6],
        ];

        foreach ($statuses as $status) {
            ShipmentStatus::firstOrCreate(['slug' => $status['slug']], $status);
        }
    }
}
