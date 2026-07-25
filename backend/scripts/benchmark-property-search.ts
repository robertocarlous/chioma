#!/usr/bin/env ts-node
/**
 * Benchmark for property search query performance — issue #1425
 * (Unindexed Full-Text Search in Property Listings).
 *
 * Runs EXPLAIN ANALYZE for:
 *   1. The old unindexed `LOWER(title) LIKE LOWER('%...%')` pattern.
 *   2. The new `search_vector @@ plainto_tsquery(...)` + trigram ILIKE
 *      pattern used by PropertyQueryBuilder.applySearchFilter() after this
 *      fix.
 *
 * Prints the planner's chosen scan type (sequential vs index) and actual
 * execution time for each, against whatever data currently exists in the
 * `properties` table — run it before and after applying migrations
 * 1783000000000-AddPropertySearchIndexes and
 * 1900600000000-AddPropertyTrigramSearchIndexes to compare.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/benchmark-property-search.ts [searchTerm]
 */
import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';

const DEFAULT_SEARCH_TERM = 'apartment';

interface ExplainRow {
  'QUERY PLAN': string;
}

function summarize(rows: ExplainRow[]): {
  planText: string;
  scanType: string;
  executionTimeMs: number | null;
} {
  const planText = rows.map((r) => r['QUERY PLAN']).join('\n');
  const scanType = /Seq Scan/.test(planText)
    ? 'Sequential scan'
    : /Bitmap Index Scan|Index Scan|Bitmap Heap Scan/.test(planText)
      ? 'Index scan'
      : 'Unknown';
  const match = planText.match(/Execution Time: ([\d.]+) ms/);
  return {
    planText,
    scanType,
    executionTimeMs: match ? parseFloat(match[1]) : null,
  };
}

async function explain(
  label: string,
  query: string,
  params: unknown[],
): Promise<void> {
  const rows: ExplainRow[] = await AppDataSource.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`,
    params,
  );
  const { planText, scanType, executionTimeMs } = summarize(rows);

  console.log(`\n--- ${label} ---`);
  console.log(`Scan type: ${scanType}`);
  console.log(
    `Execution time: ${executionTimeMs !== null ? `${executionTimeMs} ms` : 'n/a'}`,
  );
  console.log(planText);
}

async function main() {
  const searchTerm = process.argv[2] || DEFAULT_SEARCH_TERM;

  await AppDataSource.initialize();
  console.log(`Connected to database: ${AppDataSource.options.database}`);
  console.log(`Search term: "${searchTerm}"`);

  const [{ count }] = await AppDataSource.query(
    `SELECT count(*)::int AS count FROM properties`,
  );
  console.log(`Rows in properties table: ${count}`);
  if (count < 1000) {
    console.log(
      'Note: index vs. sequential-scan differences are most visible on ' +
        'larger tables — Postgres may still choose a sequential scan on a ' +
        'small table even when a matching index exists, since it is ' +
        'cheaper for a handful of pages.',
    );
  }

  try {
    await explain(
      'BEFORE (unindexed LIKE, pre-fix behavior)',
      `SELECT id FROM properties
       WHERE (LOWER(title) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1))`,
      [`%${searchTerm}%`],
    );

    await explain(
      'AFTER (search_vector GIN + trigram GIN, current behavior)',
      `SELECT id FROM properties
       WHERE (search_vector @@ plainto_tsquery('english', $1)
              OR title ILIKE $2
              OR address ILIKE $2)`,
      [searchTerm, `%${searchTerm}%`],
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exitCode = 1;
});
