# Warp D.R.E.

A Delegated Resolution Environment for Warp Contracts.
Docs are availalbe [here](https://academy.warp.cc/docs/dre/overview).


## Deployment

### 1.  Database
##### 1. Local env  
1. `docker-compose -f ./docker-compose-local.yml up -d postgres`
2. Confirm that database is running locally
```bash
docker ps -a

# should display something similar to:
CONTAINER ID   IMAGE         COMMAND                  CREATED         STATUS         PORTS                     NAMES
ac171f5f91f4   postgres:14   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:21726->5432/tcp   dre-postgres
```
3. Connect to database with your favourite client (eg. `psql`)
```bash
psql "postgresql://postgres:postgres@localhost:21726/dre-u"

# should connect to the local 'dre-u' database:
psql (16.0, server 14.9 (Debian 14.9-1.pgdg120+1))
Type "help" for help.

dre-u=#
```

4. Run database initialization script (while being connected to the `dre-u` database):
```postgresql
CREATE ROLE warp WITH LOGIN password '<WARP_SCHEMA_PASSWORD>';
GRANT warp TO postgres;
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION warp;

CREATE ROLE dre WITH LOGIN password '<DRE_SCHEMA_PASSWORD>';
GRANT dre TO postgres;
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION dre;

GRANT CONNECT ON DATABASE "dre-u" TO dre;
GRANT CONNECT ON DATABASE "dre-u" TO warp;
GRANT CREATE ON DATABASE "dre-u" TO warp;
GRANT CREATE ON DATABASE "dre-u" TO dre;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dre TO dre;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dre TO dre;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA warp TO warp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA warp TO warp;

GRANT USAGE ON SCHEMA warp to dre;
GRANT SELECT ON ALL TABLES IN SCHEMA warp TO dre;
```


##### 1. Prod env
TBA

### Starting DRE node
1. `npm install --force`
2. `npm install pm2 -g`

