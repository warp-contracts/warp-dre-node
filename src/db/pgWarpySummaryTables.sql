
------------------------------------------------------------------------------
-- 1. Warpy Summary Tables - create user data for exports
--------------------------------------- The following script is used to
-- calculate the points for each user in the Warpy
-- apply seasons multipliers (enhanced balance)
-- gather user roles and messages sent
-- ================================================================================================ --
------------------------------ sum_seasons
drop table if exists warpy_seasons;
select * from warpy_seasons;
create table warpy_seasons
(
    id         BIGSERIAL PRIMARY KEY,
    row_seq    smallint NOT NULL,
    season     text     NOT NULL UNIQUE,
    label      text     NOT NULL,
    from_sk    text     NOT NULL,
    to_sk      text     NOT NULL,
    multiplier smallint NOT NULL
);
COMMENT ON COLUMN warpy_seasons.from_sk IS 'inclusive';
COMMENT ON COLUMN warpy_seasons.to_sk IS 'inclusive';

insert into warpy_seasons(row_seq, season, label, from_sk, to_sk, multiplier) values
                                (1, 'PreExpedition', 'Pre-Ekspedycja - DeltaPrime Quest: 17.10.2023 - 24.01.2024', '', '000001349490,1706056904583,04d4084ef8bdcc42905dab1d3f400b6f7da194002717553cc6d55e3caffe58cd', 5),
                                (2, 'DeltaPrime', 'DeltaPrime Quest - Sezon 1: 24.01.2024 - 21.03.2024', '000001349493,1706056945956,a1d15297855d6081dd0ed75f77eace9af93794efd8ea7fd5a44ef0668613ce15', '000001387595,1710980516602,9d4cace3ebd246f8968d2c5296112b5ac223839bf09c89db7ab01336b84e828f', 4),
                                (3, 'Season1', 'Sezon 1 - Sezon 2: 21.03.2024 - 2.07.2024', '000001387596,1710980603205,7aeef3e3955de6d028e3a5061998229b0f0f1e798aa41558de7df56180630ad9', '000001456486,1719879523778,0c84f9dc96dce55cc4e02da91fa8fd8aa3bc418fa98955a8d09a4c66f8dc3b33', 3),
                                (4, 'Season2', 'Sezon 2 - Sezon 3: 2.07.2024 - 26.11.2024', '000001456499,1719880865659,13d68fd7fd37b6f3fd21ba6d5906dcdc2c3a4d44aa4dcca2fa7516f816c3048f', '000001555402,1732580435490,a39952487e8b08c9da65a6bdd51f66727e021a140d8aa5115d88dd4b8e96ea27', 2),
                                (5, 'Season3', 'Sezon 3 - Teraz: 26.11.2024', '000001555425,1732582890887,a87f76abfd1fd363d30a6d863a246b5333ee099710df135999c1346bcf82d8fe', '000009999999,9999999999999,a87f76abfd1fd363d30a6d863a246b5333ee099710df135999c1346bcf82d8fe', 1);
------------------------------ / sum_seasons




------------------------------ warpy_state_users
select count(*) from warpy_state_users;
drop table if exists warpy_state_users;
create table warpy_state_users as
with last_state as (
    select
        value
    from warp.sort_key_cache
    where key = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
    order by sort_key desc
    limit 1
),
     state_user as (
         select u.key as id, u.value ->> 0 as wallet_address
         from last_state, jsonb_each(last_state.value -> 'users') as u
)
select *,
       0 as messages_count
from state_user;
create index idx_warpy_state_users_id on warpy_state_users (id);
alter table warpy_state_users add constraint unique_warpy_state_users_id unique (id);



--------- messages count
with messages as (
    select input ->> 'function' as fun,
           data ->> 'userId' as userId
    from dre.contract_event e
    where e.contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
), m_count as (
    select userId as user_id, count(*) as total from messages
    group by userId
)
update warpy_state_users set messages_count = m_count.total
from m_count
where m_count.user_id = warpy_state_users.id;
------------------------------ / warpy_state_users




------------------------------ warpy_season_user
drop table  warpy_season_user;
create table warpy_season_user
(
    wallet_address           text                           not null,
    user_id                  text not null references warpy_state_users(id),
    balance                  bigint default 0,
    season                   text not null default 'Season3' references warpy_seasons (season),
    season_points            bigint default 0               not null,
    season_points_multiplied bigint default 0               not null,
    balance_enhanced         bigint default 0               not null,
    unique (wallet_address, season),
    unique (user_id, season)
);

create index idx_sum_season_user_user_id on warpy_season_user (user_id);
create index idx_sum_season_user_wallet_address on warpy_season_user (wallet_address);

insert into warpy_season_user(user_id, wallet_address)
select u.id, u.wallet_address from warpy_state_users u;


update warpy_season_user
set balance = dre.balances.balance::bigint
from dre.balances
where dre.balances.wallet_address = warpy_season_user.wallet_address
and contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU';
------------------------------ / warpy_season_user

------------------- USERS update -------------------

----------- adding users' previous seasons
insert into warpy_season_user(wallet_address, user_id, balance, season)
select wallet_address, user_id, balance, 'Season2'
from warpy_season_user where warpy_season_user.season = 'Season3';


