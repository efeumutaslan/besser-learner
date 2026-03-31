#!/bin/bash
set -e

# BesserLernen - Manuel Yedekleme Scripti
# Kullanim: sudo bash backup.sh
# Cron ile otomatik: 0 3 * * * cd /opt/besserlernen && bash backup.sh

APP_DIR="/opt/besserlernen"
BACKUP_DIR="/opt/besserlernen-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cd $APP_DIR

# .env'den DB bilgilerini oku
source $APP_DIR/.env
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-besserlernen}

DB_CONTAINER=$(docker compose ps -q db 2>/dev/null)

if [ -z "$DB_CONTAINER" ]; then
  echo "HATA: Veritabani container'i bulunamadi."
  exit 1
fi

# Yedek al
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"

# Boyut
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Yedek alindi: $BACKUP_FILE ($SIZE)"

# 30 gunden eski yedekleri temizle
DELETED=$(find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete -print 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "$DELETED eski yedek silindi."
fi

# Toplam yedek sayisi ve boyutu
TOTAL=$(ls -1 $BACKUP_DIR/backup_*.sql 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
echo "Toplam yedek: $TOTAL ($TOTAL_SIZE)"
