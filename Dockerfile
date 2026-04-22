FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY assets/ ./assets/

CMD ["node", "assets/amazon_handler.js"]
