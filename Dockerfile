# Etapa de build
FROM node:20 as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g @nestjs/cli

COPY . .

RUN rm -rf dist
RUN nest build

# Etapa de producción
FROM node:20 as production

WORKDIR /app

# Copia los archivos necesarios desde la etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# ⚠️ Instalación en producción solo de dependencias necesarias
RUN npm install --omit=dev

# ⚠️ Asegurate de que este archivo exista
CMD ["node", "dist/main.js"]
