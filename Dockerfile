# backend Dockerfile
FROM node:21-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
# Starte den Server
CMD ["node", "src/server.js"]
