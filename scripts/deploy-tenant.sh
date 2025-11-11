#!/bin/bash

# Tenant deployment script
# Kullanım: ./deploy-tenant.sh <tenant-name> [subdomain]

set -e

TENANT_NAME=$1
SUBDOMAIN=$2

if [ -z "$TENANT_NAME" ]; then
  echo "❌ Kullanım: ./deploy-tenant.sh <tenant-name> [subdomain]"
  echo "   Örnek: ./deploy-tenant.sh musteri1 musteri1.superstore.com"
  exit 1
fi

# Subdomain yoksa tenant name'den oluştur
if [ -z "$SUBDOMAIN" ]; then
  SUBDOMAIN="${TENANT_NAME}.superstore.com"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

echo "🚀 Tenant deployment başlatılıyor..."
echo "   Tenant: ${TENANT_NAME}"
echo "   Subdomain: ${SUBDOMAIN}"
echo ""

# 1. Backend .env dosyasını kontrol et
ENV_FILE="${BACKEND_DIR}/.env.${TENANT_NAME}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env dosyası bulunamadı: ${ENV_FILE}"
  echo "   Önce tenant oluşturun: cd backend && node scripts/create-tenant.js ${TENANT_NAME} ${SUBDOMAIN}"
  exit 1
fi

# 2. Port numarasını .env dosyasından al
PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$PORT" ]; then
  echo "❌ PORT bulunamadı .env dosyasında"
  exit 1
fi

echo "📋 Port: ${PORT}"
echo ""

# 3. Backend migration çalıştır
echo "🔄 Backend migration çalıştırılıyor..."
cd "$BACKEND_DIR"
# Tenant-specific .env dosyasını kullanarak migration çalıştır
export $(cat ".env.${TENANT_NAME}" | grep -v '^#' | xargs)
npm run migrate
echo "✅ Migration tamamlandı"
echo ""

# 4. Frontend build
echo "🏗️  Frontend build yapılıyor..."
cd "$FRONTEND_DIR"
API_URL="https://${SUBDOMAIN}/api"
TENANT_NAME="${TENANT_NAME}" VITE_API_URL="${API_URL}" npm run build
echo "✅ Frontend build tamamlandı"
echo ""

# 5. PM2 restart
echo "🔄 PM2 process yeniden başlatılıyor..."
cd "$PROJECT_ROOT"
pm2 restart "${TENANT_NAME}-backend" || pm2 start ecosystem.config.js --only "${TENANT_NAME}-backend"
echo "✅ PM2 process başlatıldı"
echo ""

# 6. Nginx config kontrolü
NGINX_CONFIG="/etc/nginx/sites-available/${SUBDOMAIN}"
if [ ! -f "$NGINX_CONFIG" ]; then
  echo "⚠️  Nginx config bulunamadı: ${NGINX_CONFIG}"
  echo "   Nginx config oluşturun: ./scripts/generate-nginx-config.sh ${TENANT_NAME} ${SUBDOMAIN} ${PORT}"
  echo "   Sonra nginx'i reload edin: sudo systemctl reload nginx"
else
  echo "📋 Nginx config mevcut: ${NGINX_CONFIG}"
  echo "   Nginx'i reload etmek için: sudo systemctl reload nginx"
fi

echo ""
echo "✅ Deployment tamamlandı!"
echo ""
echo "📝 Kontrol:"
echo "   - Backend: http://localhost:${PORT}/health"
echo "   - Frontend: https://${SUBDOMAIN}"
echo "   - PM2 Status: pm2 list"
echo "   - PM2 Logs: pm2 logs ${TENANT_NAME}-backend"

