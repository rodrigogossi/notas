FROM node:22-bookworm-slim AS build
WORKDIR /app
# Instala a partir da raiz do workspace — os pacotes usam hoisting do npm (ex: webdav-server só
# existe no node_modules raiz), então buildar cada pacote isolado (sem o contexto do workspace)
# quebra o "npm ci" por lockfile incompleto.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client/ client/
COPY server/ server/
RUN npm run build --workspace client
RUN npm run build --workspace server
RUN npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_CLIENT=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./server/public
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
