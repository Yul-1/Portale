# frontend/Dockerfile - Modifica SOLO la riga CMD finale

# Stage 1: Build the React application
FROM node:18-alpine AS builder

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --legacy-peer-deps

COPY . .

RUN npm run build

# Stage 2: Serve the production build with Nginx
FROM nginx:alpine

RUN addgroup -g 1001 -S nginxuser && \
    adduser -S nginxuser -u 1001 -G nginxuser && \
    mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginxuser:nginxuser /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginxuser:nginxuser /etc/nginx/conf.d

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx-frontend.conf /etc/nginx/conf.d/

COPY --from=builder /app/build /usr/share/nginx/html

USER nginxuser

EXPOSE 80

# MODIFICATO: Passa la direttiva PID come parte del comando.
CMD ["nginx", "-g", "daemon off; pid /tmp/nginx.pid;"] # <--- AGGIUNTO/MODIFICATO: PID su /tmp