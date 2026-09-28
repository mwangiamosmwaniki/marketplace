<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'service' => 'kesales-api',
        'message' => 'KESALES API is running.',
    ]);
});
