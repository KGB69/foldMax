FROM php:8.2-apache

# Aggressive fix for Apache MPM configuration
# Directly remove conflicting MPM module symlinks
RUN rm -f /etc/apache2/mods-enabled/mpm_event.* && \
    rm -f /etc/apache2/mods-enabled/mpm_worker.* && \
    ln -sf /etc/apache2/mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load && \
    ln -sf /etc/apache2/mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf

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
