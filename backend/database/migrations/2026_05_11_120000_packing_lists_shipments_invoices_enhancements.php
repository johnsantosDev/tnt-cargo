<?php

use App\Models\Shipment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packing_lists', function (Blueprint $table) {
            $table->unsignedInteger('parcel_count')->default(1)->after('shipment_id');
            $table->decimal('gross_weight_kg', 10, 2)->nullable()->after('parcel_count');
            $table->decimal('header_cbm', 10, 4)->default(0)->after('gross_weight_kg');
        });

        Schema::create('packing_list_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('packing_list_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->decimal('pl_cargo_subtotal', 15, 2)->default(0)->after('other_fees');
            $table->decimal('pl_freight_subtotal', 15, 2)->default(0)->after('pl_cargo_subtotal');
            $table->json('calculation_lines')->nullable()->after('pl_freight_subtotal');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('magerwa_price', 15, 2)->default(0)->after('discount_amount');
            $table->json('auxiliary_fees')->nullable()->after('magerwa_price');
            $table->foreignId('cash_advance_id')->nullable()->after('auxiliary_fees')->constrained('cash_advances')->nullOnDelete();
            $table->decimal('cash_advance_amount', 15, 2)->default(0)->after('cash_advance_id');
        });

        // Legacy: packing lists with CBM set but no line items used header-style CBM
        DB::table('packing_lists as pl')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw('1'))
                    ->from('packing_list_items as i')
                    ->whereColumn('i.packing_list_id', 'pl.id');
            })
            ->where('total_cbm', '>', 0)
            ->update(['header_cbm' => DB::raw('total_cbm')]);

        Shipment::query()->orderBy('id')->chunk(100, function ($shipments) {
            foreach ($shipments as $shipment) {
                if ($shipment->packingLists()->exists()) {
                    $shipment->syncTotalsFromPackingLists();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['cash_advance_id']);
            $table->dropColumn(['magerwa_price', 'auxiliary_fees', 'cash_advance_id', 'cash_advance_amount']);
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['pl_cargo_subtotal', 'pl_freight_subtotal', 'calculation_lines']);
        });

        Schema::dropIfExists('packing_list_photos');

        Schema::table('packing_lists', function (Blueprint $table) {
            $table->dropColumn(['parcel_count', 'gross_weight_kg', 'header_cbm']);
        });
    }
};
