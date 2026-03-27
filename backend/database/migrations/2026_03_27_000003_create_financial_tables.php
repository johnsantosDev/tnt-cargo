<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('method', ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'])->default('cash');
            $table->enum('type', ['income', 'expense', 'refund'])->default('income');
            $table->enum('status', ['pending', 'completed', 'cancelled', 'refunded'])->default('completed');
            $table->text('notes')->nullable();
            $table->date('payment_date');
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('category');
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->date('expense_date');
            $table->string('receipt_path')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('payments');
    }
};
