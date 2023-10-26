# Warp D.R.E.

A Delegated Resolution Environment for Warp Contracts.
Docs are available [here](https://academy.warp.cc/docs/dre/overview).


## Update mode
DRE can run in two different modes.
Each of them listens on gateways notification and registers new contracts, but upcoming new interactions are handled differently. 

#### Poll
Node fetches interactions directly from gateway in time intervals.
Interaction are grouped and executed sequentially.
This is the default mode.


#### Subscription
Node listens on new interactions events and evaluates contracts immediately after every interaction.
This offers a faster contract evaluation and serves the latest contract state 

Update mode can be set up using env config
``UPDATE_MODE='poll'`` or
``UPDATE_MODE='subscription'``

## Deployment

### 1.  Database
##### 1. Local env  
1. `npm run run-docker:local`
2. Confirm that database is running locally
```bash
docker ps -a

# should display something similar to:
CONTAINER ID   IMAGE              COMMAND                  CREATED          STATUS          PORTS                      NAMES
f240114e69a0   postgres:14        "docker-entrypoint.s…"   11 minutes ago   Up 11 minutes   0.0.0.0:21726->5432/tcp    dre-postgres
c3ee9a099cda   redis:7.0-alpine   "docker-entrypoint.s…"   11 minutes ago   Up 11 minutes   127.0.0.1:6379->6379/tcp   warp-dre-node-bullmq-1
```

3. Run database initialization script:
 `npm run db-setup:local` (the default password for user `postgres` is `postgres`)



##### 2. Prod env
TBA

### Starting DRE node
1. `npm install --force`
2. `npm install pm2 -g`
3. `cp .env.defaults .env`
4. Update `.env` config file.
   1. Set `NODE_JWK_KEY` with your Arweave wallet JWK
   2. Update `.env` passwords for your local postgres (only if you changed them!).
   3. Optionally you can change the 'UPDATE_MODE'. By default, it is set to poll mode.
5. `pm2 install pm2-logrotate` 
6. `pm2 start src/syncer.js`
7. `pm2 start src/listener.js`
