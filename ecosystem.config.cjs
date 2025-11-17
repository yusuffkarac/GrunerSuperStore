// PM2 Ecosystem Config - Production (Single Tenant)
// Tek tenant için basit PM2 config

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

// Backend .env dosyasını oku
const backendEnvPath = path.join(__dirname, 'backend', '.env');
const envVars = parseEnvFile(backendEnvPath);

// PM2 config export
module.exports = {
  apps: [
    {
      name: 'gruner-backend',
      script: 'src/server.js',
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // .env dosyasından okunan değişkenleri ekle
        ...envVars,
        // Eğer .env dosyasında yoksa varsayılan değerler
        PORT: envVars.PORT || 5001,
        DB_HOST: envVars.DB_HOST || 'localhost',
        DB_PORT: envVars.DB_PORT || 5432,
        DB_NAME: envVars.DB_NAME || 'gruner_superstore',
        DB_USER: envVars.DB_USER || 'postgres',
        CORS_ORIGIN: envVars.CORS_ORIGIN || 'https://meral.netwerkpro.de,http://meral.netwerkpro.de',
        UPLOAD_PATH: envVars.UPLOAD_PATH || 'uploads',
      },
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      log_file: path.join(__dirname, 'logs', 'backend-combined.log'),
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};

