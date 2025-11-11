// PM2 Ecosystem Config - Multi-Tenant Support
// Her tenant için ayrı PM2 process tanımları

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tenant'ları otomatik olarak bul ve PM2 config oluştur
 */
function getTenantConfigs() {
  const backendDir = path.join(__dirname, 'backend');
  const files = fs.readdirSync(backendDir);
  
  const tenants = [];
  
  // .env.{tenant-name} dosyalarını bul
  files.forEach(file => {
    if (file.startsWith('.env.') && file !== '.env.example') {
      const tenantName = file.replace('.env.', '');
      tenants.push(tenantName);
    }
  });
  
  return tenants.map(tenantName => ({
    name: `${tenantName}-backend`,
    script: 'src/server.js',
    cwd: path.join(__dirname, 'backend'),
    instances: 1,
    exec_mode: 'fork',
    env_file: `.env.${tenantName}`,
    env: {
      NODE_ENV: 'production',
    },
    error_file: `logs/${tenantName}-error.log`,
    out_file: `logs/${tenantName}-out.log`,
    log_file: `logs/${tenantName}-combined.log`,
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
  }));
}

// PM2 config export
export default {
  apps: [
    // Redis (eğer docker-compose kullanılmıyorsa)
    // {
    //   name: 'redis',
    //   script: 'redis-server',
    //   args: '--appendonly yes',
    //   instances: 1,
    //   exec_mode: 'fork',
    // },
    
    // Tenant'ları dinamik olarak ekle
    ...getTenantConfigs(),
  ],
};

