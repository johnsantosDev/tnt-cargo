<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\ShipmentStatusSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ShipmentStatusSeeder::class);
        $this->user = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->user->assignRole('admin');
        $this->client = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->user->id]);
    }

    public function test_can_list_shipments(): void
    {
        Shipment::factory()->count(3)->create([
            'region' => 'Goma',
            'client_id' => $this->client->id,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/shipments');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_shipment(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/shipments', [
                'client_id' => $this->client->id,
                'origin' => 'china',
                'destination' => 'Goma',
                'description' => 'Colis test',
                'weight' => 25.5,
                'volume' => 1.2,
                'quantity' => 5,
                'shipping_cost' => 500,
                'customs_fee' => 50,
                'receiver_name' => 'Jean Test',
                'receiver_phone' => '0991234567',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['shipment' => ['id', 'tracking_number']]);

        $this->assertDatabaseHas('shipments', [
            'client_id' => $this->client->id,
            'description' => 'Colis test',
        ]);
    }

    public function test_shipment_requires_client_id(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/shipments', [
                'origin' => 'china',
                'destination' => 'Goma',
                'description' => 'Test',
                'weight' => 10,
                'shipping_cost' => 200,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['client_id']);
    }

    public function test_can_show_shipment(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/shipments/{$shipment->id}");

        $response->assertOk()
            ->assertJsonPath('id', $shipment->id);
    }

    public function test_can_update_shipment(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/shipments/{$shipment->id}", [
                'description' => 'Updated description',
                'weight' => 30,
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'description' => 'Updated description',
        ]);
    }

    public function test_can_update_shipment_status(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $warehouseStatus = ShipmentStatus::where('slug', 'warehouse')->first();

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/shipments/{$shipment->id}/status", [
                'status_id' => $warehouseStatus->id,
                'comment' => 'Arrived at warehouse',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'status_id' => $warehouseStatus->id,
        ]);
    }

    public function test_can_track_shipment_publicly(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->getJson("/api/track/{$shipment->tracking_number}");

        $response->assertOk()
            ->assertJsonPath('shipment.tracking_number', $shipment->tracking_number);
    }

    public function test_can_track_shipment_by_share_token(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->getJson("/api/track/share/{$shipment->share_token}");

        $response->assertOk()
            ->assertJsonPath('shipment.tracking_number', $shipment->tracking_number);
    }

    public function test_tracking_returns_404_for_invalid_number(): void
    {
        $response = $this->getJson('/api/track/INVALID-NUMBER');

        $response->assertStatus(404);
    }

    public function test_can_delete_shipment(): void
    {
        $shipment = Shipment::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/shipments/{$shipment->id}");

        $response->assertOk();
        $this->assertSoftDeleted('shipments', ['id' => $shipment->id]);
    }
}
