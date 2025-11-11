// PM2 Ecosystem Config - Multi-Tenant Support
// Her tenant için ayrı PM2 process tanımları

const fs = require('fs');
const path = require('path');

/**
 * .env dosyasını oku ve environment variable'ları parse et
 */
function parseEnvFile(envFilePath) {
  const env = {};
  
  if (!fs.existsSync(envFilePath)) {
    return env;
  }
  
  const content = fs.readFileSync(envFilePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Boş satırları ve yorumları atla
    line = line.trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    
    // KEY=VALUE formatını parse et
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Tırnak işaretlerini kaldır
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  });
  
  return env;
}

/**
 * Tenant'ları otomatik olarak bul ve PM2 config oluştur
 */
function getTenantConfigs() {
  const backendDir = path.join(__dirname, 'backend');
  const files = fs.readdirSync(backendDir);
  
  const tenants = [];
  
  // .env.{tenant-name} dosyalarını bul
  files.forEach(file => {
    if (file.startsWith('.env.') && file !== '.env.example' && !file.startsWith('.env.backup')) {
      const tenantName = file.replace('.env.', '');
      tenants.push(tenantName);
    }
  });
  
  return tenants.map(tenantName => {
    const envFilePath = path.join(backendDir, `.env.${tenantName}`);
    const envVars = parseEnvFile(envFilePath);
    
    return {
      name: `${tenantName}-backend`,
      script: 'src/server.js',
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ...envVars, // .env.{tenant-name} dosyasındaki tüm environment variable'ları ekle
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
    };
  });
}

// PM2 config export
module.exports = {
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

