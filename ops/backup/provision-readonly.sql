-- PROCEDURE FOR REVIEW ONLY. Not executed by the backup worker.
-- Run in psql as a database administrator after explicit approval.
-- First confirm the actual production database name; railway is the expected default.
\set ON_ERROR_STOP on
SELECT current_database() AS database_to_confirm;

-- Inspect candidate existing roles. This does not retrieve passwords.
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls, rolvaliduntil
FROM pg_roles
WHERE rolname ILIKE '%backup%' OR rolname ILIKE '%read%';

-- Stop here to review any existing dedicated account before creating a new one.
-- The following block intentionally fails if the chosen role already exists.
BEGIN;
SELECT (now() + interval '24 hours')::text AS backup_expiry \gset
CREATE ROLE aqualife_backup_ro_20261026
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 2 VALID UNTIL :'backup_expiry';
GRANT CONNECT ON DATABASE railway TO aqualife_backup_ro_20261026;
GRANT pg_read_all_data TO aqualife_backup_ro_20261026;
ALTER ROLE aqualife_backup_ro_20261026 SET default_transaction_read_only=on;
ALTER ROLE aqualife_backup_ro_20261026 SET statement_timeout='5min';
ALTER ROLE aqualife_backup_ro_20261026 SET lock_timeout='5s';
COMMIT;

-- psql prompts twice without displaying the password. Use a password manager.
-- Never paste the password or the connection URL into chat, code, or logs.
\password aqualife_backup_ro_20261026

-- Both queries below must return zero rows before connecting the worker.
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog','information_schema')
AND has_table_privilege('aqualife_backup_ro_20261026',
    quote_ident(schemaname)||'.'||quote_ident(tablename),
    'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER');
SELECT nspname FROM pg_namespace
WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
AND has_schema_privilege('aqualife_backup_ro_20261026', oid, 'CREATE');

-- In Railway, set BACKUP_DATABASE_URL as a SEALED variable only on
-- aqualife-backup-validation. Use this dedicated account and the existing
-- private PostgreSQL hostname, port and confirmed database name.
-- Do not replace DATABASE_URL on the application or PostgreSQL services.
-- No deployment should run until the credential and staging rehearsal pass.
