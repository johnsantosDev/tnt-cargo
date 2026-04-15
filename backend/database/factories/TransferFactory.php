<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Transfer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransferFactory extends Factory
{
    protected $model = Transfer::class;

    public function definition(): array
    {
        return [
            'reference' => 'TRF-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3))),
            'transfer_code' => 'XFER-' . strtoupper(bin2hex(random_bytes(4))),
            'qr_token' => bin2hex(random_bytes(16)),
            'client_id' => Client::factory(),
            'client_name' => fake()->name(),
            'client_phone' => fake()->numerify('##########'),
            'amount' => fake()->randomFloat(2, 100, 10000),
            'currency' => 'USD',
            'origin_region' => fake()->randomElement(['Goma', 'Kinshasa']),
            'destination_region' => fake()->randomElement(['Lubumbashi', 'Bukavu']),
            'region' => fake()->randomElement(['Goma', 'Kinshasa']),
            'status' => 'pending_approval',
            'created_by' => User::factory(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => 'approved',
            'approved_by' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'approved_by' => User::factory(),
            'approved_at' => now()->subDay(),
            'completed_by' => User::factory(),
            'completed_at' => now(),
        ]);
    }
}
