import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  await knex(MetaTable.CHAT_MESSAGES).del();
  await knex(MetaTable.CHAT_SESSIONS).del();

  await knex.schema.alterTable(MetaTable.CHAT_SESSIONS, (table) => {
    table.string('base_id', 20);
  });
};

const down = async (knex: Knex) => {
  await knex.schema.alterTable(MetaTable.CHAT_SESSIONS, (table) => {
    table.dropColumn('base_id');
  });
};

export { up, down };
