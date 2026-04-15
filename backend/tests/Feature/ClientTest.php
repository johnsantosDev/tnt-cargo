<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->user = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->user->assignRole('admin');
    }

    public function test_can_list_clients(): void
    {
        Client::factory()->count(3)->create(['region' => 'Goma']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/clients');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_client(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/clients', [
                'name' => 'Jean Dupont',
                'email' => 'jean@example.com',
                'phone' => '0991234567',
                'phone_code' => '+243',
                'city' => 'Goma',
                'country' => 'RDC',
                'type' => 'regular',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('client.name', 'Jean Dupont');

        $this->assertDatabaseHas('clients', ['name' => 'Jean Dupont', 'email' => 'jean@example.com']);
    }

    public function test_client_name_is_required(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/clients', [
                'email' => 'test@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_show_client(): void
    {
        $client = Client::factory()->create(['region' => 'Goma']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/clients/{$client->id}");

        $response->assertOk()
            ->assertJsonPath('id', $client->id);
    }

    public function test_can_update_client(): void
    {
        $client = Client::factory()->create(['region' => 'Goma']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/clients/{$client->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertOk()
            ->assertJsonPath('client.name', 'Updated Name');
    }

    public function test_can_delete_client(): void
    {
        $client = Client::factory()->create(['region' => 'Goma']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}");

        $response->assertOk();
        $this->assertSoftDeleted('clients', ['id' => $client->id]);
    }

    public function test_can_search_clients(): void
    {
        Client::factory()->create(['name' => 'Alpha Client', 'region' => 'Goma']);
        Client::factory()->create(['name' => 'Beta Client', 'region' => 'Goma']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/clients?search=Alpha');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_region_filtering_works(): void
    {
        Client::factory()->create(['region' => 'Goma']);
        Client::factory()->create(['region' => 'Kinshasa']);

        // Admin can see all (no region filter applied for managers)
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/clients');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }
}
