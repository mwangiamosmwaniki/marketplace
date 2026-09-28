<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'is_official',
        'status',
    ];

    protected $casts = [
        'is_official' => 'boolean',
    ];

    public function products()
    {
        return $this->hasMany(Product::class, 'brand_id');
    }
}
