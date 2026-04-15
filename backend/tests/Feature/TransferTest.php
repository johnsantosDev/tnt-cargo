<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Transfer;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $agent;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->admin->assignRole('admin');
        $this->agent = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->agent->assignRole('agent');
        $this->client = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->admin->id]);
    }

    public function test_can_list_transfers(): void
    {
        Transfer::factory()->count(3)->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/transfers');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_transfer(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/transfers', [
                'client_id' => $this->client->id,
                'client_name' => 'Jean Dupont',
                'client_phone' => '0991234567',
                'amount' => 500,
                'currency' => 'USD',
                'origin_region' => 'Goma',
                'destination_region' => 'Kinshasa',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['transfer' => ['id', 'reference', 'transfer_code']]);

        $this->assertDatabaseHas('transfers', [
            'client_id' => $this->client->id,
            'amount' => 500,
            'status' => 'pending_approval',
        ]);
    }

    public function test_transfer_requires_amount(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/transfers', [
                'client_name' => 'Test',
                'client_phone' => '0991234567',
                'origin_region' => 'Goma',
                'destination_region' => 'Kinshasa',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_can_show_transfer(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/transfers/{$transfer->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $transfer->id);
    }

    public function test_admin_can_approve_transfer(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/approve");

        $response->assertOk();
        $this->assertDatabaseHas('transfers', [
            'id' => $transfer->id,
            'status' => 'approved',
        ]);
    }

    public function test_cannot_approve_non_pending_transfer(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/approve");

        $response->assertStatus(422);
    }

    public function test_can_complete_approved_transfer(): void
    {
        $transfer = Transfer::factory()->approved()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
            'approved_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/complete", [
                'notes' => 'Delivered to recipient',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('transfers', [
            'id' => $transfer->id,
            'status' => 'completed',
        ]);
    }

    public function test_cannot_complete_pending_transfer(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/complete");

        $response->assertStatus(422);
    }

    public function test_admin_can_reject_transfer(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/reject", [
                'notes' => 'Invalid transfer',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('transfers', [
            'id' => $transfer->id,
            'status' => 'rejected',
        ]);
    }

    public function test_can_verify_transfer_by_qr_token(): void
    {
        $transfer = Transfer::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->get("/api/transfers/verify/{$transfer->qr_token}");

        $response->assertOk();
    }

    public function test_transfer_workflow_end_to_end(): void
    {
        // Create
        $createResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/transfers', [
                'client_id' => $this->client->id,
                'client_name' => 'Jean Workflow',
                'client_phone' => '0991234567',
                'amount' => 1000,
                'currency' => 'USD',
                'origin_region' => 'Goma',
                'destination_region' => 'Lubumbashi',
            ]);

        $createResponse->assertStatus(201);
        $transferId = $createResponse->json('transfer.id');

        // Approve
        $approveResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transferId}/approve");
        $approveResponse->assertOk();

        // Complete
        $completeResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/transfers/{$transferId}/complete", [
                'notes' => 'Successfully delivered',
            ]);
        $completeResponse->assertOk();

        $this->assertDatabaseHas('transfers', [
            'id' => $transferId,
            'status' => 'completed',
        ]);
    }
}
