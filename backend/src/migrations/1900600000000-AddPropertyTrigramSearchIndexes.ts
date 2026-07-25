import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add trigram GIN indexes for LIKE/ILIKE property search — issue
 * #1425 (Unindexed Full-Text Search in Property Listings).
 *
 * `1783000000000-AddPropertySearchIndexes` already added a `search_vector`
 * tsvector column + GIN index for whole-word full-text search, but several
 * query paths still filter with `LIKE`/`ILIKE '%...%'` (substring and
 * prefix matching on title, address, city, state), which a tsvector index
 * cannot accelerate — Postgres falls back to a sequential scan for those.
 * `pg_trgm` GIN indexes are the standard fix: they support `LIKE`, `ILIKE`,
 * and similarity queries on arbitrary substrings.
 */
export class AddPropertyTrigramSearchIndexes1900600000000
  implements MigrationInterface
{
  name = 'AddPropertyTrigramSearchIndexes1900600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_title_trgm"
      ON "properties" USING GIN ("title" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_address_trgm"
      ON "properties" USING GIN ("address" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_city_trgm"
      ON "properties" USING GIN ("city" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_state_trgm"
      ON "properties" USING GIN ("state" gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_state_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_city_trgm"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_address_trgm"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_title_trgm"`);
    // Not dropping the pg_trgm extension: other indexes/queries in the
    // database may depend on it, and CREATE EXTENSION is idempotent.
  }
}
