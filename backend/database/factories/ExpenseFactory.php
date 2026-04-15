<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'reference' => 'EXP-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3))),
            'category' => fake()->randomElement(['transport', 'salaires', 'loyer', 'fournitures', 'communication']),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 20, 3000),
            'currency' => 'USD',
            'status' => 'approved',
            'expense_date' => now(),
            'region' => fake()->randomElement(['Goma', 'Kinshasa', 'Lubumbashi']),
            'created_by' => User::factory(),
        ];
    }
}
