#!/usr/bin/env bash
set -e

echo "==> Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Installing Node dependencies..."
npm ci

echo "==> Building frontend assets..."
npm run build

echo "==> Setting up storage symlink..."
php artisan storage:link --force

echo "==> Caching config, routes, views, events..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Running migrations..."
php artisan migrate --force

echo "==> Build complete."
