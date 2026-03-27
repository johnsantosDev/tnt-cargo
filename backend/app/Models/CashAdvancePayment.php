<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashAdvancePayment extends Model
{
    protected $fillable = [
        'cash_advance_id', 'amount', 'currency', 'method',
        'payment_date', 'notes', 'received_by', 'evidence_path', 'evidence_type',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function cashAdvance()
    {
        return $this->belongsTo(CashAdvance::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
