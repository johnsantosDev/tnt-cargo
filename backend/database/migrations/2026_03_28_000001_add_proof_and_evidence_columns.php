<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('bank_reference')->nullable()->after('notes');
            $table->string('proof_path')->nullable()->after('bank_reference');
            $table->string('proof_type')->nullable()->after('proof_path');
        });

        Schema::table('cash_advance_payments', function (Blueprint $table) {
            $table->string('evidence_path')->nullable()->after('notes');
            $table->string('evidence_type')->nullable()->after('evidence_path');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['bank_reference', 'proof_path', 'proof_type']);
        });

        Schema::table('cash_advance_payments', function (Blueprint $table) {
            $table->dropColumn(['evidence_path', 'evidence_type']);
        });
    }
};
