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
        // Use MAX(invoice_number) over withTrashed() so deleted invoices (soft or hard)
        // never cause us to re-issue a number that's already in use. The original
        // count()+1 implementation would loop forever once any invoice from the current
        // month was deleted, because count() excluded the deleted row while the
        // existence check still saw the matching live row at the same sequence.
        $prefix = 'INV-' . date('Ym') . '-';

        // 4-digit zero-padded suffix means lexicographic ORDER BY matches numeric order.
        $lastNumber = static::withTrashed()
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $lastSeq = 0;
        if ($lastNumber && preg_match('/(\d+)$/', $lastNumber, $m)) {
            $lastSeq = (int) $m[1];
        }

        return $prefix . str_pad($lastSeq + 1, 4, '0', STR_PAD_LEFT);
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
