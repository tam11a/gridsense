# GridSense 1.x dashboard (legacy). NEXT_PUBLIC_* values are baked in at build.
FROM node:18-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MQTT_BROKER
ARG NEXT_PUBLIC_MQTT_BROKER_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_MQTT_BROKER=$NEXT_PUBLIC_MQTT_BROKER \
    NEXT_PUBLIC_MQTT_BROKER_URL=$NEXT_PUBLIC_MQTT_BROKER_URL \
    NODE_ENV=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
