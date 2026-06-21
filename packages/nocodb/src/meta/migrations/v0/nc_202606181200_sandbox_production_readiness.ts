// src/meta/migrations/v0/nc_202606181200_sandbox_production_readiness.ts
import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  await knex.schema.alterTable(MetaTable.SANDBOXES, (table) => {
    table.string('merge_state', 20).notNullable().defaultTo('idle');
    table.text('merge_error');
    table.timestamp('merge_started_at');
    // One sandbox per production base — enforce at the DB so two concurrent
    // sandboxCreate calls cannot both pass the in-app "already has a sandbox"
    // check and create duplicate sandboxes for the same base.
    table.unique(['production_base_id'], 'nc_sandboxes_production_base_unique');
  });

  // Renumber any duplicate seq per sandbox before adding the unique constraint.
  // Ordered by (seq, created_at, id) to preserve existing intended order.
  const rows = await knex(MetaTable.SANDBOX_CHANGELOG)
    .select('id', 'fk_sandbox_id', 'seq', 'created_at')
    .orderBy([
      { column: 'fk_sandbox_id', order: 'asc' },
      { column: 'seq', order: 'asc' },
      { column: 'created_at', order: 'asc' },
      { column: 'id', order: 'asc' },
    ]);
  const counters: Record<string, number> = {};
  for (const r of rows) {
    const next = (counters[r.fk_sandbox_id] ?? 0) + 1;
    counters[r.fk_sandbox_id] = next;
    if (Number(r.seq) !== next) {
      await knex(MetaTable.SANDBOX_CHANGELOG)
        .where('id', r.id)
        .update({ seq: next });
    }
  }

  await knex.schema.alterTable(MetaTable.SANDBOX_CHANGELOG, (table) => {
    table.unique(['fk_sandbox_id', 'seq'], 'nc_scl_sandbox_seq_unique');
  });
};

const down = async (knex: Knex) => {
  await knex.schema.alterTable(MetaTable.SANDBOX_CHANGELOG, (table) => {
    table.dropUnique(['fk_sandbox_id', 'seq'], 'nc_scl_sandbox_seq_unique');
  });
  await knex.schema.alterTable(MetaTable.SANDBOXES, (table) => {
    table.dropUnique(
      ['production_base_id'],
      'nc_sandboxes_production_base_unique',
    );
    table.dropColumn('merge_state');
    table.dropColumn('merge_error');
    table.dropColumn('merge_started_at');
  });
};

export { up, down };
