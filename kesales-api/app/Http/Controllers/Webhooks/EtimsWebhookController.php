<?php

namespace App\Http\Controllers\Webhooks;

use App\Models\TaxInvoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class EtimsWebhookController extends BaseController
{
    public function handleInvoiceNotification(Request $request): JsonResponse
    {
        $payload = $request->all();
        $invcNo = $payload['invcNo'] ?? $payload['invoiceNumber'] ?? null;
        $status = $payload['status'] ?? 'verified';
        $qrCode = $payload['qrCode'] ?? $payload['qrCodeUrl'] ?? null;

        if ($invcNo) {
            $taxInvoice = TaxInvoice::where('invoice_number', $invcNo)
                ->orWhere('etims_invoice_number', $invcNo)
                ->first();

            if ($taxInvoice) {
                $taxInvoice->update([
                    'etims_status' => $status === 'SUCCESS' || $status === 'verified' ? 'verified' : 'failed',
                    'etims_qr_code' => $qrCode ?? $taxInvoice->etims_qr_code,
                ]);
            }
        }

        return response()->json([
            'result' => 'ACCEPTED',
            'message' => 'eTIMS notification logged and updated.',
        ]);
    }
}
