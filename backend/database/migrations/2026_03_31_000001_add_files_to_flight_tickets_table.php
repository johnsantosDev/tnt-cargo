<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flight_tickets', function (Blueprint $table) {
            $table->string('payment_proof_path')->nullable()->after('payment_method');
            $table->string('ticket_file_path')->nullable()->after('payment_proof_path');
        });
    }

    public function down(): void
    {
        Schema::table('flight_tickets', function (Blueprint $table) {
            $table->dropColumn(['payment_proof_path', 'ticket_file_path']);
        });
    }
};
