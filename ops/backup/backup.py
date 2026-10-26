"""One-shot read-only database backup, remote round-trip and isolated full restore.

Never accepts administrator credentials. No credentials or rows are logged.
Production execution requires a separately provisioned BACKUP_DATABASE_URL.
"""
import hashlib
import json
import os
import subprocess
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path

import boto3
from botocore.config import Config
import psycopg2
from psycopg2 import sql
from psycopg2.extras import NamedTupleCursor
from psycopg2.extensions import make_dsn, parse_dsn
from boto3.s3.transfer import TransferConfig


def command(args, env=None, timeout=900):
    # Suppress subprocess output: pg tools can include connection details/data.
    subprocess.run(args, env=env, check=True, timeout=timeout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def digest_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def schema_digest(path):
    lines = Path(path).read_text().splitlines()
    normalized = "\n".join(line for line in lines if line.strip() and not line.startswith(("--", "\\restrict ", "\\unrestrict ")))
    return hashlib.sha256(normalized.encode()).hexdigest()


def sequences(connection):
    result = {}
    with connection.cursor() as cur:
        cur.execute("SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2")
        for schema, name in cur.fetchall():
            cur.execute(sql.SQL("SELECT last_value,is_called FROM {}.{}").format(sql.Identifier(schema), sql.Identifier(name)))
            result[f"{schema}.{name}"] = list(cur.fetchone())
    return result


def manifest(connection):
    """Order-independent SHA256 multiset sums and exact row counts, no row output."""
    result = {}
    with connection.cursor() as cur:
        cur.execute("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2")
        tables = cur.fetchall()
    for schema, table in tables:
        count, total = 0, 0
        with connection.cursor(name="backup_digest", cursor_factory=NamedTupleCursor) as cur:
            cur.itersize = 1000
            cur.execute(sql.SQL("SELECT row_to_json(t)::text AS value FROM {}.{} t").format(sql.Identifier(schema), sql.Identifier(table)))
            for row in cur:
                total = (total + int.from_bytes(hashlib.sha256(row.value.encode()).digest(), "big")) % (1 << 256)
                count += 1
        result[f"{schema}.{table}"] = {"rows": count, "multiset_sha256_sum": f"{total:064x}"}
    return result


@contextmanager
def readonly_dsn():
    dsn = os.environ.get("BACKUP_DATABASE_URL")
    bootstrap, temporary_role = None, None
    if not dsn:
        # Synthetic staging rehearsal only. Production never receives admin credentials.
        if os.environ.get("RAILWAY_PROJECT_ID") != "f0a54aac-7782-432e-9339-77a261e2c4c8":
            raise RuntimeError("EXCLUSIVE_READONLY_CREDENTIAL_REQUIRED")
        bootstrap = psycopg2.connect(os.environ["DATABASE_URL"])
        bootstrap.autocommit = True
    try:
        if bootstrap:
            with bootstrap.cursor() as cur:
                cur.execute("SELECT current_database()")
                if cur.fetchone()[0] != "aqualife_marketplace_staging":
                    raise RuntimeError("STAGING_BOOTSTRAP_GUARD_FAILED")
                role_name = "staging_backup_" + uuid.uuid4().hex
                password = uuid.uuid4().hex + uuid.uuid4().hex
                cur.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 VALID UNTIL {}").format(sql.Identifier(role_name), sql.Literal(password), sql.Literal((datetime.now(timezone.utc) + timedelta(hours=1)).isoformat())))
                temporary_role = role_name
                cur.execute(sql.SQL("GRANT pg_read_all_data TO {}").format(sql.Identifier(temporary_role)))
                cur.execute(sql.SQL("ALTER ROLE {} SET default_transaction_read_only=on").format(sql.Identifier(temporary_role)))
            dsn = make_dsn(**{**parse_dsn(os.environ["DATABASE_URL"]), "user": temporary_role, "password": password})
        yield dsn
    finally:
        if bootstrap:
            try:
                if temporary_role:
                    with bootstrap.cursor() as cur:
                        cur.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(temporary_role)))
            finally:
                bootstrap.close()


