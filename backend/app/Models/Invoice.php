<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number', 'client_id', 'shipment_id',
        'subtotal', 'tax_amount', 'discount_amount', 'total',
        'amount_paid', 'currency', 'status',
        'issue_date', 'due_date', 'paid_date', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'issue_date' => 'date',
            'due_date' => 'date',
            'paid_date' => 'date',
        ];
    }

    public static function generateInvoiceNumber(): string
    {
        do {
            $num = 'INV-' . date('Ym') . '-' . str_pad(
                static::whereYear('created_at', date('Y'))
                    ->whereMonth('created_at', date('m'))
                    ->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );
        } while (static::where('invoice_number', $num)->exists());
        return $num;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
