FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --include-workspace-root=false --include=dev

COPY backend ./backend
COPY specs/001-loja-koisabessa/contracts ./specs/001-loja-koisabessa/contracts
RUN install -d -o node -g node /app/backend/storage/uploads \
    && touch /app/backend/storage/uploads/.keep \
    && chown node:node /app/backend/storage/uploads/.keep

USER node
EXPOSE 3001
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && exec node backend/src/server.js"]
