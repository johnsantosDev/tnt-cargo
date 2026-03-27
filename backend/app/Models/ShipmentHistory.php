<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentHistory extends Model
{
    protected $table = 'shipment_history';

    protected $fillable = [
        'shipment_id', 'status_id', 'changed_by', 'comment', 'location',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function status()
    {
        return $this->belongsTo(ShipmentStatus::class, 'status_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
