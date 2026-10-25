FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# ponytail: also installs the frontend deps (they live in "dependencies"); ~100 MB, split if image size matters.
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY server/migrations ./server/migrations
USER node
EXPOSE 3000
CMD ["node", "dist-server/index.js"]
