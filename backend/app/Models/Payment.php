<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference', 'shipment_id', 'client_id', 'amount', 'currency',
        'method', 'type', 'status', 'notes', 'payment_date',
        'received_by', 'created_by', 'bank_reference', 'proof_path', 'proof_type',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public static function generateReference(): string
    {
        do {
            $ref = 'PAY-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('reference', $ref)->exists());
        return $ref;
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
