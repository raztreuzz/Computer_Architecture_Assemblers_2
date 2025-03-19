FROM mcr.microsoft.com/devcontainers/python:3.11

# Instalar Node.js y npm
RUN apt update && apt install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs && \
    npm install -g npm

# Crear carpeta de trabajo
WORKDIR /workspace
