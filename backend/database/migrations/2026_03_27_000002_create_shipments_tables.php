<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('color')->default('#6B7280');
            $table->string('icon')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number')->unique();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('status_id')->constrained('shipment_statuses');
            $table->enum('origin', ['china', 'dubai', 'turkey', 'other'])->default('china');
            $table->string('origin_detail')->nullable();
            $table->string('destination')->default('Goma');
            $table->text('description')->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('volume', 10, 2)->nullable();
            $table->integer('quantity')->default(1);
            $table->string('package_type')->nullable();
            $table->decimal('declared_value', 15, 2)->nullable();
            $table->string('declared_currency', 3)->default('USD');
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('customs_fee', 15, 2)->default(0);
            $table->decimal('warehouse_fee', 15, 2)->default(0);
            $table->decimal('other_fees', 15, 2)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->date('estimated_arrival')->nullable();
            $table->date('actual_arrival')->nullable();
            $table->date('warehouse_entry_date')->nullable();
            $table->date('warehouse_exit_date')->nullable();
            $table->integer('warehouse_days')->default(0);
            $table->decimal('warehouse_daily_rate', 10, 2)->default(0);
            $table->text('special_instructions')->nullable();
            $table->boolean('is_fragile')->default(false);
            $table->boolean('is_insured')->default(false);
            $table->decimal('insurance_amount', 15, 2)->default(0);
            $table->string('receiver_name')->nullable();
            $table->string('receiver_phone')->nullable();
            $table->text('delivery_address')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('shipment_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('status_id')->constrained('shipment_statuses');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment')->nullable();
            $table->string('location')->nullable();
            $table->timestamps();
        });

        Schema::create('shipment_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('file_path');
            $table->string('file_type')->nullable();
            $table->integer('file_size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_documents');
        Schema::dropIfExists('shipment_history');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('shipment_statuses');
    }
};
