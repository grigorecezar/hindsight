/**
 * Every third party we read calls from. Stored as text (not a Postgres
 * enum), so adding a source never needs a migration.
 */
export enum SourceId {
  SEEKING_ALPHA = 'SEEKING_ALPHA',
}
