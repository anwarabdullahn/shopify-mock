# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3100

CMD ["npm", "start"]
