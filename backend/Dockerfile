FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npm install -g typescript && tsc

# --- Production image ---
FROM node:20-alpine

WORKDIR /app
RUN mkdir -p logs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 5000

CMD ["node", "dist/index.js"]
