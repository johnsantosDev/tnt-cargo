import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const indexFile = join(distDir, 'index.html');

// All app routes (skip dynamic :param routes — they'll be handled by the parent folder's index.html)
const routes = [
  '/tracking',
  '/t',
  '/dashboard',
  '/dashboard/login',
  '/dashboard/shipments',
  '/dashboard/clients',
  '/dashboard/payments',
  '/dashboard/expenses',
  '/dashboard/cash-advances',
  '/dashboard/invoices',
  '/dashboard/flight-tickets',
  '/dashboard/packing-lists',
  '/dashboard/reports',
  '/dashboard/currency',
  '/dashboard/settings',
  '/dashboard/search',
];

let created = 0;

for (const route of routes) {
  const dir = join(distDir, route);
  const target = join(dir, 'index.html');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(target)) {
    copyFileSync(indexFile, target);
    created++;
  }
}

console.log(`✓ Generated ${created} static route folders`);
