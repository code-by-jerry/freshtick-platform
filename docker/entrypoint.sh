#!/bin/sh
set -e

echo "==> Starting Freshtick..."

# Write all environment variables into .env so Laravel can read them
# Render injects env vars at runtime — this bridges them into Laravel's .env
cat > /var/www/html/.env << EOF
APP_NAME="${APP_NAME:-Freshtick}"
APP_ENV="${APP_ENV:-production}"
APP_KEY="${APP_KEY:-}"
APP_DEBUG="${APP_DEBUG:-false}"
APP_URL="${APP_URL:-http://localhost}"
APP_TIMEZONE="${APP_TIMEZONE:-Asia/Kolkata}"
NEXT_DAY_DELIVERY_CUTOFF="${NEXT_DAY_DELIVERY_CUTOFF:-22:30}"
APP_LOCALE="${APP_LOCALE:-en}"
APP_FALLBACK_LOCALE="en"
APP_FAKER_LOCALE="en_IN"
APP_MAINTENANCE_DRIVER="file"
BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-12}"

LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
LOG_STACK="single"
LOG_DEPRECATIONS_CHANNEL="null"
LOG_LEVEL="${LOG_LEVEL:-error}"

DB_CONNECTION="${DB_CONNECTION:-pgsql}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-postgres}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_SSLMODE="${DB_SSLMODE:-require}"

SESSION_DRIVER="${SESSION_DRIVER:-database}"
SESSION_LIFETIME="${SESSION_LIFETIME:-120}"
SESSION_ENCRYPT="false"
SESSION_PATH="/"
SESSION_DOMAIN="${SESSION_DOMAIN:-}"

BROADCAST_CONNECTION="log"
FILESYSTEM_DISK="${FILESYSTEM_DISK:-local}"
QUEUE_CONNECTION="${QUEUE_CONNECTION:-database}"

CACHE_STORE="${CACHE_STORE:-database}"

MAIL_MAILER="${MAIL_MAILER:-log}"
MAIL_SCHEME="null"
MAIL_HOST="${MAIL_HOST:-127.0.0.1}"
MAIL_PORT="${MAIL_PORT:-2525}"
MAIL_USERNAME="${MAIL_USERNAME:-null}"
MAIL_PASSWORD="${MAIL_PASSWORD:-null}"
MAIL_FROM_ADDRESS="${MAIL_FROM_ADDRESS:-hello@example.com}"
MAIL_FROM_NAME="${MAIL_FROM_NAME:-Freshtick}"

GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-}"

PAYMENT_GATEWAY="${PAYMENT_GATEWAY:-razorpay}"
PAYMENT_CURRENCY="${PAYMENT_CURRENCY:-INR}"
PAYMENT_MOCK="${PAYMENT_MOCK:-false}"
RAZORPAY_KEY_ID="${RAZORPAY_KEY_ID:-}"
RAZORPAY_KEY_SECRET="${RAZORPAY_KEY_SECRET:-}"
RAZORPAY_WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET:-}"

IMAGEKIT_PUBLIC_KEY="${IMAGEKIT_PUBLIC_KEY:-}"
IMAGEKIT_PRIVATE_KEY="${IMAGEKIT_PRIVATE_KEY:-}"
IMAGEKIT_URL_ENDPOINT="${IMAGEKIT_URL_ENDPOINT:-}"

SMS_DRIVER="${SMS_DRIVER:-log}"

GTM_ID="${GTM_ID:-}"
META_PIXEL_ID="${META_PIXEL_ID:-}"
EOF

# Ensure storage directories exist and are writable
mkdir -p /var/www/html/storage/framework/cache/data
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ]; then
    echo "==> Generating APP_KEY..."
    php /var/www/html/artisan key:generate --force
    # Re-export the generated key
    APP_KEY=$(grep APP_KEY /var/www/html/.env | cut -d '=' -f2-)
fi

# Cache config, routes, views, events
echo "==> Caching application..."
php /var/www/html/artisan config:cache
php /var/www/html/artisan route:cache
php /var/www/html/artisan view:cache
php /var/www/html/artisan event:cache

# Run migrations
echo "==> Running migrations..."
php /var/www/html/artisan migrate --force

# Storage link
echo "==> Linking storage..."
php /var/www/html/artisan storage:link --force 2>/dev/null || true

echo "==> Starting services (nginx + php-fpm + queue worker)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
