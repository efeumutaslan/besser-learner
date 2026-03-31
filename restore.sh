#!/bin/bash
set -e

# BesserLernen - Yedekten Geri Yukleme Scripti
# Kullanim: sudo bash restore.sh backup_20260331_030000.sql

APP_DIR="/opt/besserlernen"
BACKUP_DIR="/opt/besserlernen-backups"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Kullanim: sudo bash restore.sh <yedek_dosya>"
  echo ""
  echo "Mevcut yedekler:"
  ls -lh $BACKUP_DIR/backup_*.sql 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
  exit 1
fi

# Tam yol yoksa backup dizininden bul
if [ ! -f "$BACKUP_FILE" ]; then
  BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "HATA: Yedek dosyasi bulunamadi: $BACKUP_FILE"
  exit 1
fi

cd $APP_DIR
source $APP_DIR/.env
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-besserlernen}
DB_CONTAINER=$(docker compose ps -q db 2>/dev/null)

if [ -z "$DB_CONTAINER" ]; then
  echo "HATA: Veritabani container'i bulunamadi."
  exit 1
fi

echo "=== BesserLernen Geri Yukleme ==="
echo "Yedek: $BACKUP_FILE"
echo ""
echo "DIKKAT: Bu islem mevcut veritabanini SILECEK ve yedekten geri yukleyecektir."
read -p "Devam etmek istiyor musunuz? (evet/hayir): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
  echo "Iptal edildi."
  exit 0
fi

# Once mevcut durumu yedekle
echo ""
echo "[1/3] Mevcut durum yedekleniyor (guvenlik icin)..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/pre_restore_${TIMESTAMP}.sql"
echo "  Kaydedildi: $BACKUP_DIR/pre_restore_${TIMESTAMP}.sql"

# Uygulamayi durdur
echo ""
echo "[2/3] Uygulama durduruluyor..."
docker compose stop app

# Geri yukle
echo ""
echo "[3/3] Yedek geri yukleniyor..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$BACKUP_FILE"

# Uygulamayi baslat
docker compose start app

echo ""
echo "=== Geri Yukleme Tamamlandi ==="
echo "Uygulama yeniden baslatildi."
