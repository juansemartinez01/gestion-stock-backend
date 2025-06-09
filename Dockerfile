# Etapa de build
FROM node:20 as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g @nestjs/cli

COPY . .

# 💥 Borra dist viejo antes de compilar
RUN rm -rf dist
RUN nest build

# Etapa de producción
FROM node:20 as production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --omit=dev

CMD ["node", "dist/main.js"]
