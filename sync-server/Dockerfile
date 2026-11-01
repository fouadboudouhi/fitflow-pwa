FROM node:22-alpine
WORKDIR /app
COPY package.json server.js admin.js ./
USER node
ENV DATA_DIR=/data
CMD ["node", "server.js"]
