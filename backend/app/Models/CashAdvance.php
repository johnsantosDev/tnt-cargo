<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashAdvance extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference', 'client_id', 'amount', 'currency',
        'interest_rate', 'commission_rate', 'total_due', 'total_paid', 'balance',
        'supplier_reference', 'supplier_details',
        'status', 'issue_date', 'due_date', 'notes', 'created_by', 'region',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'interest_rate' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'total_due' => 'decimal:2',
            'total_paid' => 'decimal:2',
            'balance' => 'decimal:2',
            'issue_date' => 'date',
            'due_date' => 'date',
        ];
    }

    public static function generateReference(): string
    {
        do {
            $ref = 'CA-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('reference', $ref)->exists());
        return $ref;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function advancePayments()
    {
        return $this->hasMany(CashAdvancePayment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function calculateTotalDue(): void
    {
        $interest = $this->amount * ($this->interest_rate / 100);
        $commission = $this->amount * ($this->commission_rate / 100);
        $this->total_due = $this->amount + $interest + $commission;
        $this->balance = $this->total_due - $this->total_paid;
    }

    public function checkOverdue(): void
    {
        if ($this->status === 'active' && $this->due_date->isPast() && $this->balance > 0) {
            $this->status = 'overdue';
        }
    }
}
