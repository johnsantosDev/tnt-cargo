<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $modules = [
            'shipments', 'clients', 'payments', 'expenses',
            'cash_advances', 'invoices', 'reports', 'settings', 'users',
        ];

        $actions = ['view', 'create', 'edit', 'delete', 'export'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$action}_{$module}"]);
            }
        }

        Permission::firstOrCreate(['name' => 'view_dashboard']);
        Permission::firstOrCreate(['name' => 'view_audit_logs']);
        Permission::firstOrCreate(['name' => 'manage_roles']);
        Permission::firstOrCreate(['name' => 'view_all_shipments']);
        Permission::firstOrCreate(['name' => 'approve_expenses']);

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->givePermissionTo(Permission::all());

        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->givePermissionTo([
            'view_dashboard',
            'view_shipments', 'create_shipments', 'edit_shipments', 'export_shipments', 'view_all_shipments',
            'view_clients', 'create_clients', 'edit_clients', 'export_clients',
            'view_payments', 'create_payments', 'edit_payments', 'export_payments',
            'view_expenses', 'create_expenses', 'edit_expenses', 'export_expenses', 'approve_expenses',
            'view_cash_advances', 'create_cash_advances', 'edit_cash_advances', 'export_cash_advances',
            'view_invoices', 'create_invoices', 'edit_invoices', 'export_invoices',
            'view_reports', 'export_reports',
            'view_users',
        ]);

        $agent = Role::firstOrCreate(['name' => 'agent']);
        $agent->givePermissionTo([
            'view_dashboard',
            'view_shipments', 'create_shipments', 'edit_shipments',
            'view_clients', 'create_clients', 'edit_clients',
            'view_payments', 'create_payments',
            'view_invoices', 'create_invoices',
        ]);

        $finance = Role::firstOrCreate(['name' => 'finance']);
        $finance->givePermissionTo([
            'view_dashboard',
            'view_shipments',
            'view_clients',
            'view_payments', 'create_payments', 'edit_payments', 'export_payments',
            'view_expenses', 'create_expenses', 'edit_expenses', 'export_expenses', 'approve_expenses',
            'view_cash_advances', 'create_cash_advances', 'edit_cash_advances', 'export_cash_advances',
            'view_invoices', 'create_invoices', 'edit_invoices', 'export_invoices',
            'view_reports', 'export_reports',
        ]);

        $viewer = Role::firstOrCreate(['name' => 'viewer']);
        $viewer->givePermissionTo([
            'view_dashboard',
            'view_shipments',
            'view_clients',
            'view_payments',
            'view_expenses',
            'view_invoices',
            'view_reports',
        ]);

        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@tntcargo.com'],
            [
                'name' => 'Administrateur TNT',
                'password' => bcrypt('Admin@2026!'),
                'locale' => 'fr',
                'is_active' => true,
            ]
        );
        $superAdmin->assignRole('admin');
    }
}
