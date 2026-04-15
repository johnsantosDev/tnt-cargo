<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\ShipmentStatusSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Client $client;
    private Shipment $shipment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ShipmentStatusSeeder::class);
        $this->user = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->user->assignRole('admin');
        $this->client = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->user->id]);
        $this->shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
            'total_cost' => 1000,
            'amount_paid' => 0,
            'balance_due' => 1000,
        ]);
    }

    public function test_can_list_payments(): void
    {
        Payment::factory()->count(3)->create([
            'client_id' => $this->client->id,
            'shipment_id' => $this->shipment->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/payments');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_payment(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments', [
                'shipment_id' => $this->shipment->id,
                'client_id' => $this->client->id,
                'amount' => 500,
                'currency' => 'USD',
                'method' => 'cash',
                'type' => 'income',
                'status' => 'completed',
                'payment_date' => now()->toDateString(),
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['payment' => ['id', 'reference']]);

        $this->assertDatabaseHas('payments', [
            'client_id' => $this->client->id,
            'amount' => 500,
        ]);
    }

    public function test_payment_updates_shipment_balance(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments', [
                'shipment_id' => $this->shipment->id,
                'client_id' => $this->client->id,
                'amount' => 400,
                'currency' => 'USD',
                'method' => 'cash',
                'type' => 'income',
                'status' => 'completed',
                'payment_date' => now()->toDateString(),
            ]);

        $this->shipment->refresh();
        $this->assertEquals(400.00, (float) $this->shipment->amount_paid);
        $this->assertEquals(600.00, (float) $this->shipment->balance_due);
    }

    public function test_payment_amount_is_required(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments', [
                'shipment_id' => $this->shipment->id,
                'client_id' => $this->client->id,
                'method' => 'cash',
                'type' => 'income',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_can_show_payment(): void
    {
        $payment = Payment::factory()->create([
            'client_id' => $this->client->id,
            'shipment_id' => $this->shipment->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/payments/{$payment->id}");

        $response->assertOk()
            ->assertJsonPath('id', $payment->id);
    }

    public function test_can_filter_payments_by_client(): void
    {
        Payment::factory()->create([
            'client_id' => $this->client->id,
            'shipment_id' => $this->shipment->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $otherClient = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->user->id]);
        Payment::factory()->create([
            'client_id' => $otherClient->id,
            'shipment_id' => $this->shipment->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/payments?client_id={$this->client->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }
}