with items as (
    select input ->> 'function' as fun,
           jsonb_array_elements(coalesce(data -> 'users', jsonb_build_array(data))) as data
    from dre.contract_event e
             join warpy_seasons s on e.sort_key between s.from_sk and s.to_sk
    where e.contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
      and s.season = 'Season3'
),
     wrapped as (
         select
             data ->> 'userId' as userId,
             sum((data ->> 'points')::numeric) as points
         from items
         group by data ->> 'userId'
     )
update warpy_season_user
set balance = balance - wrapped.points
from wrapped
where true
  and warpy_season_user.season = 'Season2'
  and wrapped.userId = warpy_season_user.user_id;

insert into warpy_season_user(wallet_address, user_id, balance, season)
select wallet_address, user_id, balance, 'Season1'
from warpy_season_user where warpy_season_user.season = 'Season2';

with items as (
    select input ->> 'function' as fun,
           jsonb_array_elements(coalesce(data -> 'users', jsonb_build_array(data))) as data
    from dre.contract_event e
             join warpy_seasons s on e.sort_key between s.from_sk and s.to_sk
    where e.contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
      and s.season = 'Season2'
),
     wrapped as (
         select
             data ->> 'userId' as userId,
             sum((data ->> 'points')::numeric) as points
         from items
         group by data ->> 'userId'
     )
update warpy_season_user
set balance = balance - wrapped.points
from wrapped
where true
  and warpy_season_user.season = 'Season1'
  and wrapped.userId = warpy_season_user.user_id;
------------------
insert into warpy_season_user(wallet_address, user_id, balance, season)
select wallet_address, user_id, balance, 'DeltaPrime'
from warpy_season_user where warpy_season_user.season = 'Season1';

with items as (
    select input ->> 'function' as fun,
           jsonb_array_elements(coalesce(data -> 'users', jsonb_build_array(data))) as data
    from dre.contract_event e
             join warpy_seasons s on e.sort_key between s.from_sk and s.to_sk
    where e.contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
      and s.season = 'Season1'
),
     wrapped as (
         select
             data ->> 'userId' as userId,
             sum((data ->> 'points')::numeric) as points
         from items
         group by data ->> 'userId'
     )
update warpy_season_user
set balance = balance - wrapped.points
from wrapped
where true
  and warpy_season_user.season = 'DeltaPrime'
  and wrapped.userId = warpy_season_user.user_id;

insert into warpy_season_user(wallet_address, user_id, balance, season)
select wallet_address, user_id, balance, 'PreExpedition'
from warpy_season_user where warpy_season_user.season = 'DeltaPrime';


------------------- lower balance for previous seasons -------------------

select * from warpy_seasons;
with items as (
    select input ->> 'function' as fun,
           jsonb_array_elements(coalesce(data -> 'users', jsonb_build_array(data))) as data
    from dre.contract_event e
             join warpy_seasons s on e.sort_key between s.from_sk and s.to_sk
    where e.contract_tx_id = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU'
    and s.season = 'DeltaPrime'
),
    wrapped as (
        select
            data ->> 'userId' as userId,
            sum((data ->> 'points')::numeric) as points
        from items
        group by data ->> 'userId'
    )
update warpy_season_user
set balance = balance - wrapped.points
from wrapped
where true
  and warpy_season_user.season = 'PreExpedition'
  and wrapped.userId = warpy_season_user.user_id;


update warpy_season_user set balance = 0 where balance < 0;
update warpy_season_user set balance = 0 where balance is null;



----- calculating seasons points
update warpy_season_user current set season_points = current.balance - previous.balance
from warpy_season_user previous
where previous.user_id = current.user_id and current.season = 'Season3' and previous.season = 'Season2';

update warpy_season_user current set season_points = current.balance - previous.balance
from warpy_season_user previous
where previous.user_id = current.user_id and current.season = 'Season2' and previous.season = 'Season1';

update warpy_season_user current set season_points = current.balance - previous.balance
from warpy_season_user previous
where previous.user_id = current.user_id and current.season = 'Season1' and previous.season = 'DeltaPrime';

update warpy_season_user current set season_points = current.balance - previous.balance
from warpy_season_user previous
where previous.user_id = current.user_id and current.season = 'DeltaPrime' and previous.season = 'PreExpedition';

update warpy_season_user current set season_points = current.balance where season = 'PreExpedition';



----- Apply season multiplier
update warpy_season_user
set season_points_multiplied = warpy_season_user.season_points * s.multiplier
from warpy_seasons s
where s.season = warpy_season_user.season;


update warpy_season_user set balance_enhanced = season_points_multiplied where true;

update warpy_season_user c
set balance_enhanced = c.balance_enhanced + previous.balance_enhanced
from warpy_season_user previous
where true
  and c.season = 'DeltaPrime'
  and previous.season = 'PreExpedition'
  and previous.user_id = c.user_id;

update warpy_season_user c
set balance_enhanced = c.balance_enhanced + previous.balance_enhanced
from warpy_season_user previous
where true
  and c.season = 'Season1'
  and previous.season = 'DeltaPrime'
  and previous.user_id = c.user_id;

update warpy_season_user c
set balance_enhanced = c.balance_enhanced + previous.balance_enhanced
from warpy_season_user previous
where true
  and c.season = 'Season2'
  and previous.season = 'Season1'
  and previous.user_id = c.user_id;

update warpy_season_user c
set balance_enhanced = c.balance_enhanced + previous.balance_enhanced
from warpy_season_user previous
where true
  and c.season = 'Season3'
  and previous.season = 'Season2'
  and previous.user_id = c.user_id;



select * from warpy_season_user;
------------ FINITTTOOO

