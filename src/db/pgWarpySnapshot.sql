------------------------------------------------------------------------------
-- 2b. Warpy Summary Tables - extended export for widget
-- This is a script that generates data required by widget using tables generated using pgWarpySummaryTables.sql

with user_role as (
    select uhr.user_id, uhr.username, role
    from warpy_user_handler_roles uhr, unnest(uhr.roles) role
),
     roles_ranked as (
         select user_role.*,
                warpy_role.value,
                rank() over (partition by user_id order by id asc) as rank
         from user_role
                  join warpy_role on warpy_role.role = user_role.role
     ),
     user_3roles as (
         select user_id,
                username,
                string_agg(case when rank = 1 then role end, ',') as role1,
                string_agg(case when rank = 2 then role end, ',') as role2,
                string_agg(case when rank = 3 then role end, ',') as role3,
                count(*) as roles_count,
                sum(value) as roles_value_sum
         from roles_ranked

         group by user_id, username
     ),
     seasons_sum as (
         select wallet_address, count(*) as count
         from warpy_season_user
         where season_points > 0
         group by wallet_address
     )
select
    user_3roles.user_id,
    lower(sumu.wallet_address),
    sha256(lower(sumu.wallet_address)::bytea) as wallet_sha256,
    user_3roles.username,
    user_3roles.role1,
    user_3roles.role2,
    user_3roles.role3,
    user_3roles.roles_count,
    seasons_sum.count as seasons_count,
    sumu.messages_count,
    season.balance_enhanced as balance
-- select count(*)
from user_3roles
         join warpy_state_users sumu on sumu.id = user_3roles.user_id
         join warpy_season_user season on sumu.id = season.user_id and season.season = 'Season3'
         join seasons_sum on seasons_sum.wallet_address = sumu.wallet_address
where roles_value_sum >= 3
  and season.balance >= 100000;