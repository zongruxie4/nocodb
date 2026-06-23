import { Injectable, Logger } from '@nestjs/common';
import debug from 'debug';
import { Column } from '~/models';
import { MetaTable } from '~/utils/globals';
import Noco from '~/Noco';

/**
 * One-time cleanup of orphaned cross-base link columns.
 *
 * A cross-base link (its `nc_col_relations_v2` row carries
 * `fk_related_base_id` pointing at a DIFFERENT base) whose related model has
 * since been deleted/trashed leaves the owning link column — and any
 * Rollup/Lookup built on it — dangling. Reads then degrade to `NC_ERROR` and,
 * once the related table is permanently purged, fail outright. Deletes created
 * after the teardown fix are cleaned at delete time; this reaps the ones that
 * predate it.
 *
 * Strategy (single pass over the meta DB, all workspaces/bases):
 *   1. SELECT cross-base relations only — `fk_related_base_id IS NOT NULL AND
 *      fk_related_base_id <> base_id` and not already soft-deleted. Cross-base
 *      links are rare, so this is a tiny result set even though the column is
 *      unindexed (one seq scan of a bounded meta table).
 *   2. For each, resolve the related model IN ITS OWN base. Orphan = the model
 *      row is gone OR flagged deleted.
 *   3. For an orphan: delete the dependent Rollup/Lookup columns first (they
 *      reference the link via `fk_relation_column_id`), then the link column —
 *      all via `Column.delete2` in the link's own base context, which removes
 *      the column + its colOptions and busts the cache.
 *
 * Idempotent — a re-run finds zero orphans. No-op on CE (no cross-base rows).
 * Best-effort per orphan: a failure is logged and skipped, never aborting the
 * whole job.
 */
@Injectable()
export class CleanupOrphanCrossBaseLinksMigration {
  private readonly debugLog = debug(
    'nc:migration-jobs:cleanup-orphan-cross-base-links',
  );
  private readonly logger = new Logger(
    CleanupOrphanCrossBaseLinksMigration.name,
  );

  async job() {
    const ncMeta = Noco.ncMeta;

    // 1. cross-base relations only (rare → tiny set). `fk_related_base_id` is
    //    the codebase's own cross-base marker (see getRelContext) and is set
    //    ONLY for cross-base links, so `whereNotNull` already isolates them.
    //    The `!== base_id` guard and the not-deleted filter run in JS to keep
    //    the query pure-knex (no raw SQL / dialect-specific operators) — it
    //    must run on any meta DB (pg / mysql / sqlite).
    const candidates = await ncMeta
      .knexConnection(MetaTable.COL_RELATIONS)
      .whereNotNull('fk_related_base_id');

    const crossBaseRelations = candidates.filter(
      (r) =>
        r.fk_related_base_id !== r.base_id && !r.deleted, // deleted: null | false | 0
    );

    let scanned = 0;
    let cleaned = 0;

    for (const rel of crossBaseRelations) {
      scanned++;

      // 2. resolve the related model in ITS OWN base; orphan = gone or deleted.
      const related = await ncMeta.metaGet2(
        rel.fk_workspace_id,
        rel.fk_related_base_id,
        MetaTable.MODELS,
        rel.fk_related_model_id,
      );
      if (related && !related.deleted) continue;

      const ctx = {
        workspace_id: rel.fk_workspace_id,
        base_id: rel.base_id,
      };

      try {
        // 3a. dependent Rollup/Lookup columns reference the link via
        //     fk_relation_column_id — remove them before the link itself.
        for (const depTable of [MetaTable.COL_ROLLUP, MetaTable.COL_LOOKUP]) {
          const deps = await ncMeta.metaList2(
            rel.fk_workspace_id,
            rel.base_id,
            depTable,
            { condition: { fk_relation_column_id: rel.fk_column_id } },
          );
          for (const dep of deps) {
            if (!dep.fk_column_id) continue;
            await Column.delete2(
              ctx,
              { id: dep.fk_column_id, includeDeleted: true },
              ncMeta,
            );
          }
        }

        // 3b. the orphaned link column itself.
        await Column.delete2(
          ctx,
          { id: rel.fk_column_id, includeDeleted: true },
          ncMeta,
        );
        cleaned++;
        this.debugLog(
          `cleaned orphan link ${rel.fk_column_id} in base ${rel.base_id} -> missing ${rel.fk_related_model_id}@${rel.fk_related_base_id}`,
        );
      } catch (e) {
        this.logger.warn(
          `Skipped orphan link ${rel.fk_column_id} (base ${rel.base_id}): ${e?.message}`,
          e?.stack,
        );
      }
    }

    this.logger.log(
      `cross-base orphan link cleanup: scanned ${scanned}, cleaned ${cleaned}`,
    );
    return true;
  }
}
