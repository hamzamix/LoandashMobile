FROM node:20-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev && npm rebuild better-sqlite3

FROM node:20-slim

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY --from=build /app/dist ./dist/

RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server/index.js"]
