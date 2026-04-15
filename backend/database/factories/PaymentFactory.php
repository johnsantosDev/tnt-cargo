<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'reference' => 'PAY-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3))),
            'shipment_id' => Shipment::factory(),
            'client_id' => Client::factory(),
            'amount' => fake()->randomFloat(2, 50, 5000),
            'currency' => 'USD',
            'method' => fake()->randomElement(['cash', 'bank_transfer', 'mobile_money', 'check']),
            'type' => 'income',
            'status' => 'completed',
            'payment_date' => now(),
            'notes' => fake()->optional()->sentence(),
            'region' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'created_by' => User::factory(),
        ];
    }
}
