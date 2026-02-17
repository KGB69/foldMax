FROM php:8.2-apache

# Fix Apache MPM configuration more explicitly
# Remove all MPM modules first, then enable only mpm_prefork
RUN a2dismod mpm_event mpm_worker || true && \
    a2enmod mpm_prefork

# Enable mod_rewrite for Apache
RUN a2enmod rewrite headers

# Copy application files to the container
COPY . /var/www/html/

# Set permissions (optional, but good practice)
RUN chown -R www-data:www-data /var/www/html

# Configure Apache to allow .htaccess overrides
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Expose port 80
EXPOSE 80
