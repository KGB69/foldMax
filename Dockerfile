FROM php:8.2-fpm

# Install nginx and required tools
RUN apt-get update && apt-get install -y \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Configure PHP-FPM to listen on TCP port 9000 instead of socket
RUN sed -i 's|listen = /run/php/php-fpm.sock|listen = 9000|g' /usr/local/etc/php-fpm.d/www.conf || \
    echo "listen = 9000" >> /usr/local/etc/php-fpm.d/www.conf

# Create nginx configuration
RUN echo 'server {\n\
    listen 80 default_server;\n\
    root /var/www/html;\n\
    index index.html index.php;\n\
    \n\
    location / {\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    location ~ \.php$ {\n\
    include fastcgi_params;\n\
    fastcgi_pass 127.0.0.1:9000;\n\
    fastcgi_index index.php;\n\
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;\n\
    }\n\
    \n\
    # Security headers\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\n\
    add_header Access-Control-Allow-Origin "*" always;\n\
    add_header Access-Control-Allow-Methods "*" always;\n\
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;\n\
    \n\
    # Disable nginx version in headers\n\
    server_tokens off;\n\
    }' > /etc/nginx/sites-available/default

# Create startup script with proper service startup
RUN echo '#!/bin/bash\n\
    set -e\n\
    echo "Starting PHP-FPM..."\n\
    php-fpm &\n\
    sleep 3\n\
    echo "Starting nginx..."\n\
    exec nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
