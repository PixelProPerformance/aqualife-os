import os, sys, json, hashlib
sys.path.insert(0, '/app/ops/backup')
import backup
import psycopg2
from pathlib import Path

assert os.environ['RAILWAY_PROJECT_ID'] == 'f0a54aac-7782-432e-9339-77a261e2c4c8'
with backup.readonly_dsn() as dsn:
    backup.run(dsn)
c = psycopg2.connect(os.environ['DATABASE_URL'])
try:
    with c.cursor() as q:
        q.execute('SELECT current_database()')
        assert q.fetchone()[0] == 'aqualife_marketplace_staging'
    c.rollback()
    migration = Path('migrations/maintenance/0001_manual_packages.sql').read_text()
    migration = migration.replace('BEGIN;', '').replace('COMMIT;', '')
    for mode in ['REHEARSAL_ROLLED_BACK', 'APPLIED']:
        with c.cursor() as q:
            q.execute("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'")
            q.execute("SELECT pg_advisory_xact_lock(hashtext('manual-maintenance-migration'))")
        before = backup.manifest(c)
        with c.cursor() as q:
            q.execute(migration)
            q.execute(migration)
            q.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('manutencao_pacote_manual','manutencao_uso_manual')")
            assert q.fetchone()[0] == 2
        after = backup.manifest(c)
        assert all(after[k] == v for k,v in before.items()), 'EXISTING_DATA_CHANGED'
        if mode == 'APPLIED': c.commit()
        else: c.rollback()
        print(json.dumps({'result':'PASS','mode':mode,'existing_tables_unchanged':len(before),'idempotence_verified':True,'sql_sha256':hashlib.sha256(Path('migrations/maintenance/0001_manual_packages.sql').read_bytes()).hexdigest()}),flush=True)
finally:
    c.close()
os.execv('/usr/local/bin/node', ['node','ops/maintenance/validate.mjs'])
