#!/usr/bin/env bash

set -euo pipefail

#
# Çoklu ortam PostgreSQL dump + git push scripti
#
# ✏️ ENVIRONMENTS dizisini kendi sunucu yollarınıza ve veritabanı bilgilerinize göre güncelleyin.
# Script, tanımlı path mevcut değilse o ortamı otomatik atlar.
#

CONFIG_DIR="${CONFIG_DIR:-/root/.config/gruner-backups}"
TOKEN_FILE="${TOKEN_FILE:-${CONFIG_DIR}/git-token}"
ASKPASS_SCRIPT="${ASKPASS_SCRIPT:-${CONFIG_DIR}/git-askpass.sh}"
LOG_FILE="${LOG_FILE:-/var/log/gruner-backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-10}"

PG_DUMP_BIN="${PG_DUMP_BIN:-$(command -v pg_dump)}"

if [[ -z "${PG_DUMP_BIN}" ]]; then
  echo "pg_dump bulunamadı. PostgreSQL client paketini kurun." >&2
  exit 1
fi

# ENV tanımı: id, repo_root, database_url, cors_origin (branch türetmek için)
ENVIRONMENTS=(
  "id=15935test.gruner-super.store|repo=/var/www/15935test.gruner-super.store|db=postgresql://postgres:admin999@localhost:5432/gruner_superstore?schema=public|cors=https://15935test.gruner-super.store,http://15935test.gruner-super.store"
  "id=meral.netwerkpro.de|repo=/var/www/meral.netwerkpro.de|db=postgresql://postgres:admin999@localhost:5432/gruner_superstore?schema=public|cors=https://meral.netwerkpro.de,http://meral.netwerkpro.de"
)

log() {
  local msg="$1"
  printf "[%s] %s\n" "$(date --iso-8601=seconds)" "$msg"
}

ensure_git_identity() {
  local repo="$1"
  if ! git -C "$repo" config user.name >/dev/null; then
    git -C "$repo" config user.name "Gruner Backup Bot"
  fi
  if ! git -C "$repo" config user.email >/dev/null; then
    git -C "$repo" config user.email "backups@gruner.local"
  fi
}

first_domain_from_cors() {
  local cors="$1"
  local first="${cors%%,*}"
  first="${first#http://}"
  first="${first#https://}"
  first="${first%%/}"
  echo "$first"
}

ensure_auth_setup() {
  if [[ ! -f "$TOKEN_FILE" || ! -x "$ASKPASS_SCRIPT" ]]; then
    echo "PAT veya GIT_ASKPASS scripti hazır değil. TOKEN_FILE=$TOKEN_FILE" >&2
    exit 1
  fi
  export GIT_ASKPASS="$ASKPASS_SCRIPT"
  export GIT_TERMINAL_PROMPT=0
}

rotate_old_dumps() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    find "$dir" -type f -name 'dump_*.sql' -mtime +"$((RETENTION_DAYS-1))" -print -delete
  fi
}

run_backup_for_env() {
  local env_string="$1"
  local id repo db cors

  IFS='|' read -r -a parts <<< "$env_string"
  for part in "${parts[@]}"; do
    case "$part" in
      id=*) id="${part#id=}" ;;
      repo=*) repo="${part#repo=}" ;;
      db=*) db="${part#db=}" ;;
      cors=*) cors="${part#cors=}" ;;
    esac
  done

  if [[ -z "${repo:-}" || ! -d "$repo" ]]; then
    log "SKIP: $id (repo path bulunamadı: $repo)"
    return
  fi

  local backend_dir="${repo}/backend"
  local dump_dir="${backend_dir}/database-dumps/${id}"
  local ts
  ts="$(date +%Y-%m-%d_%H%M%S)"
  local dump_file="${dump_dir}/dump_${id}_${ts}.sql"
  local branch="backup/$(first_domain_from_cors "$cors")"

  mkdir -p "$dump_dir"

  log "Dump başlatılıyor → $id"
  "$PG_DUMP_BIN" "$db" > "$dump_file"
  log "Dump tamamlandı: $dump_file"

  rotate_old_dumps "$dump_dir"

  ensure_git_identity "$repo"

  (
    cd "$repo"
    git fetch origin
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git checkout "$branch"
    else
      git checkout -b "$branch" "origin/$branch" 2>/dev/null || git checkout -b "$branch"
    fi

    git pull --rebase origin "$branch" || true

    git add "${backend_dir#$repo/}/database-dumps/${id}"
    if git diff --cached --quiet; then
      log "Yeni değişiklik yok, commit atlanıyor → $id"
    else
      git commit -m "chore(backup): ${id} dump ${ts}"
      git push origin "$branch"
      log "Push tamam: $branch"
    fi
  )
}

main() {
  exec >>"$LOG_FILE" 2>&1
  ensure_auth_setup
  for env in "${ENVIRONMENTS[@]}"; do
    run_backup_for_env "$env"
  done
}

main "$@"

