# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Node — build frontend assets
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS node-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY resources/ resources/
COPY vite.config.ts tsconfig.json ./
COPY public/ public/

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: PHP — production image
# ─────────────────────────────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS php-base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    postgresql-dev \
    git \
    unzip

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        intl \
        mbstring \
        opcache \
        pcntl \
        bcmath

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Final image
# ─────────────────────────────────────────────────────────────────────────────
FROM php-base AS final

WORKDIR /var/www/html

# Copy application code
COPY . .

# Copy built frontend assets from node stage
COPY --from=node-builder /app/public/build public/build

# Install PHP dependencies (production only)
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist

# Create .env from example (runtime env vars will override)
RUN cp .env.example .env

# Set correct permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy PHP-FPM config
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# Copy PHP ini
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

# Copy entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
