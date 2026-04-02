<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['group' => 'general', 'key' => 'app_name', 'value' => 'TNT Cargo', 'type' => 'string'],
            ['group' => 'general', 'key' => 'primary_color', 'value' => '#1E40AF', 'type' => 'string'],
            ['group' => 'general', 'key' => 'default_currency', 'value' => 'USD', 'type' => 'string'],
            ['group' => 'general', 'key' => 'default_locale', 'value' => 'fr', 'type' => 'string'],
            ['group' => 'general', 'key' => 'company_address', 'value' => 'RDC', 'type' => 'string'],
            ['group' => 'general', 'key' => 'company_phone', 'value' => '', 'type' => 'string'],
            ['group' => 'general', 'key' => 'company_email', 'value' => 'contact@tntcargo.com', 'type' => 'string'],

            ['group' => 'shipping', 'key' => 'warehouse_daily_rate', 'value' => '2.00', 'type' => 'float'],
            ['group' => 'shipping', 'key' => 'warehouse_free_days', 'value' => '7', 'type' => 'integer'],
            ['group' => 'shipping', 'key' => 'default_origin', 'value' => 'china', 'type' => 'string'],
            ['group' => 'shipping', 'key' => 'default_destination', 'value' => 'Goma', 'type' => 'string'],

            ['group' => 'finance', 'key' => 'default_interest_rate', 'value' => '5.00', 'type' => 'float'],
            ['group' => 'finance', 'key' => 'default_commission_rate', 'value' => '2.00', 'type' => 'float'],
            ['group' => 'finance', 'key' => 'late_payment_penalty', 'value' => '1.50', 'type' => 'float'],

            ['group' => 'notifications', 'key' => 'email_notifications', 'value' => '1', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'whatsapp_notifications', 'value' => '0', 'type' => 'boolean'],
            ['group' => 'notifications', 'key' => 'whatsapp_api_key', 'value' => '', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
