#!/bin/bash
# Generate self-signed certificate for IP address 130.246.213.163

# Create SSL directory if it doesn't exist
sudo mkdir -p /etc/nginx/ssl

# Generate private key
sudo openssl genrsa -out /etc/nginx/ssl/metrics-viewer.key 2048

# Generate certificate with IP SAN
sudo openssl req -new -x509 -key /etc/nginx/ssl/metrics-viewer.key \
    -out /etc/nginx/ssl/metrics-viewer.crt \
    -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=130.246.213.163" \
    -addext "subjectAltName=IP:130.246.213.163"

# Set proper permissions
sudo chmod 600 /etc/nginx/ssl/metrics-viewer.key
sudo chmod 644 /etc/nginx/ssl/metrics-viewer.crt

echo "Self-signed certificate generated at /etc/nginx/ssl/metrics-viewer.crt"
echo "Key generated at /etc/nginx/ssl/metrics-viewer.key"
echo ""
echo "To trust this certificate on your local machine:"
echo "1. Copy /etc/nginx/ssl/metrics-viewer.crt to your local machine"
echo "2. Import it into your browser/OS certificate store"

