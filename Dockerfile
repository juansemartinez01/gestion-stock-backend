# Etapa de build
FROM node:20 as builder

WORKDIR /app

# Copiamos los archivos necesarios para instalar dependencias
COPY package*.json ./

# Instalamos todas las dependencias (dev incluidas)
RUN npm install
RUN npm install -g @nestjs/cli

# Copiamos el resto del código fuente
COPY . .

# Compilamos usando el tsconfig.build.json correcto
RUN rm -rf dist
RUN npx tsc --project tsconfig.build.json

# Etapa de producción
FROM node:20 as production

WORKDIR /app

# Copiamos solo lo necesario desde la etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.production .env


# Instalamos solo dependencias necesarias para producción
RUN npm install --omit=dev

# Puerto por defecto (opcional si usás Railway)
EXPOSE 3000

# Comando para ejecutar la app NestJS
CMD ["node", "dist/main.js"]