def run(dsn):
    if os.environ.get("RAILWAY_PROJECT_ID") not in ("f0a54aac-7782-432e-9339-77a261e2c4c8", "5b0e93d9-9212-46ad-be57-90e4106a5452"):
        raise RuntimeError("PROJECT_NOT_ALLOWED")
    bucket = os.environ["BACKUP_BUCKET"]
    endpoint = os.environ["AWS_ENDPOINT_URL"]
    if not endpoint.startswith("https://"):
        raise RuntimeError("BUCKET_REQUIRES_TLS")
    expected_database = os.environ["BACKUP_EXPECTED_DATABASE"]
    if expected_database == "postgres":
        raise RuntimeError("RESTORE_DATABASE_NAME_CONFLICT")
    created = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"postgres/{expected_database}/{created}-{uuid.uuid4()}/database.dump"
    client = boto3.client("s3", endpoint_url=endpoint, config=Config(s3={"addressing_style": "virtual"}, retries={"max_attempts": 3}))
    source_env = {**os.environ, "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=300000 -c lock_timeout=5000", "PGDATABASE": dsn}
    source = psycopg2.connect(dsn, options="-c default_transaction_read_only=on -c statement_timeout=300000 -c lock_timeout=5000 -c timezone=UTC -c extra_float_digits=3")
    try:
        source.set_session(isolation_level="REPEATABLE READ", readonly=True)
        with source.cursor() as cur:
            cur.execute("SELECT current_database(), current_setting('transaction_read_only')")
            database, readonly = cur.fetchone()
            if database != expected_database or readonly != "on":
                raise RuntimeError("SOURCE_GUARD_FAILED")
            cur.execute("SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user")
            if any(cur.fetchone()):
                raise RuntimeError("PRIVILEGED_BACKUP_ROLE_REFUSED")
            cur.execute("SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND has_table_privilege(current_user, quote_ident(schemaname)||'.'||quote_ident(tablename), 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')")
            if cur.fetchone()[0]:
                raise RuntimeError("WRITE_CAPABLE_BACKUP_ROLE_REFUSED")
            cur.execute("SELECT pg_export_snapshot()")
            snapshot = cur.fetchone()[0]
        with tempfile.TemporaryDirectory(prefix="aqualife-backup-") as temp:
            root = Path(temp)
            dump = root / "database.dump"
            command(["pg_dump", "--format=custom", "--compress=1", "--lock-wait-timeout=5s", f"--snapshot={snapshot}", "--file", str(dump)], source_env)
            print(json.dumps({"step": "dump_complete"}), flush=True)
            command(["pg_dump", "--schema-only", "--no-owner", "--no-privileges", "--no-comments", f"--snapshot={snapshot}", "--file", str(root / "source-schema.sql")], source_env)
            before = manifest(source)
            source_sequences = sequences(source)
            source.rollback()
            sha = digest_file(dump)
            transfer = TransferConfig(max_concurrency=1, use_threads=False)
            client.upload_file(str(dump), bucket, key, ExtraArgs={"Metadata": {"sha256": sha}}, Config=transfer)
            print(json.dumps({"step": "private_upload_complete"}), flush=True)
            downloaded = root / "downloaded.dump"
            client.download_file(bucket, key, str(downloaded), Config=transfer)
            if digest_file(downloaded) != sha:
                raise RuntimeError("REMOTE_CHECKSUM_MISMATCH")
            print(json.dumps({"step": "remote_checksum_verified"}), flush=True)
            data, socket = root / "pgdata", root / "socket"
            socket.mkdir()
            # Local-only PostgreSQL. It has no TCP listener and never uses source credentials.
            local_env = {k: v for k, v in os.environ.items() if not k.startswith("PG") and k not in ("DATABASE_URL", "BACKUP_DATABASE_URL")}
            local_env.update(PGHOST=str(socket), PGPORT="55432", PGUSER="postgres", PGDATABASE="postgres")
            command(["initdb", "-D", str(data), "-U", "postgres", "--no-locale", "--encoding=UTF8", "--auth=trust"], local_env)
            command(["pg_ctl", "-D", str(data), "-l", str(root / "restore.log"), "-o", f"-c listen_addresses='' -k {socket} -p 55432", "-w", "start"], local_env)
            try:
                command(["pg_restore", "--create", "--exit-on-error", "--no-owner", "--no-privileges", "--dbname=postgres", str(downloaded)], local_env)
                print(json.dumps({"step": "isolated_restore_complete"}), flush=True)
                restored = psycopg2.connect(host=str(socket), port=55432, user="postgres", dbname=database, options="-c timezone=UTC -c extra_float_digits=3")
                try:
                    after = manifest(restored)
                    if before != after:
                        raise RuntimeError("RESTORED_DATA_MISMATCH")
                    if source_sequences != sequences(restored):
                        raise RuntimeError("RESTORED_SEQUENCE_MISMATCH_OR_CONCURRENT_WRITES")
                    command(["pg_dump", "--schema-only", "--no-owner", "--no-privileges", "--no-comments", "--file", str(root / "restore-schema.sql")], {**local_env, "PGDATABASE": database})
                    schema_sha = schema_digest(root / "source-schema.sql")
                    if schema_sha != schema_digest(root / "restore-schema.sql"):
                        raise RuntimeError("RESTORED_SCHEMA_MISMATCH")
                    with restored.cursor() as cur:
                        cur.execute("SELECT count(*) FROM pg_constraint WHERE NOT convalidated")
                        unvalidated = cur.fetchone()[0]
                finally:
                    restored.close()
            finally:
                command(["pg_ctl", "-D", str(data), "-m", "fast", "-w", "stop"], local_env)
            report = {"result": "PASS", "created_at_utc": created, "bucket_key": key, "database": database, "bytes": dump.stat().st_size, "sha256": sha, "schema_sha256": schema_sha, "sequences_verified": len(source_sequences), "tables": len(before), "rows": sum(t["rows"] for t in before.values()), "remote_download_verified": True, "full_isolated_restore_verified": True, "unvalidated_constraints": unvalidated, "table_manifest": before, "roles_and_service_configuration_backed_up": False}
            client.put_object(Bucket=bucket, Key=key + ".manifest.json", Body=json.dumps(report).encode(), ContentType="application/json")
            # Report aggregate evidence only. No row values, passwords, SQL or signed URLs.
            print(json.dumps({k: v for k, v in report.items() if k != "table_manifest"}), flush=True)
    finally:
        source.close()


if __name__ == "__main__":
    try:
        with readonly_dsn() as dsn:
            run(dsn)
    except Exception as error:
        print(json.dumps({"result": "FAIL", "error_type": type(error).__name__, "sqlstate": getattr(error, "pgcode", None), "reason": str(error) if isinstance(error, RuntimeError) else None, "command": Path(error.cmd[0]).name if isinstance(error, subprocess.CalledProcessError) else None, "details_redacted": True}), flush=True)
        raise SystemExit(1)
