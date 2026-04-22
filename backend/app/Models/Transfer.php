<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transfer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'transfer_code',
        'qr_token',
        'client_id',
        'client_name',
        'client_phone',
        'amount',
        'transfer_fee',
        'currency',
        'origin_region',
        'destination_region',
        'region',
        'status',
        'approved_by',
        'completed_by',
        'approved_at',
        'completed_at',
        'notes',
        'document_path',
        'signed_document_path',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transfer_fee' => 'decimal:2',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public static function generateReference(): string
    {
        do {
            $ref = 'TRF-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('reference', $ref)->exists());

        return $ref;
    }

    public static function generateTransferCode(): string
    {
        do {
            $code = 'XFER-' . strtoupper(bin2hex(random_bytes(4)));
        } while (static::where('transfer_code', $code)->exists());

        return $code;
    }

    public static function generateQrToken(): string
    {
        do {
            $token = bin2hex(random_bytes(16));
        } while (static::where('qr_token', $token)->exists());

        return $token;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function completer()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
