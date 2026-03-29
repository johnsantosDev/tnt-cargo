<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shipment extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (Shipment $shipment) {
            if (empty($shipment->share_token)) {
                $shipment->share_token = static::generateShareToken();
            }
        });
    }

    protected $fillable = [
        'tracking_number', 'share_token', 'container_code', 'client_id', 'status_id', 'origin', 'origin_detail',
        'destination', 'description', 'weight', 'volume', 'quantity',
        'package_type', 'declared_value', 'declared_currency',
        'shipping_cost', 'customs_fee', 'warehouse_fee', 'other_fees',
        'total_cost', 'amount_paid', 'balance_due',
        'estimated_arrival', 'actual_arrival',
        'warehouse_entry_date', 'warehouse_exit_date',
        'warehouse_days', 'warehouse_daily_rate',
        'special_instructions', 'is_fragile', 'is_insured', 'insurance_amount',
        'receiver_name', 'receiver_phone', 'delivery_address',
        'assigned_to', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:2',
            'volume' => 'decimal:2',
            'declared_value' => 'decimal:2',
            'shipping_cost' => 'decimal:2',
            'customs_fee' => 'decimal:2',
            'warehouse_fee' => 'decimal:2',
            'other_fees' => 'decimal:2',
            'total_cost' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'insurance_amount' => 'decimal:2',
            'warehouse_daily_rate' => 'decimal:2',
            'estimated_arrival' => 'date',
            'actual_arrival' => 'date',
            'warehouse_entry_date' => 'date',
            'warehouse_exit_date' => 'date',
            'is_fragile' => 'boolean',
            'is_insured' => 'boolean',
        ];
    }

    public static function generateTrackingNumber(): string
    {
        do {
            $number = 'TNT-' . date('Ym') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('tracking_number', $number)->exists());
        return $number;
    }

    public static function generateShareToken(): string
    {
        do {
            $token = bin2hex(random_bytes(16));
        } while (static::where('share_token', $token)->exists());
        return $token;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function status()
    {
        return $this->belongsTo(ShipmentStatus::class, 'status_id');
    }

    public function history()
    {
        return $this->hasMany(ShipmentHistory::class)->orderBy('created_at', 'desc');
    }

    public function documents()
    {
        return $this->hasMany(ShipmentDocument::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function calculateTotalCost(): void
    {
        $this->total_cost = $this->shipping_cost + $this->customs_fee
            + $this->warehouse_fee + $this->other_fees;
        $this->balance_due = $this->total_cost - $this->amount_paid;
    }

    public function calculateWarehouseFee(): void
    {
        if ($this->warehouse_entry_date && $this->warehouse_daily_rate > 0) {
            $exitDate = $this->warehouse_exit_date ?? now();
            $this->warehouse_days = $this->warehouse_entry_date->diffInDays($exitDate);
            $freeDays = 7;
            $chargeableDays = max(0, $this->warehouse_days - $freeDays);
            $this->warehouse_fee = $chargeableDays * $this->warehouse_daily_rate;
        }
    }
}
