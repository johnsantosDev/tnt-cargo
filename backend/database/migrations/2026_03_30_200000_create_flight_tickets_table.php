<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flight_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            // Passenger info
            $table->string('passenger_name');
            $table->string('passenger_phone')->nullable();
            $table->string('passenger_email')->nullable();
            $table->string('passport_number')->nullable();
            // Flight info
            $table->string('airline');
            $table->string('flight_number')->nullable();
            $table->enum('trip_type', ['one_way', 'round_trip'])->default('one_way');
            // Departure
            $table->string('departure_airport');
            $table->string('departure_city');
            $table->string('departure_country')->nullable();
            $table->dateTime('departure_date');
            // Arrival
            $table->string('arrival_airport');
            $table->string('arrival_city');
            $table->string('arrival_country')->nullable();
            $table->dateTime('arrival_date')->nullable();
            // Return (for round trip)
            $table->dateTime('return_date')->nullable();
            // Class & pricing
            $table->enum('travel_class', ['economy', 'premium_economy', 'business', 'first'])->default('economy');
            $table->decimal('ticket_price', 15, 2)->default(0);
            $table->decimal('service_fee', 15, 2)->default(0);
            $table->decimal('taxes', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            // Status
            $table->enum('status', ['reserved', 'confirmed', 'paid', 'cancelled', 'refunded'])->default('reserved');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'mobile_money', 'card', 'other'])->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flight_tickets');
    }
};
