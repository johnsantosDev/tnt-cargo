<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('##########'),
            'phone_code' => '+243',
            'company' => fake()->optional()->company(),
            'address' => fake()->optional()->address(),
            'city' => fake()->city(),
            'country' => 'RDC',
            'type' => fake()->randomElement(['vip', 'regular', 'new']),
            'notes' => fake()->optional()->sentence(),
            'total_spent' => 0,
            'total_debt' => 0,
            'shipment_count' => 0,
            'is_active' => true,
            'region' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'created_by' => User::factory(),
        ];
    }
}
