# GridSense 1.x API (legacy). Configuration comes from the environment
# (docker-compose.legacy.yml), not a baked-in .env file.
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 4000
# The old seed created a hard-coded account; it is intentionally not run.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
