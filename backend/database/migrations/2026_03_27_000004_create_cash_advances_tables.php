<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_advances', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->decimal('commission_rate', 5, 2)->default(0);
            $table->decimal('total_due', 15, 2);
            $table->decimal('total_paid', 15, 2)->default(0);
            $table->decimal('balance', 15, 2);
            $table->string('supplier_reference');
            $table->text('supplier_details')->nullable();
            $table->enum('status', ['active', 'paid', 'overdue', 'defaulted', 'cancelled'])->default('active');
            $table->date('issue_date');
            $table->date('due_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cash_advance_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_advance_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('method', ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'])->default('cash');
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_advance_payments');
        Schema::dropIfExists('cash_advances');
    }
};
