"""One-shot read-only database backup, remote round-trip and isolated full restore.

Backup extraction never accepts administrator credentials. No secrets are logged.
Explicitly authorized bootstrap uses admin only to create/retire a read-only role.
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
    result = subprocess.run(args, env=env, timeout=timeout, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if result.returncode:
        diagnostic = result.stderr.decode(errors="replace")
        reason = "PG_TOOL_FAILED"
        for fragment, code in [("permission denied", "PERMISSION_DENIED"), ("does not exist", "OBJECT_OR_DATABASE_MISSING"), ("password authentication failed", "AUTHENTICATION_FAILED"), ("connection", "CONNECTION_FAILED"), ("version mismatch", "PG_VERSION_MISMATCH"), ("invalid locale", "LOCALE_UNAVAILABLE")]:
            if fragment in diagnostic:
                reason = code
                break
        print(json.dumps({"step": Path(args[0]).name, "exit_code": result.returncode, "reason": reason}), flush=True)
        raise subprocess.CalledProcessError(result.returncode, args)


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
        project = os.environ.get("RAILWAY_PROJECT_ID")
        staging = project == "f0a54aac-7782-432e-9339-77a261e2c4c8"
        authorized_production = project == "5b0e93d9-9212-46ad-be57-90e4106a5452" and os.environ.get("BACKUP_BOOTSTRAP_AUTHORIZED") == "temporary-read-role-only-20261026"
        if not staging and not authorized_production:
            raise RuntimeError("EXCLUSIVE_READONLY_CREDENTIAL_REQUIRED")
        bootstrap_dsn = os.environ["DATABASE_URL"] if staging else os.environ.pop("BACKUP_BOOTSTRAP_DSN")
        bootstrap = psycopg2.connect(bootstrap_dsn)
        bootstrap.autocommit = True
    try:
        if bootstrap:
            with bootstrap.cursor() as cur:
                cur.execute("SELECT current_database()")
                if cur.fetchone()[0] != os.environ["BACKUP_EXPECTED_DATABASE"]:
                    raise RuntimeError("BOOTSTRAP_DATABASE_GUARD_FAILED")
                cur.execute("SELECT count(*) FROM pg_roles WHERE rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls AND (rolname ILIKE '%backup%' OR rolname ILIKE '%read%')")
                print(json.dumps({"existing_read_role_candidates": cur.fetchone()[0], "existing_accounts_modified": False}), flush=True)
                role_name = ("staging_backup_" if staging else "aqualife_backup_") + uuid.uuid4().hex
                password = uuid.uuid4().hex + uuid.uuid4().hex
                cur.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 VALID UNTIL {}").format(sql.Identifier(role_name), sql.Literal(password), sql.Literal((datetime.now(timezone.utc) + timedelta(hours=1)).isoformat())))
                temporary_role = role_name
                cur.execute(sql.SQL("GRANT pg_read_all_data TO {}").format(sql.Identifier(temporary_role)))
                cur.execute(sql.SQL("ALTER ROLE {} SET default_transaction_read_only=on").format(sql.Identifier(temporary_role)))
            dsn = make_dsn(**{**parse_dsn(bootstrap_dsn), "user": temporary_role, "password": password})
        yield dsn
    finally:
        if bootstrap:
            try:
                if temporary_role:
                    with bootstrap.cursor() as cur:
                        cur.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(temporary_role)))
                    print(json.dumps({"temporary_read_role_retired": True}), flush=True)
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
    tool_env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG", "LC_ALL") if k in os.environ}
    source_env = {**tool_env, "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=300000 -c lock_timeout=5000"}
    connection_keys = {"host": "PGHOST", "port": "PGPORT", "dbname": "PGDATABASE", "user": "PGUSER", "password": "PGPASSWORD", "sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT", "sslcert": "PGSSLCERT", "sslkey": "PGSSLKEY"}
    for name, value in parse_dsn(dsn).items():
        if name in connection_keys:
            source_env[connection_keys[name]] = value
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
            cur.execute("SELECT count(*) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema' AND has_schema_privilege(current_user,oid,'CREATE')")
            if cur.fetchone()[0]:
                raise RuntimeError("DDL_CAPABLE_BACKUP_ROLE_REFUSED")
            cur.execute("SELECT has_database_privilege(current_user,current_database(),'CREATE')")
            if cur.fetchone()[0]:
                raise RuntimeError("DATABASE_CREATE_PRIVILEGE_REFUSED")
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
            local_env = dict(tool_env)
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


def legacy_preflight(dsn):
    checks = {
        "orphan_variations": "SELECT count(*) FROM loja_variacao v LEFT JOIN loja_produto p ON p.id=v.produto_id WHERE p.id IS NULL",
        "invalid_variations": "SELECT count(*) FROM loja_variacao WHERE preco_cents<0 OR preco_promo_cents<0 OR estoque<0",
        "invalid_order_items": "SELECT count(*) FROM loja_pedido_item WHERE qty<=0 OR preco_cents<0 OR subtotal_cents<>preco_cents::bigint*qty",
        "orphan_order_items": "SELECT count(*) FROM loja_pedido_item i LEFT JOIN loja_pedido p ON p.id=i.pedido_id WHERE p.id IS NULL",
        "order_total_mismatches": "SELECT count(*) FROM loja_pedido WHERE subtotal_cents::bigint+frete_cents-desconto_cents<>total_cents",
        "order_subtotal_mismatches": "SELECT count(*) FROM loja_pedido p LEFT JOIN (SELECT pedido_id,sum(subtotal_cents)::bigint subtotal FROM loja_pedido_item GROUP BY pedido_id) i ON i.pedido_id=p.id WHERE p.subtotal_cents<>coalesce(i.subtotal,0)",
        "inventory_ledger_mismatches": "SELECT count(*) FROM loja_variacao v LEFT JOIN (SELECT variacao_id,sum(qty)::bigint saldo FROM estoque_mov GROUP BY variacao_id) m ON m.variacao_id=v.id WHERE v.estoque<>coalesce(m.saldo,0)",
        "orphan_movements": "SELECT count(*) FROM estoque_mov m LEFT JOIN loja_variacao v ON v.id=m.variacao_id WHERE v.id IS NULL",
    }
    connection = psycopg2.connect(dsn, options="-c default_transaction_read_only=on -c statement_timeout=60000 -c lock_timeout=5000")
    try:
        connection.set_session(isolation_level="REPEATABLE READ", readonly=True)
        with connection.cursor() as cur:
            cur.execute("SELECT current_database()")
            if cur.fetchone()[0] != os.environ["BACKUP_EXPECTED_DATABASE"]:
                raise RuntimeError("PREFLIGHT_DATABASE_GUARD_FAILED")
            cur.execute("SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user")
            if any(cur.fetchone()):
                raise RuntimeError("PREFLIGHT_ADMIN_REFUSED")
            findings, counts = {}, {}
            for name, statement in checks.items():
                cur.execute(statement)
                findings[name] = cur.fetchone()[0]
            for name in ("loja_produto", "loja_variacao", "loja_pedido", "loja_pedido_item", "estoque_mov"):
                cur.execute(sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(name)))
                counts[name] = cur.fetchone()[0]
            cur.execute("SELECT valor FROM integracao_config WHERE chave='nfe_config'")
            row = cur.fetchone()
            try:
                emit = json.loads(row[0] if row else "{}").get("emit", {})
                fiscal_identity_available = bool(emit.get("razao") and len(emit.get("cnpj", "")) == 14)
            except (ValueError, TypeError):
                fiscal_identity_available = False
            print(json.dumps({"result": "PASS" if not any(findings.values()) else "RECONCILIATION_BLOCKED", "mode": "READ_ONLY_PREFLIGHT", "counts": counts, "findings": findings, "fiscal_identity_available": fiscal_identity_available}), flush=True)
    finally:
        connection.close()


if __name__ == "__main__":
    try:
        with readonly_dsn() as dsn:
            if os.environ.get("BACKUP_ACTION") == "legacy-preflight":
                legacy_preflight(dsn)
            else:
                run(dsn)
    except Exception as error:
        print(json.dumps({"result": "FAIL", "error_type": type(error).__name__, "sqlstate": getattr(error, "pgcode", None), "reason": str(error) if isinstance(error, RuntimeError) else None, "command": Path(error.cmd[0]).name if isinstance(error, subprocess.CalledProcessError) else None, "details_redacted": True}), flush=True)
        raise SystemExit(1)
