<?php

namespace Database\Factories;

use App\Models\PackingList;
use App\Models\PackingListItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class PackingListItemFactory extends Factory
{
    protected $model = PackingListItem::class;

    public function definition(): array
    {
        $length = fake()->randomFloat(2, 10, 100);
        $width = fake()->randomFloat(2, 10, 100);
        $height = fake()->randomFloat(2, 10, 100);
        $quantity = fake()->numberBetween(1, 10);
        $unitPrice = fake()->randomFloat(2, 10, 500);

        return [
            'packing_list_id' => PackingList::factory(),
            'description' => fake()->words(3, true),
            'quantity' => $quantity,
            'weight' => fake()->randomFloat(2, 0.5, 50),
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'cbm' => ($length * $width * $height) / 1000000,
            'unit_price' => $unitPrice,
            'total_price' => $quantity * $unitPrice,
        ];
    }
}
