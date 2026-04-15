<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        $shippingCost = fake()->randomFloat(2, 50, 5000);
        $customsFee = fake()->randomFloat(2, 0, 500);

        return [
            'tracking_number' => 'TNT-' . date('Ym') . '-' . strtoupper(bin2hex(random_bytes(3))),
            'share_token' => bin2hex(random_bytes(16)),
            'client_id' => Client::factory(),
            'status_id' => fn () => ShipmentStatus::where('slug', 'purchased')->first()?->id ?? 1,
            'origin' => fake()->randomElement(['china', 'dubai', 'turkey']),
            'destination' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'description' => fake()->sentence(),
            'weight' => fake()->randomFloat(2, 1, 500),
            'volume' => fake()->randomFloat(2, 0.01, 10),
            'quantity' => fake()->numberBetween(1, 50),
            'shipping_cost' => $shippingCost,
            'customs_fee' => $customsFee,
            'warehouse_fee' => 0,
            'other_fees' => 0,
            'total_cost' => $shippingCost + $customsFee,
            'amount_paid' => 0,
            'balance_due' => $shippingCost + $customsFee,
            'is_fragile' => false,
            'is_insured' => false,
            'region' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'created_by' => User::factory(),
        ];
    }
}
