FROM php:8.2-apache

# Fix Apache MPM configuration (disable conflicting MPMs)
RUN a2dismod mpm_event mpm_worker && a2enmod mpm_prefork

# Enable mod_rewrite for Apache
RUN a2enmod rewrite headers

# Copy application files to the container
COPY . /var/www/html/

# Set permissions (optional, but good practice)
RUN chown -R www-data:www-data /var/www/html

# Expose port 80
EXPOSE 80
