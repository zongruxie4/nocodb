// Mirror the EE insert Oracle path: knex insert WITHOUT actor_id + .returning(actor_id)
const path = require('path');
const knexPkg = require(path.join(process.cwd(), 'node_modules/knex')) ;
const knex = knexPkg.knex || knexPkg;
(async () => {
  const kn = knex({
    client: 'oracledb',
    connection: { user: 'SAKILA0', password: 'Password123!', connectString: 'localhost:1521/FREEPDB1' },
    pool: { min: 0, max: 1 },
  });
  try {
    const trx = await kn.transaction();
    try {
      const rows = await trx('ACTOR')
        .insert({ FIRST_NAME: 'PROBE', LAST_NAME: 'PROBE', LAST_UPDATE: kn.fn.now() })
        .returning('ACTOR_ID');
      console.log('returning rows:', JSON.stringify(rows));
      await trx.rollback();
    } catch (e) {
      console.log('INSERT/RETURNING FAILED:', e.message.split('\n')[0]);
      await trx.rollback();
    }
  } catch (e) { console.error('ERR', e.message.split('\n')[0]); }
  finally { await kn.destroy(); }
})();
