FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev && mkdir -p /app/data /app/backups && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/app/data/estoque.sqlite BACKUP_DIR=/app/backups
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm","start"]
