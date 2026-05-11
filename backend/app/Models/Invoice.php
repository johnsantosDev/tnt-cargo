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
        'subtotal', 'tax_amount', 'discount_amount',
        'magerwa_price', 'auxiliary_fees', 'cash_advance_id', 'cash_advance_amount',
        'total',
        'amount_paid', 'currency', 'status',
        'issue_date', 'due_date', 'paid_date', 'notes', 'created_by', 'region',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'magerwa_price' => 'decimal:2',
            'auxiliary_fees' => 'array',
            'cash_advance_amount' => 'decimal:2',
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

    public function cashAdvance()
    {
        return $this->belongsTo(CashAdvance::class);
    }

    public function recalculateTotal(): void
    {
        $itemsSubtotal = (float) $this->items()->sum('total');
        $this->subtotal = $itemsSubtotal;

        $tax = (float) ($this->tax_amount ?? 0);
        $discount = (float) ($this->discount_amount ?? 0);
        $magerwa = (float) ($this->magerwa_price ?? 0);
        $aux = collect($this->auxiliary_fees ?? [])->sum(fn ($f) => (float) ($f['amount'] ?? 0));
        $ca = (float) ($this->cash_advance_amount ?? 0);

        $this->total = $itemsSubtotal + $tax - $discount + $magerwa + $aux - $ca;
        if ($this->total < 0) {
            $this->total = 0;
        }
    }
}
