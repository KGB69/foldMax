FROM php:8.2-fpm

# Install nginx and supervisor
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Configure PHP-FPM to listen on TCP
RUN echo "listen = 127.0.0.1:9000" >> /usr/local/etc/php-fpm.d/zz-custom.conf

# Create supervisor configuration
RUN echo '[supervisord]\n\
    nodaemon=true\n\
    user=root\n\
    \n\
    [program:php-fpm]\n\
    command=/usr/local/sbin/php-fpm -F\n\
    autostart=true\n\
    autorestart=true\n\
    priority=1\n\
    stdout_logfile=/dev/stdout\n\
    stdout_logfile_maxbytes=0\n\
    stderr_logfile=/dev/stderr\n\
    stderr_logfile_maxbytes=0\n\
    \n\
    [program:nginx]\n\
    command=/usr/sbin/nginx -g "daemon off;"\n\
    autostart=true\n\
    autorestart=true\n\
    priority=2\n\
    stdout_logfile=/dev/stdout\n\
    stdout_logfile_maxbytes=0\n\
    stderr_logfile=/dev/stderr\n\
    stderr_logfile_maxbytes=0' > /etc/supervisor/conf.d/supervisord.conf

# Copy and set executable startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
