import { readFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const indexHtml = join(distDir, 'index.html');

// All app routes (matching App.jsx routes)
const routes = [
  // Public
  '/tracking',
  '/t',
  // Auth
  '/dashboard/login',
  // Dashboard
  '/dashboard',
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

const html = readFileSync(indexHtml, 'utf-8');
let created = 0;

for (const route of routes) {
  const dir = join(distDir, route);
  const file = join(dir, 'index.html');
  mkdirSync(dir, { recursive: true });
  copyFileSync(indexHtml, file);
  created++;
}

console.log(`✓ Generated ${created} route folders with index.html`);
