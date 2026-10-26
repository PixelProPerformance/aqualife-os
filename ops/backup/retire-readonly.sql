-- REVIEW ONLY: after the full backup/restore passes, and only after confirming
-- this exact temporary role is not referenced by any other service.
\set ON_ERROR_STOP on
SELECT count(*) AS connections_that_must_be_zero
FROM pg_stat_activity WHERE usename='aqualife_backup_ro_20261026';
-- Stop if any connection is still present; do not terminate other sessions.
BEGIN;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='aqualife_backup_ro_20261026') THEN
    RAISE EXCEPTION 'Temporary backup account still has active connections';
  END IF;
END $$;
REVOKE CONNECT ON DATABASE railway FROM aqualife_backup_ro_20261026;
REVOKE pg_read_all_data FROM aqualife_backup_ro_20261026;
DROP ROLE aqualife_backup_ro_20261026;
COMMIT;
-- Retire only the auxiliary service after checking its consumers and the
-- independent production deletion patch. Never accept that whole patch blindly.
