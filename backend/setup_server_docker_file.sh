#!/bin/bash

# Deployment script for gas feed monitoring system
# Requires Docker and Docker Compose

# Configuration variables
DB_PASSWORD="your_secure_password"
ADMIN_EMAIL="admin@example.com"
DOMAIN="yourdomain.com"

# Create necessary directories
mkdir -p ./data/db
mkdir -p ./data/logs
mkdir -p ./config

# Create docker-compose.yml
cat > docker-compose.yml <<EOL
version: '3.8'

services:
  db:
    image: postgres:13
    container_name: gasfeed_db
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./data/db:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6
    container_name: gasfeed_redis
    volumes:
      - ./data/redis:/data
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: gasfeed_backend
    environment:
      DB_HOST: db
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    volumes:
      - ./config:/app/config
      - ./data/logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped

  worker:
    build: ./backend
    container_name: gasfeed_worker
    command: python worker.py
    environment:
      DB_HOST: db
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    volumes:
      - ./config:/app/config
      - ./data/logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: gasfeed_frontend
    ports:
      - "3000:3000"
    environment:
      API_URL: http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:latest
    container_name: gasfeed_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - frontend
    restart: unless-stopped

EOL

# Create nginx configuration
cat > nginx.conf <<EOL
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name ${DOMAIN};

        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }

        location /api {
            proxy_pass http://backend:8000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOL

# Create backend Dockerfile
mkdir -p backend
cat > backend/Dockerfile <<EOL
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]
EOL

# Create frontend Dockerfile
mkdir -p frontend
cat > frontend/Dockerfile <<EOL
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
EOL

# Create sample backend requirements
cat > backend/requirements.txt <<EOL
flask==2.0.1
flask-sqlalchemy==2.5.1
flask-cors==3.0.10
psycopg2-binary==2.9.1
redis==3.5.3
requests==2.26.0
web3==5.24.0
celery==5.1.2
EOL

echo "Deployment files created. To start the system:"
echo "1. Add your application code to backend/ and frontend/ directories"
echo "2. Run 'docker-compose up -d --build'"
echo "3. Access the web interface at http://localhost"