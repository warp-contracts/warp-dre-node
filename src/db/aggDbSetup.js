const { drePool } = require('./nodeDb');

module.exports = {
  createAggDbTables: async () => {
    await drePool.query(`
        SET search_path TO 'dre';
        create table if not exists balances
        (
            wallet_address text,
            contract_tx_id text,
            token_ticker   text,
            sort_key       text,
            token_name     text,
            balance        text
        );

        create index if not exists balances_contract_tx_id_index
            on balances (contract_tx_id);

        create index if not exists balances_sort_key_index
            on balances (sort_key);

        create index if not exists balances_token_ticker_index
            on balances (token_ticker);

        create unique index if not exists balances_wallet_address_contract_tx_id_unique
            on balances (wallet_address, contract_tx_id);

        create index if not exists balances_wallet_address_index
            on balances (wallet_address);


        create table if not exists deployments
        (
            id             BIGSERIAL PRIMARY KEY,
            contract_tx_id text,
            tag_index_0    text,
            tag_index_1    text,
            tag_index_2    text,
            tag_index_3    text,
            tag_index_4    text
        );

        create index if not exists deployments_contract_tx_id_index
            on deployments (contract_tx_id);

        create unique index if not exists deployments_contract_tx_id_unique
            on deployments (contract_tx_id);

        create index if not exists deployments_tag_index_0_index
            on deployments (tag_index_0);

        create index if not exists deployments_tag_index_1_index
            on deployments (tag_index_1);

        create index if not exists deployments_tag_index_2_index
            on deployments (tag_index_2);

        create index if not exists deployments_tag_index_3_index
            on deployments (tag_index_3);

        create index if not exists deployments_tag_index_4_index
            on deployments (tag_index_4);

        create table if not exists interactions
        (
            id             text,
            contract_tx_id text,
            owner_address  text,
            block_height   integer,
            tag_index_0    text,
            tag_index_1    text,
            tag_index_2    text,
            tag_index_3    text,
            tag_index_4    text
        );

        create index if not exists interactions_contract_tx_id_index
            on interactions (contract_tx_id);

        create index if not exists interactions_id_index
            on interactions (id);

        create unique index if not exists interactions_id_unique
            on interactions (id);

        create index if not exists interactions_owner_address_index
            on interactions (owner_address);

        create index if not exists interactions_tag_index_0_index
            on interactions (tag_index_0);

        create index if not exists interactions_tag_index_1_index
            on interactions (tag_index_1);

        create index if not exists interactions_tag_index_2_index
            on interactions (tag_index_2);

        create index if not exists interactions_tag_index_3_index
            on interactions (tag_index_3);

        create index if not exists interactions_tag_index_4_index
            on interactions (tag_index_4);

        create table if not exists states
        (
            contract_tx_id text,
            sort_key       text,
            node           text,
            signature      text,
            manifest       json,
            state_hash     text,
            state          json
        );

        create index if not exists states_contract_tx_id_index
            on states (contract_tx_id);

        create unique index if not exists states_contract_tx_id_unique
            on states (contract_tx_id);

        create index if not exists states_node_index
            on states (node);

        create index if not exists states_signature_index
            on states (signature);

        create index if not exists states_sort_key_index
            on states (sort_key);

        create index if not exists states_state_hash_index
            on states (state_hash);
    `);
  }
};
