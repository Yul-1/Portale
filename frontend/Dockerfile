FROM node:18-alpine

# Argomenti di build
ARG NODE_ENV=development

# Installa dipendenze di sistema necessarie
RUN apk add --no-cache python3 make g++ tini curl

# Crea directory di lavoro
WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm cache clean --force && \
    npm install --legacy-peer-deps && \
    npm cache clean --force

# Crea utente non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S react -u 1001 -G nodejs

# Copia il codice
COPY --chown=react:nodejs . .

# Imposta permessi
RUN mkdir -p /app/node_modules/.cache && \
    chown -R react:nodejs /app

# In produzione usa utente non-root
USER react

# Espone la porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Usa tini per gestione processi
ENTRYPOINT ["tini", "--"]

# Comando di default
CMD ["npm", "start"]