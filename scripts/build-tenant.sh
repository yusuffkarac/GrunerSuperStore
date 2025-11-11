#!/bin/bash

# Tenant-specific frontend build script
# Kullanım: ./build-tenant.sh <tenant-name> [subdomain]

set -e

TENANT_NAME=$1
SUBDOMAIN=$2

if [ -z "$TENANT_NAME" ]; then
  echo "❌ Kullanım: ./build-tenant.sh <tenant-name> [subdomain]"
  echo "   Örnek: ./build-tenant.sh musteri1 musteri1.superstore.com"
  exit 1
fi

# Subdomain yoksa tenant name'den oluştur
if [ -z "$SUBDOMAIN" ]; then
  SUBDOMAIN="${TENANT_NAME}.superstore.com"
fi

# API URL'i oluştur
API_URL="https://${SUBDOMAIN}/api"

echo "🚀 Tenant build başlatılıyor..."
echo "   Tenant: ${TENANT_NAME}"
echo "   Subdomain: ${SUBDOMAIN}"
echo "   API URL: ${API_URL}"
echo ""

# Script'in bulunduğu dizini bul
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# Frontend dizinine git
cd "$FRONTEND_DIR"

# Build yap
TENANT_NAME="${TENANT_NAME}" VITE_API_URL="${API_URL}" npm run build

echo ""
echo "✅ Build tamamlandı: frontend/dist/${TENANT_NAME}"

