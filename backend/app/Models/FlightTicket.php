<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FlightTicket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number', 'client_id', 'client_name',
        'passenger_name', 'passenger_phone', 'passenger_email', 'passport_number',
        'airline', 'flight_number', 'trip_type',
        'departure_airport', 'departure_city', 'departure_country', 'departure_date',
        'arrival_airport', 'arrival_city', 'arrival_country', 'arrival_date',
        'return_date',
        'travel_class',
        'ticket_price', 'service_fee', 'taxes', 'total_price',
        'amount_paid', 'balance_due', 'currency',
        'status', 'payment_method', 'payment_proof_path', 'ticket_file_path',
        'notes', 'created_by', 'region',
    ];

    protected function casts(): array
    {
        return [
            'ticket_price' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'taxes' => 'decimal:2',
            'total_price' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'departure_date' => 'datetime',
            'arrival_date' => 'datetime',
            'return_date' => 'datetime',
        ];
    }

    public static function generateTicketNumber(): string
    {
        do {
            $num = 'TKT-' . date('Ym') . '-' . str_pad(
                static::whereYear('created_at', date('Y'))
                    ->whereMonth('created_at', date('m'))
                    ->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );
        } while (static::where('ticket_number', $num)->exists());
        return $num;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
