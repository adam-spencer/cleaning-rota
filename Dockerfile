FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# adapter-node bundles every dependency into build/, so the runtime image needs no node_modules.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	DB_PATH=/data/rota.db
RUN mkdir /data && chown node:node /data
COPY --from=build /app/package.json ./
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
	CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "build"]
