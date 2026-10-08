import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const localPropertiesPath = path.resolve(projectRoot, '..', '..', 'local.properties');
const envLocalPath = path.join(projectRoot, '.env.local');

if (!fs.existsSync(localPropertiesPath)) process.exit(0);

const properties = {};
for (const line of fs.readFileSync(localPropertiesPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
  if (match) properties[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const mapping = {
  SUPABASE_URL: 'NEXT_PUBLIC_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  RAZORPAY_KEY_ID: 'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  GOOGLE_WEB_CLIENT_ID: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  GOOGLE_MAPS_API_KEY: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  WEB_APP_URL: 'NEXT_PUBLIC_APP_URL',
};
const existing = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
const values = {};
for (const line of existing.split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
  if (match) values[match[1]] = match[2];
}

let changed = false;
for (const [source, target] of Object.entries(mapping)) {
  if (properties[source]) {
    const value = properties[source].replace(/\n/g, '');
    if (values[target] !== value) changed = true;
    values[target] = value;
  }
}
if (!changed && fs.existsSync(envLocalPath)) process.exit(0);

const output = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
fs.writeFileSync(envLocalPath, output, { mode: 0o600 });
