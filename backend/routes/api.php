<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashAdvanceController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\ShipmentController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::get('/track/{trackingNumber}', [ShipmentController::class, 'track']);
Route::get('/track/share/{shareToken}', [ShipmentController::class, 'trackByShareToken']);
Route::get('/shipment-statuses', [ShipmentController::class, 'statuses']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Shipments
    Route::apiResource('shipments', ShipmentController::class);
    Route::put('/shipments/{shipment}/status', [ShipmentController::class, 'updateStatus']);
    Route::post('/shipments/{shipment}/documents', [ShipmentController::class, 'uploadDocuments']);
    Route::get('/shipments/documents/{document}/download', [ShipmentController::class, 'downloadDocument']);
    Route::delete('/shipments/documents/{document}', [ShipmentController::class, 'deleteDocument']);

    // Clients
    Route::apiResource('clients', ClientController::class);

    // Payments
    Route::apiResource('payments', PaymentController::class);
    Route::get('/payments/{payment}/pdf', [PaymentController::class, 'downloadPdf']);
    Route::get('/payments/{payment}/proof', [PaymentController::class, 'downloadProof']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);
    Route::post('/expenses/{expense}/approve', [ExpenseController::class, 'approve']);
    Route::post('/expenses/{expense}/reject', [ExpenseController::class, 'reject']);

    // Cash Advances
    Route::apiResource('cash-advances', CashAdvanceController::class);
    Route::post('/cash-advances/{cashAdvance}/payments', [CashAdvanceController::class, 'addPayment']);
    Route::get('/cash-advance-payments/{payment}/evidence', [CashAdvanceController::class, 'downloadEvidence']);

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/from-shipment/{shipment}', [InvoiceController::class, 'generateFromShipment']);
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/financial', [ReportController::class, 'financial']);
        Route::get('/shipments', [ReportController::class, 'shipments']);
        Route::get('/debts', [ReportController::class, 'debts']);
        Route::get('/cash-advances', [ReportController::class, 'cashAdvances']);
    });

    // Settings (admin only)
    Route::prefix('settings')->group(function () {
        Route::get('/', [SettingsController::class, 'index']);
        Route::put('/', [SettingsController::class, 'update']);
        Route::get('/shipment-statuses', [SettingsController::class, 'shipmentStatuses']);
        Route::post('/shipment-statuses', [SettingsController::class, 'createShipmentStatus']);
        Route::put('/shipment-statuses/{status}', [SettingsController::class, 'updateShipmentStatus']);
        Route::get('/users', [SettingsController::class, 'users']);
        Route::post('/users', [SettingsController::class, 'createUser']);
        Route::put('/users/{user}', [SettingsController::class, 'updateUser']);
        Route::delete('/users/{user}', [SettingsController::class, 'deleteUser']);
        Route::get('/roles', [SettingsController::class, 'roles']);
        Route::get('/audit-logs', [SettingsController::class, 'auditLogs']);
        Route::put('/{setting}', [SettingsController::class, 'updateSingle']);
    });
});
