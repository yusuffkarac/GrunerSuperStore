#!/bin/bash

# Nginx tenant config generator
# Kullanım: ./generate-nginx-config.sh <tenant-name> <subdomain> <port> [output-file]

set -e

TENANT_NAME=$1
SUBDOMAIN=$2
PORT=$3
OUTPUT_FILE=${4:-"/tmp/nginx-${TENANT_NAME}.conf"}

if [ -z "$TENANT_NAME" ] || [ -z "$SUBDOMAIN" ] || [ -z "$PORT" ]; then
  echo "❌ Kullanım: ./generate-nginx-config.sh <tenant-name> <subdomain> <port> [output-file]"
  echo "   Örnek: ./generate-nginx-config.sh musteri1 musteri1.superstore.com 5002"
  exit 1
fi

PROJECT_ROOT="/var/www/gruner-superstore"
FRONTEND_DIST="${PROJECT_ROOT}/frontend/dist/${TENANT_NAME}"

cat > "$OUTPUT_FILE" <<EOF
# Nginx Configuration for Tenant: ${TENANT_NAME}
# Generated: $(date)

server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN};

    # SSL için (Let's Encrypt kullanıyorsanız)
    # listen 443 ssl http2;
    # listen [::]:443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/${SUBDOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${SUBDOMAIN}/privkey.pem;

    # Frontend static files
    root ${FRONTEND_DIST};
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Frontend routes - SPA için tüm route'ları index.html'e yönlendir
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache control
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Static assets cache (JS, CSS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API proxy - Backend'e yönlendir
    location /api {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads klasörü için proxy
    location /uploads {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache control for uploads
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

echo "✅ Nginx config oluşturuldu: ${OUTPUT_FILE}"
echo ""
echo "📝 Sonraki adımlar:"
echo "   1. Config dosyasını kontrol edin: cat ${OUTPUT_FILE}"
echo "   2. /etc/nginx/sites-available/ altına kopyalayın:"
echo "      sudo cp ${OUTPUT_FILE} /etc/nginx/sites-available/${SUBDOMAIN}"
echo "   3. Symbolic link oluşturun:"
echo "      sudo ln -s /etc/nginx/sites-available/${SUBDOMAIN} /etc/nginx/sites-enabled/"
echo "   4. Nginx'i test edin: sudo nginx -t"
echo "   5. Nginx'i reload edin: sudo systemctl reload nginx"

