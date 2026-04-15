<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\PackingList;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PackingListFactory extends Factory
{
    protected $model = PackingList::class;

    public function definition(): array
    {
        return [
            'reference' => 'PL-' . date('Ym') . '-' . str_pad(fake()->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
            'client_id' => Client::factory(),
            'status' => 'draft',
            'total_cbm' => 0,
            'total_weight' => 0,
            'total_amount' => 0,
            'price_per_cbm' => fake()->randomFloat(2, 100, 500),
            'shipping_cost' => 0,
            'additional_fees' => 0,
            'region' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'created_by' => User::factory(),
        ];
    }

    public function finalized(): static
    {
        return $this->state(fn () => [
            'status' => 'finalized',
            'finalized_at' => now(),
        ]);
    }
}
