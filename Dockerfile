# Usar imagen oficial de Node.js
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache tzdata

# Configurar timezone para Neuquén
ENV TZ=America/Argentina/Salta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copiar package.json
COPY package*.json ./

# Instalar dependencias (usa npm install en lugar de npm ci)
RUN npm install --production --omit=dev

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p logs

# Exponer puerto
EXPOSE 3000

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando de inicio
CMD ["node", "src/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1