FROM node:20-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY docker-entrypoint.sh ./
RUN chmod 755 /app/docker-entrypoint.sh
ENV HOST=0.0.0.0
ENV PORT=8787
ENV DATA_FILE=/data/activation-db.json
EXPOSE 8787
ENTRYPOINT ["/app/docker-entrypoint.sh"]
