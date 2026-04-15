<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\PackingList;
use App\Models\PackingListItem;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\Transfer;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\ShipmentStatusSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ShipmentStatusSeeder::class);
    }

    public function test_shipment_generates_tracking_number(): void
    {
        $trackingNumber = Shipment::generateTrackingNumber();

        $this->assertStringStartsWith('TNT-', $trackingNumber);
    }

    public function test_shipment_generates_share_token(): void
    {
        $token = Shipment::generateShareToken();

        $this->assertNotEmpty($token);
        $this->assertEquals(32, strlen($token));
    }

    public function test_shipment_calculates_total_cost(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'shipping_cost' => 500,
            'customs_fee' => 100,
            'warehouse_fee' => 50,
            'other_fees' => 25,
            'created_by' => $user->id,
        ]);

        $shipment->calculateTotalCost();

        $this->assertEquals(675.00, (float) $shipment->total_cost);
    }

    public function test_shipment_belongs_to_client(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $this->assertInstanceOf(Client::class, $shipment->client);
        $this->assertEquals($client->id, $shipment->client->id);
    }

    public function test_client_has_many_shipments(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        Shipment::factory()->count(3)->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $this->assertCount(3, $client->shipments);
    }

    public function test_transfer_generates_reference(): void
    {
        $reference = Transfer::generateReference();

        $this->assertStringStartsWith('TRF-', $reference);
    }

    public function test_transfer_generates_transfer_code(): void
    {
        $code = Transfer::generateTransferCode();

        $this->assertStringStartsWith('XFER-', $code);
    }

    public function test_transfer_generates_qr_token(): void
    {
        $token = Transfer::generateQrToken();

        $this->assertNotEmpty($token);
        $this->assertEquals(32, strlen($token));
    }

    public function test_transfer_belongs_to_client(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $transfer = Transfer::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $this->assertInstanceOf(Client::class, $transfer->client);
    }

    public function test_payment_generates_reference(): void
    {
        $reference = Payment::generateReference();

        $this->assertStringStartsWith('PAY-', $reference);
    }

    public function test_payment_belongs_to_shipment(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);
        $payment = Payment::factory()->create([
            'shipment_id' => $shipment->id,
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $this->assertInstanceOf(Shipment::class, $payment->shipment);
    }

    public function test_packing_list_generates_reference(): void
    {
        $reference = PackingList::generateReference();

        $this->assertStringStartsWith('PL-', $reference);
    }

    public function test_packing_list_has_many_items(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $pl = PackingList::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);
        PackingListItem::factory()->count(3)->create(['packing_list_id' => $pl->id]);

        $this->assertCount(3, $pl->items);
    }

    public function test_packing_list_item_calculates_cbm_on_save(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $pl = PackingList::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $item = PackingListItem::create([
            'packing_list_id' => $pl->id,
            'description' => 'Test Box',
            'quantity' => 1,
            'unit_price' => 100,
            'length' => 100,
            'width' => 50,
            'height' => 40,
        ]);

        // CBM = (100 * 50 * 40) / 1000000 = 0.2
        $this->assertEquals(0.2, (float) $item->cbm);
    }

    public function test_packing_list_item_calculates_total_price(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $pl = PackingList::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $item = PackingListItem::create([
            'packing_list_id' => $pl->id,
            'description' => 'Widget',
            'quantity' => 5,
            'unit_price' => 30,
        ]);

        $this->assertEquals(150, (float) $item->total_price);
    }

    public function test_packing_list_recalculates_totals(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $pl = PackingList::factory()->create([
            'client_id' => $client->id,
            'price_per_cbm' => 200,
            'created_by' => $user->id,
        ]);

        PackingListItem::create([
            'packing_list_id' => $pl->id,
            'description' => 'Item A',
            'quantity' => 2,
            'unit_price' => 100,
            'weight' => 5,
            'length' => 100,
            'width' => 100,
            'height' => 100,
        ]);

        $pl->recalculateTotals();

        $this->assertGreaterThan(0, (float) $pl->total_amount);
        $this->assertGreaterThan(0, (float) $pl->total_cbm);
    }

    public function test_user_has_roles(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->assertTrue($user->hasRole('admin'));
        $this->assertFalse($user->hasRole('agent'));
    }

    public function test_soft_delete_works_on_shipment(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);
        $shipment = Shipment::factory()->create([
            'client_id' => $client->id,
            'created_by' => $user->id,
        ]);

        $shipment->delete();

        $this->assertSoftDeleted('shipments', ['id' => $shipment->id]);
        $this->assertNull(Shipment::find($shipment->id));
        $this->assertNotNull(Shipment::withTrashed()->find($shipment->id));
    }

    public function test_soft_delete_works_on_client(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['created_by' => $user->id]);

        $client->delete();

        $this->assertSoftDeleted('clients', ['id' => $client->id]);
    }
}
