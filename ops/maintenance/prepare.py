import os, sys, json, hashlib, io, contextlib
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0, '/app/ops/backup')
import backup
import psycopg2
from pathlib import Path

project = os.environ['RAILWAY_PROJECT_ID']
staging = project == 'f0a54aac-7782-432e-9339-77a261e2c4c8'
assert staging or project == '5b0e93d9-9212-46ad-be57-90e4106a5452'
if os.environ.get('MANUAL_RELEASE_ACTION') in ('smoke','cleanup'):
    assert not staging
    if os.environ['MANUAL_RELEASE_ACTION'] == 'smoke':
        import boto3
        assert os.environ['BACKUP_BUCKET'] == os.environ['EXPECTED_BACKUP_BUCKET']
        client = boto3.client('s3',endpoint_url=os.environ['AWS_ENDPOINT_URL'])
        key = os.environ['RELEASE_BACKUP_KEY']
        head = client.head_object(Bucket=os.environ['EXPECTED_BACKUP_BUCKET'],Key=key)
        assert head['Metadata']['sha256'] == os.environ['RELEASE_BACKUP_SHA256']
        manifest = json.loads(client.get_object(Bucket=os.environ['EXPECTED_BACKUP_BUCKET'],Key=key+'.manifest.json')['Body'].read())
        assert manifest['sha256'] == os.environ['RELEASE_BACKUP_SHA256']
        assert manifest['full_isolated_restore_verified'] and manifest['remote_download_verified']
        print(json.dumps({'result':'PASS','scope':'EXPECTED_PRODUCTION_BUCKET_VERIFIED','bucket_resource':'aqualife-production-backups','sha256':manifest['sha256']}),flush=True)
    os.execv('/usr/local/bin/node', ['node','ops/maintenance/production-smoke.mjs'])
if not staging:
    evidence = json.loads(os.environ['MANUAL_RELEASE_EVIDENCE'])
    assert evidence['ci_commit'] == '26acb241cef349e88a3d8f0ed09e1ddfdb3a6869'
    assert evidence['ci_pass'] and evidence['staging_http_pass'] and evidence['staging_browser_pass']
    assert evidence['staging_deployment'] and evidence['production_backup_restored']
class AuditOutput(io.StringIO):
    def write(self, value):
        sys.__stdout__.write(value)
        sys.__stdout__.flush()
        return super().write(value)
audit = AuditOutput()
with contextlib.redirect_stdout(audit):
    with backup.readonly_dsn() as dsn:
        backup.run(dsn)
reports = [json.loads(line) for line in audit.getvalue().splitlines() if line.startswith('{')]
report = next(r for r in reports if r.get('result') == 'PASS')
assert report['remote_download_verified'] and report['full_isolated_restore_verified']
assert report['unvalidated_constraints'] == 0
endpoint = os.environ['AWS_ENDPOINT_URL'].rstrip('/')
anonymous_url = endpoint.replace('://', '://' + os.environ['BACKUP_BUCKET'] + '.', 1) + '/' + report['bucket_key']
try:
    with urlopen(Request(anonymous_url, method='HEAD'),timeout=30) as response:
        anonymous_status = response.status
except HTTPError as e:
    anonymous_status = e.code
assert anonymous_status in (403,404), 'BACKUP_ANONYMOUS_ACCESS_NOT_DENIED'
print(json.dumps({'result':'PASS','scope':'PRIVATE_BACKUP_ACCESS','anonymous_http_status':anonymous_status}),flush=True)
c = psycopg2.connect(os.environ['DATABASE_URL'])
c.set_session(isolation_level='REPEATABLE READ')
try:
    with c.cursor() as q:
        q.execute('SELECT current_database()')
        assert q.fetchone()[0] == ('aqualife_marketplace_staging' if staging else 'railway')
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
if staging:
    os.execv('/usr/local/bin/node', ['node','ops/maintenance/validate.mjs'])
print(json.dumps({'result':'PASS','scope':'PRODUCTION_MIGRATION_ONLY','application_not_deployed':True}),flush=True)
