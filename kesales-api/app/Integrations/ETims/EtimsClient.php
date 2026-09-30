<?php

namespace App\Integrations\ETims;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

/**
 * KRA eTIMS (Electronic Tax Invoice Management System) API Integration
 * Supports automated system-to-system integration (OSCU / VSCU)
 * Generates compliant tax invoices, calculates standard 16% VAT, and registers eTIMS QR-codes.
 */
class EtimsClient
{
    protected string $baseUrl;
    protected string $tinPin;
    protected string $branchId;
    protected string $deviceId;
    protected string $authKey;
    protected string $issuerType;

    public static function calculateInclusiveVatBreakdown(string $unitPrice, int $quantity): array
    {
        $unitPrice = self::normalizeMoney($unitPrice);
        $lineTotal = bcmul($unitPrice, (string) $quantity, 8);
        $taxableAmount = self::roundMoney(bcdiv($lineTotal, '1.16', 8));
        $vatAmount = self::roundMoney(bcsub($lineTotal, $taxableAmount, 2));

        return [
            'line_total' => self::roundMoney($lineTotal),
            'taxable_amount' => $taxableAmount,
            'vat_amount' => $vatAmount,
        ];
    }

    protected static function normalizeMoney(string $amount): string
    {
        if (!is_numeric($amount)) {
            throw new InvalidArgumentException('Monetary values must be numeric.');
        }

        return (string) $amount;
    }

    protected static function roundMoney(string $amount): string
    {
        return bcadd($amount, '0.00', 2);
    }

    public function __construct()
    {
        $this->baseUrl = config('kesales.etims.base_url', 'https://etims-api.kra.go.ke');
        $this->tinPin = config('kesales.etims.tin_pin', 'P000000000X');
        $this->branchId = config('kesales.etims.branch_id', '00');
        $this->deviceId = config('kesales.etims.device_id', 'DEV-001');
        $this->authKey = config('kesales.etims.auth_key', '');
        $this->issuerType = config('kesales.etims.issuer_type', 'platform');
    }

    /**
     * Submit Order Tax Invoice to KRA eTIMS
     */
    public function submitInvoice(string $orderId): array
    {
        $order = DB::table('orders')->where('id', $orderId)->first();
        if (!$order) {
            throw new Exception("Order not found for eTIMS submission");
        }

        // Fetch sub-order items to calculate taxable vs VAT breakdown
        $items = DB::table('seller_order_items as soi')
            ->join('seller_orders as so', 'soi.seller_order_id', '=', 'so.id')
            ->where('so.order_id', $orderId)
            ->get();

        $totalTaxable = '0.00';
        $totalVat = '0.00';
        $itemList = [];

        foreach ($items as $idx => $item) {
            $breakdown = self::calculateInclusiveVatBreakdown((string) $item->unit_price, (int) $item->quantity);
            $totalTaxable = self::roundMoney(bcadd($totalTaxable, $breakdown['taxable_amount'], 2));
            $totalVat = self::roundMoney(bcadd($totalVat, $breakdown['vat_amount'], 2));

            $itemList[] = [
                'itemSeq' => $idx + 1,
                'itemCd' => $item->sku,
                'itemNm' => $item->product_name,
                'qty' => $item->quantity,
                'prc' => (float) (string) $item->unit_price,
                'splyAmt' => (float) $breakdown['taxable_amount'],
                'vatAmt' => (float) $breakdown['vat_amount'],
                'taxTyCd' => 'B', // 16% Standard VAT in KRA tax classification
            ];
        }

        $invoiceNumber = 'ETIMS-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $payload = [
            'tin' => $this->tinPin,
            'bhfId' => $this->branchId,
            'dvcId' => $this->deviceId,
            'invcNo' => $invoiceNumber,
            'orgInvcNo' => 0,
            'custTin' => null,
            'custNm' => 'Retail Customer',
            'salesTyCd' => 'N', // Normal sale
            'rcptTyCd' => 'S',  // Sales receipt
            'pmtTyCd' => '01',  // Mobile Money / M-Pesa
            'salesDt' => date('Ymd'),
            'salesHms' => date('His'),
            'totItemCnt' => count($itemList),
            'taxblAmtA' => 0,
            'taxblAmtB' => (float) $totalTaxable,
            'taxAmtB' => (float) $totalVat,
            'totTaxAmt' => (float) $totalVat,
            'totAmt' => (float) (string) $order->grand_total,
            'itemList' => $itemList,
        ];

        $taxInvoiceId = Str::uuid()->toString();

        // 1. Persist initial record in 'pending' status
        DB::table('tax_invoices')->insert([
            'id' => $taxInvoiceId,
            'invoice_number' => $invoiceNumber,
            'order_id' => $orderId,
            'seller_id' => null,
            'customer_id' => $order->customer_id,
            'taxable_amount' => $totalTaxable,
            'vat_amount' => $totalVat,
            'total_amount' => $order->grand_total,
            'etims_invoice_number' => $invoiceNumber,
            'etims_qr_code' => null,
            'etims_status' => 'pending',
            'issued_at' => now(),
            'submitted_at' => null,
        ]);

        $isProduction = config('kesales.etims.env', 'sandbox') === 'production';

        if ($isProduction && !empty($this->authKey)) {
            // Live KRA eTIMS transmission (OSCU / VSCU gateway)
            try {
                $response = Http::timeout(15)
                    ->withHeaders([
                        'tin' => $this->tinPin,
                        'bhfId' => $this->branchId,
                        'cmcKey' => $this->authKey,
                        'Content-Type' => 'application/json',
                    ])
                    ->post($this->baseUrl . '/etims/api/v1/invoices', $payload);

                if ($response->successful()) {
                    $kraData = $response->json();
                    $qrCode = $kraData['qrCodeUrl'] ?? null;
                    DB::table('tax_invoices')->where('id', $taxInvoiceId)->update([
                        'etims_qr_code' => $qrCode,
                        'etims_status' => 'verified',
                        'submitted_at' => now(),
                    ]);

                    return [
                        'success' => true,
                        'invoice_number' => $invoiceNumber,
                        'qr_code_url' => $qrCode,
                        'total_vat' => $totalVat,
                        'taxable_amount' => $totalTaxable,
                        'status' => 'verified',
                        'simulated' => false,
                    ];
                } else {
                    DB::table('tax_invoices')->where('id', $taxInvoiceId)->update([
                        'etims_status' => 'failed',
                        'submitted_at' => now(),
                    ]);
                    throw new Exception("KRA eTIMS API submission rejected: " . $response->body());
                }
            } catch (Exception $e) {
                DB::table('tax_invoices')->where('id', $taxInvoiceId)->update([
                    'etims_status' => 'failed',
                ]);
                throw $e;
            }
        }

        // Sandbox / Non-Production Explicit Mocking (Status is 'submitted', marked simulated)
        $simulatedQrUrl = "https://itax.kra.go.ke/KRA-Portal/invoiceConfirmation.htm?tin={$this->tinPin}&invoiceNo={$invoiceNumber}";
        DB::table('tax_invoices')->where('id', $taxInvoiceId)->update([
            'etims_qr_code' => $simulatedQrUrl,
            'etims_status' => 'submitted', // Must never be 'verified' without live KRA handshake
            'submitted_at' => now(),
        ]);

        return [
            'success' => true,
            'invoice_number' => $invoiceNumber,
            'qr_code_url' => $simulatedQrUrl,
            'total_vat' => (float) $totalVat,
            'taxable_amount' => (float) $totalTaxable,
            'status' => 'submitted',
            'simulated' => true,
        ];
    }
}
