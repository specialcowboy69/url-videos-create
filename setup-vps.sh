#!/bin/bash
# setup-vps.sh
# Script para aprovisionar la VPS en Hostinger (Ubuntu 22.04 / 24.04)

set -e

echo "1. Actualizando sistema..."
apt update && apt upgrade -y

echo "2. Creando Swap de 2GB (anti-OOM)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap creado."
else
    echo "Swap ya existe."
fi

echo "3. Instalando Docker..."
if ! command -v docker &> /dev/null; then
    apt install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker ya está instalado."
fi

echo "4. Instalando Nginx..."
apt install -y nginx

echo "5. Configurando Nginx para reverse proxy en puerto 10000..."
cat > /etc/nginx/sites-available/hyperframes << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 2M;
    proxy_read_timeout 900s;
    proxy_connect_timeout 120s;
    proxy_send_timeout 900s;

    location / {
        proxy_pass http://127.0.0.1:10000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
EOF

ln -sf /etc/nginx/sites-available/hyperframes /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=========================================================="
echo "VPS Setup Completado."
echo "Siguientes pasos recomendados:"
echo "1. Clona tu repositorio en /opt/hyperframes-render-studio"
echo "2. Crea el archivo .env con API_KEY=tu-clave-secreta"
echo "3. Ejecuta 'docker compose up -d'"
echo "4. (Opcional) Si tienes dominio, instala certbot y configúralo."
echo "=========================================================="
