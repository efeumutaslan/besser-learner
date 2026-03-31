#!/bin/bash
set -e

# BesserLernen - Guncelleme Scripti
# Kullanim: sudo bash update.sh
# Bu script kullanici verilerini koruyarak uygulamayi gunceller.

APP_DIR="/opt/besserlernen"
BACKUP_DIR="/opt/besserlernen-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== BesserLernen Guncelleme ==="
echo "Tarih: $(date)"
echo ""

cd $APP_DIR

# 1. Veritabani yedegi al
echo "[1/5] Veritabani yedekleniyor..."
mkdir -p $BACKUP_DIR

# Docker compose container adini bul
DB_CONTAINER=$(docker compose ps -q db 2>/dev/null)

if [ -n "$DB_CONTAINER" ]; then
  # .env'den DB bilgilerini oku
  source $APP_DIR/.env
  DB_USER=${POSTGRES_USER:-postgres}
  DB_NAME=${POSTGRES_DB:-besserlernen}

  docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
  echo "  Yedek: $BACKUP_DIR/backup_${TIMESTAMP}.sql"

  # 30 gunden eski yedekleri sil
  find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete 2>/dev/null
  echo "  30 gunden eski yedekler temizlendi."
else
  echo "  UYARI: Veritabani container'i bulunamadi, yedek alinamadi."
  echo "  Ilk kurulum ise bu normal."
fi

# 2. Yeni kodu cek
echo ""
echo "[2/5] Yeni kod cekiliyor..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "  Zaten guncel! Degisiklik yok."
  echo "  Zorla guncellemek icin: sudo bash update.sh --force"
  if [ "$1" != "--force" ]; then
    exit 0
  fi
fi

git pull origin main
echo "  Kod guncellendi."

# 3. Yeni versiyonu goster
echo ""
echo "[3/5] Versiyon bilgisi..."
NEW_VERSION=$(git log --oneline -1)
echo "  Son commit: $NEW_VERSION"

# 4. Docker image yeniden build et
echo ""
echo "[4/5] Docker image build ediliyor..."
docker compose build app

# 5. Uygulamayi yeniden baslat (DB container'a dokunma!)
echo ""
echo "[5/5] Uygulama yeniden baslatiliyor..."
# Sadece app container'ini yeniden olustur, DB'ye dokunma
docker compose up -d --no-deps app

# Migration otomatik calisacak (Dockerfile CMD icinde)
echo ""
echo "Uygulama baslatildi. Migration otomatik uygulanacak."
echo ""

# Saglik kontrolu
echo "Saglik kontrolu yapiliyor (30 saniye bekleniyor)..."
sleep 10
for i in 1 2 3 4; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  Uygulama calisiyor! (HTTP 200)"
    break
  fi
  echo "  Bekleniyor... ($i/4)"
  sleep 5
done

if [ "$HTTP_CODE" != "200" ]; then
  echo ""
  echo "  UYARI: Uygulama henuz cevap vermiyor."
  echo "  Loglari kontrol edin: docker compose logs -f app"
  echo ""
  echo "  Geri almak icin:"
  echo "    docker compose down app"
  echo "    git checkout HEAD~1"
  echo "    docker compose up -d --build app"
fi

echo ""
echo "=== Guncelleme Tamamlandi ==="
echo ""
echo "Faydali komutlar:"
echo "  docker compose logs -f app          # Uygulama loglari"
echo "  sudo bash backup.sh                 # Manuel yedek al"
echo "  ls -la $BACKUP_DIR                  # Yedekleri listele"
