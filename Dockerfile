FROM node:18.12.1
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --frozen-lockfile
COPY . .
COPY .env.example .env
VOLUME /app/sqlite
VOLUME /app/cache

CMD ["node", "src/listener.js"]
