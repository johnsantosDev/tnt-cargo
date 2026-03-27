<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentDocument extends Model
{
    protected $fillable = [
        'shipment_id', 'name', 'file_path', 'file_type', 'file_size', 'uploaded_by',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
