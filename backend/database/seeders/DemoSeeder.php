<?php

namespace Database\Seeders;

use App\Models\CashAdvance;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\ShipmentHistory;
use App\Models\ShipmentStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = \App\Models\User::first();
        $statuses = ShipmentStatus::all()->keyBy('slug');

        // Create demo clients
        $clients = [];
        $clientsData = [
            ['name' => 'Mamadou Diallo', 'email' => 'mamadou@gmail.com', 'phone' => '+243 99 123 4567', 'company' => 'Diallo Import SARL', 'city' => 'Goma', 'country' => 'RDC', 'type' => 'vip'],
            ['name' => 'Grace Kabongo', 'email' => 'grace.k@yahoo.com', 'phone' => '+243 81 234 5678', 'company' => 'Kabongo Trading', 'city' => 'Lubumbashi', 'country' => 'RDC', 'type' => 'vip'],
            ['name' => 'Patrick Musafiri', 'email' => 'patrick.m@gmail.com', 'phone' => '+243 97 345 6789', 'company' => 'Musafiri Electronics', 'city' => 'Kinshasa', 'country' => 'RDC', 'type' => 'regular'],
            ['name' => 'Amina Bashir', 'email' => 'amina.b@hotmail.com', 'phone' => '+243 85 456 7890', 'company' => null, 'city' => 'Beni', 'country' => 'RDC', 'type' => 'regular'],
            ['name' => 'Jean-Pierre Katembo', 'email' => 'jp.katembo@gmail.com', 'phone' => '+243 99 567 8901', 'company' => 'Katembo & Fils', 'city' => 'Butembo', 'country' => 'RDC', 'type' => 'vip'],
            ['name' => 'Sophie Nzuzi', 'email' => 'sophie.nz@outlook.com', 'phone' => '+243 81 678 9012', 'company' => 'Nzuzi Fashion', 'city' => 'Goma', 'country' => 'RDC', 'type' => 'regular'],
            ['name' => 'David Mulonda', 'email' => 'david.mul@gmail.com', 'phone' => '+243 97 789 0123', 'company' => 'Mulonda Construction', 'city' => 'Bukavu', 'country' => 'RDC', 'type' => 'regular'],
            ['name' => 'Esther Lukusa', 'email' => 'esther.l@gmail.com', 'phone' => '+243 85 890 1234', 'company' => 'Lukusa Cosmetics', 'city' => 'Kinshasa', 'country' => 'RDC', 'type' => 'new'],
            ['name' => 'Olivier Bahati', 'email' => 'olivier.b@yahoo.com', 'phone' => '+243 99 901 2345', 'company' => 'Bahati Auto Parts', 'city' => 'Goma', 'country' => 'RDC', 'type' => 'vip'],
            ['name' => 'Rachel Mbayo', 'email' => 'rachel.mb@gmail.com', 'phone' => '+243 81 012 3456', 'company' => null, 'city' => 'Bunia', 'country' => 'RDC', 'type' => 'new'],
        ];

        foreach ($clientsData as $data) {
            $clients[] = Client::create(array_merge($data, [
                'address' => "Avenue Principale, {$data['city']}",
                'is_active' => true,
                'created_by' => $admin->id,
            ]));
        }

        // Create shipments with various statuses
        $origins = ['china', 'dubai', 'turkey'];
        $destinations = ['Goma', 'Lubumbashi', 'Kinshasa', 'Beni', 'Butembo', 'Bukavu', 'Bunia'];
        $packageTypes = ['Carton', 'Palette', 'Conteneur', 'Colis', 'Sac'];
        $descriptions = [
            'Électronique - téléphones et accessoires',
            'Vêtements et textiles',
            'Pièces détachées automobiles',
            'Matériaux de construction',
            'Cosmétiques et produits de beauté',
            'Équipement informatique',
            'Accessoires de mode',
            'Produits alimentaires emballés',
            'Mobilier et décoration',
            'Équipement médical',
            'Jouets et articles pour enfants',
            'Appareils électroménagers',
        ];

        $shipments = [];
        $trackingCounter = 1;

        foreach ($clients as $clientIdx => $client) {
            $numShipments = rand(2, 4);
            for ($i = 0; $i < $numShipments; $i++) {
                $origin = $origins[array_rand($origins)];
                $destination = $destinations[array_rand($destinations)];
                $statusKeys = ['purchased', 'warehouse', 'in-transit', 'customs', 'arrived', 'delivered'];
                $statusSlug = $statusKeys[array_rand($statusKeys)];
                $status = $statuses[$statusSlug];

                $weight = rand(50, 5000) / 10;
                $volume = rand(1, 100) / 10;
                $quantity = rand(1, 50);
                $shippingCost = rand(200, 3000);
                $customsFee = rand(50, 500);
                $warehouseFee = rand(0, 200);
                $otherFees = rand(0, 100);
                $totalCost = $shippingCost + $customsFee + $warehouseFee + $otherFees;
                $amountPaid = $statusSlug === 'delivered' ? $totalCost : rand(0, $totalCost);

                $createdAt = Carbon::now()->subDays(rand(1, 60));
                $trackingNumber = 'TNT-202603-' . str_pad($trackingCounter++, 6, '0', STR_PAD_LEFT);

                $shipment = Shipment::create([
                    'tracking_number' => $trackingNumber,
                    'client_id' => $client->id,
                    'status_id' => $status->id,
                    'origin' => $origin,
                    'destination' => $destination,
                    'description' => $descriptions[array_rand($descriptions)],
                    'weight' => $weight,
                    'volume' => $volume,
                    'quantity' => $quantity,
                    'package_type' => $packageTypes[array_rand($packageTypes)],
                    'declared_value' => rand(500, 15000),
                    'shipping_cost' => $shippingCost,
                    'customs_fee' => $customsFee,
                    'warehouse_fee' => $warehouseFee,
                    'other_fees' => $otherFees,
                    'total_cost' => $totalCost,
                    'amount_paid' => $amountPaid,
                    'balance_due' => $totalCost - $amountPaid,
                    'estimated_arrival' => $createdAt->copy()->addDays(rand(15, 40)),
                    'actual_arrival' => in_array($statusSlug, ['arrived', 'delivered']) ? $createdAt->copy()->addDays(rand(20, 35)) : null,
                    'warehouse_entry_date' => in_array($statusSlug, ['warehouse', 'in-transit', 'customs', 'arrived', 'delivered']) ? $createdAt->copy()->addDays(rand(3, 10)) : null,
                    'receiver_name' => $client->name,
                    'receiver_phone' => $client->phone,
                    'delivery_address' => "Avenue Principale, {$destination}",
                    'assigned_to' => $admin->id,
                    'created_by' => $admin->id,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);

                $shipments[] = $shipment;

                // Create shipment history entries for this shipment
                $statusOrder = ['purchased', 'warehouse', 'in-transit', 'customs', 'arrived', 'delivered'];
                $currentIdx = array_search($statusSlug, $statusOrder);
                $locations = [
                    'purchased' => ['Bureau TNT Cargo, Guangzhou', 'Bureau TNT Cargo, Dubaï', 'Bureau TNT Cargo, Istanbul'],
                    'warehouse' => ['Entrepôt TNT, Shanghai', 'Entrepôt TNT, Dubaï', 'Entrepôt TNT, Istanbul'],
                    'in-transit' => ['Port de Shanghai', 'Port de Dubaï', 'Port de Dar es Salaam', 'Aéroport de Nairobi'],
                    'customs' => ['Douane Dar es Salaam', 'Douane Goma', 'Douane Lubumbashi', 'Douane Kinshasa'],
                    'arrived' => ['Entrepôt TNT, ' . $destination],
                    'delivered' => [$destination . ', RDC'],
                ];
                for ($h = 0; $h <= $currentIdx; $h++) {
                    $hSlug = $statusOrder[$h];
                    $hStatus = $statuses[$hSlug] ?? null;
                    if (!$hStatus) continue;
                    $locOptions = $locations[$hSlug] ?? [''];
                    ShipmentHistory::create([
                        'shipment_id' => $shipment->id,
                        'status_id' => $hStatus->id,
                        'changed_by' => $admin->id,
                        'comment' => $hStatus->name,
                        'location' => $locOptions[array_rand($locOptions)],
                        'created_at' => $createdAt->copy()->addDays($h * 5 + rand(0, 3)),
                    ]);
                }

                // Update client stats
                $client->increment('shipment_count');
                $client->increment('total_spent', $amountPaid);
                $client->increment('total_debt', $totalCost - $amountPaid);
            }
        }

        // Create payments for shipments
        foreach ($shipments as $shipment) {
            if ($shipment->amount_paid > 0) {
                Payment::create([
                    'reference' => 'PAY-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                    'shipment_id' => $shipment->id,
                    'client_id' => $shipment->client_id,
                    'amount' => $shipment->amount_paid,
                    'method' => ['cash', 'bank_transfer', 'mobile_money'][array_rand(['cash', 'bank_transfer', 'mobile_money'])],
                    'type' => 'income',
                    'status' => 'completed',
                    'notes' => "Paiement pour {$shipment->tracking_number}",
                    'payment_date' => $shipment->created_at->copy()->addDays(rand(0, 5)),
                    'received_by' => $admin->id,
                    'created_by' => $admin->id,
                ]);
            }
        }

        // Create expenses
        $expenseCategories = ['Transport local', 'Dédouanement', 'Loyer entrepôt', 'Salaires', 'Carburant', 'Maintenance', 'Communication', 'Fournitures'];
        for ($i = 0; $i < 15; $i++) {
            Expense::create([
                'reference' => 'EXP-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                'category' => $expenseCategories[array_rand($expenseCategories)],
                'description' => 'Dépense opérationnelle - ' . $expenseCategories[array_rand($expenseCategories)],
                'amount' => rand(50, 2000),
                'status' => ['pending', 'approved', 'approved', 'approved'][array_rand([0, 1, 2, 3])],
                'expense_date' => Carbon::now()->subDays(rand(1, 30)),
                'created_by' => $admin->id,
            ]);
        }

        // Create cash advances
        $advanceClients = array_slice($clients, 0, 5);
        foreach ($advanceClients as $client) {
            $amount = rand(500, 5000);
            $interestRate = rand(3, 8);
            $commissionRate = rand(1, 3);
            $totalDue = $amount * (1 + $interestRate / 100 + $commissionRate / 100);
            $totalPaid = rand(0, (int)$totalDue);
            $issueDate = Carbon::now()->subDays(rand(10, 45));
            $dueDate = $issueDate->copy()->addDays(30);
            $status = $totalPaid >= $totalDue ? 'paid' : ($dueDate->isPast() ? 'overdue' : 'active');

            CashAdvance::create([
                'reference' => 'ADV-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                'client_id' => $client->id,
                'amount' => $amount,
                'interest_rate' => $interestRate,
                'commission_rate' => $commissionRate,
                'total_due' => round($totalDue, 2),
                'total_paid' => $totalPaid,
                'balance' => round($totalDue - $totalPaid, 2),
                'supplier_reference' => 'SUP-' . strtoupper(substr(md5(uniqid()), 0, 6)),
                'supplier_details' => 'Fournisseur Guangzhou / Dubai',
                'status' => $status,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'created_by' => $admin->id,
            ]);
        }

        // Create invoices
        $invoiceShipments = array_slice($shipments, 0, 10);
        $invoiceCounter = 1;
        foreach ($invoiceShipments as $shipment) {
            $total = $shipment->total_cost;
            $tax = round($total * 0.05, 2);
            $grandTotal = $total + $tax;
            $amPaid = $shipment->amount_paid;
            $issueDate = $shipment->created_at->copy()->addDays(rand(1, 5));
            $dueDate = $issueDate->copy()->addDays(30);
            $invoiceStatus = $amPaid >= $grandTotal ? 'paid' : ($amPaid > 0 ? 'partial' : ($dueDate->isPast() ? 'overdue' : 'sent'));

            $invoice = Invoice::create([
                'invoice_number' => 'INV-2026-' . str_pad($invoiceCounter++, 4, '0', STR_PAD_LEFT),
                'client_id' => $shipment->client_id,
                'shipment_id' => $shipment->id,
                'subtotal' => $total,
                'tax_amount' => $tax,
                'discount_amount' => 0,
                'total' => $grandTotal,
                'amount_paid' => $amPaid,
                'status' => $invoiceStatus,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'created_by' => $admin->id,
            ]);

            // Add invoice items
            $invoice->items()->create([
                'description' => "Frais expédition {$shipment->tracking_number}",
                'quantity' => 1,
                'unit_price' => $shipment->shipping_cost,
                'total' => $shipment->shipping_cost,
            ]);
            if ($shipment->customs_fee > 0) {
                $invoice->items()->create([
                    'description' => 'Frais de douane',
                    'quantity' => 1,
                    'unit_price' => $shipment->customs_fee,
                    'total' => $shipment->customs_fee,
                ]);
            }
            if ($shipment->warehouse_fee > 0) {
                $invoice->items()->create([
                    'description' => 'Frais entreposage',
                    'quantity' => 1,
                    'unit_price' => $shipment->warehouse_fee,
                    'total' => $shipment->warehouse_fee,
                ]);
            }
        }

        // Create additional users (one per role for testing)
        $users = [
            ['name' => 'Marie Kasongo', 'email' => 'manager@tntcargo.com', 'role' => 'manager'],
            ['name' => 'Joseph Kalume', 'email' => 'agent@tntcargo.com', 'role' => 'agent'],
            ['name' => 'Alice Mwamba', 'email' => 'finance@tntcargo.com', 'role' => 'finance'],
            ['name' => 'Pierre Lukeba', 'email' => 'viewer@tntcargo.com', 'role' => 'viewer'],
        ];

        foreach ($users as $u) {
            $user = \App\Models\User::create([
                'name' => $u['name'],
                'email' => $u['email'],
                'password' => bcrypt('Password@2026!'),
                'locale' => 'fr',
                'is_active' => true,
            ]);
            $user->assignRole($u['role']);
        }
    }
}
