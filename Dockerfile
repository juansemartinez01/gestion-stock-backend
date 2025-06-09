# --------------------------
# Etapa de build
# --------------------------
FROM node:20 as builder

WORKDIR /app

# Copiamos solo lo necesario para instalar dependencias
COPY package*.json ./

# Instalamos dependencias completas (incluye Nest CLI)
RUN npm install
RUN npm install -g @nestjs/cli

# Copiamos el resto del proyecto
COPY . .

# Compilamos la app NestJS (genera /dist)
RUN nest build


# --------------------------
# Etapa de producción
# --------------------------
FROM node:20 as production

WORKDIR /app

# Copiamos solo lo necesario desde el build
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Instalamos solo dependencias necesarias en producción
RUN npm install --omit=dev

# Comando de inicio
CMD ["node", "dist/main.js"]
