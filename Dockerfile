# Etapa 1: compila TypeScript
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Etapa 2: solo lo necesario para ejecutar (sin TypeScript ni dependencias de desarrollo)
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY docs ./docs
# No corre como root dentro del contenedor
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
