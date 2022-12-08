FROM node:18.12.1
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --frozen-lockfile
COPY .env.example .env
#COPY .env .env
COPY . .
VOLUME /app/sqlite

CMD ["node", "src/listener.js"]
