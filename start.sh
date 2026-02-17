#!/bin/bash
set -e

# Use Railway PORT or default to 80
PORT=${PORT:-80}

# Generate nginx config
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen PORTPLACEHOLDER;
    root /var/www/html;
    index index.html index.php;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "*" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    server_tokens off;
}
NGINXEOF

# Replace PORT placeholder with actual port
sed -i "s/PORTPLACEHOLDER/$PORT/g" /etc/nginx/sites-available/default

echo "Nginx configured to listen on port $PORT"

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
