<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference', 'category', 'description', 'amount', 'currency',
        'status', 'expense_date', 'receipt_path', 'notes',
        'approved_by', 'created_by', 'region',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }

    public static function generateReference(): string
    {
        do {
            $ref = 'EXP-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('reference', $ref)->exists());
        return $ref;
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
