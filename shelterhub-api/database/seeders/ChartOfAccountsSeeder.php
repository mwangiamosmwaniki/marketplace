<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['id' => 1000, 'code' => '1000', 'name' => 'M-Pesa Clearing & Settlement', 'type' => 'asset'],
            ['id' => 1100, 'code' => '1100', 'name' => 'Payment Processor Receivables', 'type' => 'asset'],
            ['id' => 2000, 'code' => '2000', 'name' => 'Seller Payable (Escrow)', 'type' => 'liability'],
            ['id' => 2100, 'code' => '2100', 'name' => 'Customer Refund Payable', 'type' => 'liability'],
            ['id' => 3000, 'code' => '3000', 'name' => 'Platform Retained Earnings', 'type' => 'equity'],
            ['id' => 4000, 'code' => '4000', 'name' => 'Marketplace Gross Sales', 'type' => 'revenue'],
            ['id' => 4100, 'code' => '4100', 'name' => 'Delivery Fee Revenue', 'type' => 'revenue'],
            ['id' => 4200, 'code' => '4200', 'name' => 'Platform Commission Revenue', 'type' => 'revenue'],
            ['id' => 5000, 'code' => '5000', 'name' => 'Payment Gateway Processing Fees', 'type' => 'expense'],
            ['id' => 5100, 'code' => '5100', 'name' => 'Customer Refund & Concession Expense', 'type' => 'expense'],
            ['id' => 5200, 'code' => '5200', 'name' => 'Carrier Logistics Expense', 'type' => 'expense'],
            ['id' => 5300, 'code' => '5300', 'name' => 'Platform Promotion Discounts', 'type' => 'expense'],
        ];

        foreach ($accounts as $account) {
            Account::updateOrCreate(['id' => $account['id']], $account);
        }
    }
}
