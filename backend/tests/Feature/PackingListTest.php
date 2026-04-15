<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\PackingList;
use App\Models\PackingListItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class PackingListTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Artisan::call('view:clear');
        $this->user = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->user->assignRole('admin');
        $this->client = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->user->id]);
    }

    public function test_can_list_packing_lists(): void
    {
        PackingList::factory()->count(3)->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/packing-lists');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_packing_list(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/packing-lists', [
                'client_id' => $this->client->id,
                'price_per_cbm' => 250,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['packing_list' => ['id', 'reference']]);

        $this->assertDatabaseHas('packing_lists', [
            'client_id' => $this->client->id,
            'status' => 'draft',
        ]);
    }

    public function test_can_create_packing_list_with_items(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/packing-lists', [
                'client_id' => $this->client->id,
                'price_per_cbm' => 250,
                'items' => [
                    [
                        'description' => 'Laptop',
                        'quantity' => 2,
                        'unit_price' => 500,
                        'weight' => 3.5,
                        'length' => 40,
                        'width' => 30,
                        'height' => 5,
                    ],
                    [
                        'description' => 'Monitor',
                        'quantity' => 1,
                        'unit_price' => 300,
                        'weight' => 5,
                    ],
                ],
            ]);

        $response->assertStatus(201);
        $plId = $response->json('packing_list.id');
        $this->assertDatabaseCount('packing_list_items', 2);
        $this->assertDatabaseHas('packing_list_items', [
            'packing_list_id' => $plId,
            'description' => 'Laptop',
        ]);
    }

    public function test_can_add_item_to_packing_list(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/packing-lists/{$pl->id}/items", [
                'description' => 'Test Item',
                'quantity' => 3,
                'unit_price' => 100,
                'weight' => 2,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('packing_list_items', [
            'packing_list_id' => $pl->id,
            'description' => 'Test Item',
        ]);
    }

    public function test_can_update_item(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);
        $item = PackingListItem::factory()->create(['packing_list_id' => $pl->id]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/packing-lists/{$pl->id}/items/{$item->id}", [
                'description' => 'Updated Item',
                'quantity' => 5,
                'unit_price' => 200,
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('packing_list_items', [
            'id' => $item->id,
            'description' => 'Updated Item',
        ]);
    }

    public function test_can_remove_item(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);
        $item = PackingListItem::factory()->create(['packing_list_id' => $pl->id]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/packing-lists/{$pl->id}/items/{$item->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('packing_list_items', ['id' => $item->id]);
    }

    public function test_can_download_packing_list_receipt(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);
        PackingListItem::factory()->count(2)->create(['packing_list_id' => $pl->id]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/packing-lists/{$pl->id}/receipt");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_can_download_item_receipt(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);
        $item = PackingListItem::factory()->create(['packing_list_id' => $pl->id]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/packing-lists/{$pl->id}/items/{$item->id}/receipt");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_can_finalize_packing_list(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);
        PackingListItem::factory()->count(2)->create(['packing_list_id' => $pl->id]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/packing-lists/{$pl->id}/finalize");

        $response->assertOk();
        $this->assertDatabaseHas('packing_lists', [
            'id' => $pl->id,
            'status' => 'finalized',
        ]);
    }

    public function test_can_show_packing_list(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/packing-lists/{$pl->id}");

        $response->assertOk()
            ->assertJsonPath('id', $pl->id);
    }

    public function test_can_delete_packing_list(): void
    {
        $pl = PackingList::factory()->create([
            'client_id' => $this->client->id,
            'region' => 'Goma',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/packing-lists/{$pl->id}");

        $response->assertOk();
        $this->assertSoftDeleted('packing_lists', ['id' => $pl->id]);
    }
}
