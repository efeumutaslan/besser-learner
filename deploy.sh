#!/bin/bash
set -e

# BesserLernen - Oracle Free Tier Ubuntu Deploy Script
# Kullanim: sudo bash deploy.sh yourdomain.com
#
# Bu script:
#   1. Docker + gerekli paketleri kurar
#   2. Firewall ayarlar
#   3. GitHub'dan kodu ceker
#   4. .env olusturur (ilk kurulumda)
#   5. Docker ile uygulamayi calistirir
#   6. Nginx + SSL kurar (domain varsa)
#   7. Otomatik yedekleme cron'u ekler
#
# Guncelleme icin: sudo bash update.sh

DOMAIN=${1:-""}
APP_DIR="/opt/besserlernen"
BACKUP_DIR="/opt/besserlernen-backups"
GITHUB_REPO="efeumutaslan/besser-learner"

echo "========================================="
echo "  BesserLernen Deploy Script"
echo "  $(date)"
echo "========================================="
echo ""

# 1. Sistem guncellemesi ve gerekli paketler
echo "[1/7] Sistem guncelleniyor..."
apt-get update -y
apt-get install -y docker.io docker-compose-plugin curl git ufw

# Docker servisini baslat
systemctl enable docker
systemctl start docker

# 2. Firewall ayarlari
echo ""
echo "[2/7] Firewall ayarlaniyor..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 3. Uygulama dizini
echo ""
echo "[3/7] Uygulama hazirlaniyor..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR

if [ -d "$APP_DIR/.git" ]; then
  echo "  Mevcut kurulum bulundu, kod guncelleniyor..."
  cd $APP_DIR && git pull origin main
else
  echo "  Ilk kurulum, kod cekiliyor..."
  git clone "https://github.com/${GITHUB_REPO}.git" $APP_DIR
  cd $APP_DIR
fi

# 4. Environment degiskenleri
echo ""
echo "[4/7] Environment ayarlaniyor..."
if [ ! -f "$APP_DIR/.env" ]; then
  JWT_SECRET=$(openssl rand -base64 48)
  POSTGRES_PASSWORD=$(openssl rand -base64 24)
  cat > $APP_DIR/.env << EOF
# BesserLernen Production Environment
# Otomatik olusturuldu: $(date)

# Veritabani
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=besserlernen

# Uygulama
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_APP_URL=http://${DOMAIN:-localhost}
UPLOAD_DIR=./uploads

# GitHub Storage (medya dosyalari icin - opsiyonel)
# GITHUB_STORAGE_TOKEN=
# GITHUB_STORAGE_OWNER=
# GITHUB_STORAGE_REPO=
EOF
  echo "  .env olusturuldu."
  echo "  JWT_SECRET ve POSTGRES_PASSWORD otomatik uretildi."
else
  echo "  .env zaten mevcut, atlanıyor."
fi

# 5. Docker ile calistir
echo ""
echo "[5/7] Docker build ve calistirma..."
cd $APP_DIR
docker compose down 2>/dev/null || true
docker compose up -d --build

# Uygulamanin baslamasini bekle
echo "  Uygulama baslatiliyor..."
sleep 15
for i in 1 2 3 4 5 6; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  Uygulama calisiyor! (HTTP 200)"
    break
  fi
  echo "  Bekleniyor... ($i/6)"
  sleep 10
done

# 6. Nginx reverse proxy
echo ""
if [ -n "$DOMAIN" ]; then
  echo "[6/7] Nginx ayarlaniyor..."
  apt-get install -y nginx certbot python3-certbot-nginx

  cat > /etc/nginx/sites-available/besserlernen << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/besserlernen /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx

  # SSL sertifikasi
  echo "  SSL sertifikasi aliniyor..."
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || {
    echo "  SSL sertifikasi alinamadi. Domain DNS ayarlarinizi kontrol edin."
    echo "  Daha sonra: certbot --nginx -d $DOMAIN"
  }

  # .env URL'yi HTTPS ile guncelle
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" $APP_DIR/.env
  cd $APP_DIR && docker compose up -d
else
  echo "[6/7] Domain belirtilmedi, Nginx atlanıyor."
fi

# 7. Otomatik yedekleme cron'u
echo ""
echo "[7/7] Otomatik yedekleme ayarlaniyor..."
CRON_JOB="0 3 * * * cd $APP_DIR && bash backup.sh >> /var/log/besserlernen-backup.log 2>&1"
# Mevcut cron'u kontrol et, yoksa ekle
(crontab -l 2>/dev/null | grep -v "besserlernen" ; echo "$CRON_JOB") | crontab -
echo "  Her gece saat 03:00'te otomatik yedek alinacak."
echo "  Yedek dizini: $BACKUP_DIR"

echo ""
echo "========================================="
echo "  Deploy Tamamlandi!"
echo "========================================="
echo ""
echo "Uygulama: http://${DOMAIN:-localhost:3000}"
echo ""
echo "Komutlar:"
echo "  sudo bash update.sh              # Guncelleme"
echo "  sudo bash backup.sh              # Manuel yedek"
echo "  sudo bash restore.sh <dosya>     # Yedekten geri yukle"
echo "  docker compose logs -f app       # Uygulama loglari"
echo "  docker compose logs -f db        # Veritabani loglari"
echo "  docker compose restart app       # Yeniden baslat"
echo ""
echo "Yedekler: $BACKUP_DIR"
echo "Loglar:   /var/log/besserlernen-backup.log"
