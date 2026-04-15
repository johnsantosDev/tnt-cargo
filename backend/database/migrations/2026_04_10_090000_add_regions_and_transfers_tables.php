<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'region')) {
                $table->string('region')->nullable()->after('phone')->index();
            }
        });

        foreach (['clients', 'shipments', 'payments', 'expenses', 'cash_advances', 'packing_lists', 'flight_tickets', 'invoices'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'region')) {
                    $table->string('region')->nullable()->index();
                }
            });
        }

        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'phone_code')) {
                $table->string('phone_code', 10)->nullable()->after('phone');
            }
        });

        Schema::table('shipments', function (Blueprint $table) {
            if (!Schema::hasColumn('shipments', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('actual_arrival');
            }
            if (!Schema::hasColumn('shipments', 'completed_by')) {
                $table->foreignId('completed_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('shipments', 'completion_note')) {
                $table->text('completion_note')->nullable()->after('completed_by');
            }
        });

        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('transfer_code')->unique();
            $table->string('qr_token')->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('client_name');
            $table->string('client_phone')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('origin_region');
            $table->string('destination_region');
            $table->string('region')->nullable()->index();
            $table->enum('status', ['pending_approval', 'approved', 'rejected', 'completed', 'cancelled'])->default('pending_approval');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfers');

        Schema::table('shipments', function (Blueprint $table) {
            if (Schema::hasColumn('shipments', 'completion_note')) {
                $table->dropColumn('completion_note');
            }
            if (Schema::hasColumn('shipments', 'completed_by')) {
                $table->dropConstrainedForeignId('completed_by');
            }
            if (Schema::hasColumn('shipments', 'completed_at')) {
                $table->dropColumn('completed_at');
            }
        });

        if (Schema::hasColumn('clients', 'phone_code')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('phone_code');
            });
        }

        foreach (['users', 'clients', 'shipments', 'payments', 'expenses', 'cash_advances', 'packing_lists', 'flight_tickets', 'invoices'] as $tableName) {
            if (Schema::hasColumn($tableName, 'region')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('region');
                });
            }
        }
    }
};
