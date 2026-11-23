FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
ENV HOST=0.0.0.0
ENV PORT=8787
ENV DATA_FILE=/data/activation-db.json
ENV TOKEN_PRIVATE_KEY_FILE=/run/secrets/activation_private_key
ENV TOKEN_PUBLIC_KEY_FILE=/run/secrets/activation_public_key
EXPOSE 8787
USER node
CMD ["node","server.mjs"]
