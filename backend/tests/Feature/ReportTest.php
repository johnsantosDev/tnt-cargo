<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\ShipmentStatusSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ShipmentStatusSeeder::class);
        $this->admin = User::factory()->create(['is_active' => true, 'region' => 'Goma']);
        $this->admin->assignRole('admin');
    }

    public function test_can_get_financial_report(): void
    {
        $client = Client::factory()->create(['region' => 'Goma', 'created_by' => $this->admin->id]);
        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        Payment::factory()->create([
            'client_id' => $client->id,
            'shipment_id' => $shipment->id,
            'amount' => 1000,
            'type' => 'income',
            'status' => 'completed',
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        Expense::factory()->create([
            'amount' => 200,
            'status' => 'approved',
            'region' => 'Goma',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/financial');

        $response->assertOk()
            ->assertJsonStructure(['summary' => ['total_revenue', 'total_expenses', 'net_profit'], 'chart']);
    }

    public function test_financial_report_with_date_filter(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/financial?start_date=' . now()->subMonth()->toDateString() . '&end_date=' . now()->toDateString());

        $response->assertOk();
    }

    public function test_can_get_shipments_report(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/shipments');

        $response->assertOk();
    }

    public function test_can_get_debts_report(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/debts');

        $response->assertOk();
    }

    public function test_can_get_transfers_report(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/transfers');

        $response->assertOk();
    }

    public function test_can_export_financial_report_pdf(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/financial?export=pdf');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_unauthenticated_cannot_access_reports(): void
    {
        $response = $this->getJson('/api/reports/financial');

        $response->assertStatus(401);
    }
}
