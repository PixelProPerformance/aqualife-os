import http from 'node:http';
import {spawn} from 'node:child_process';
import pg from 'pg';
import assert from 'node:assert/strict';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8','Only clever-youth is permitted');
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','no-verify');
const db=new pg.Client({connectionString:url.href});await db.connect();
assert.equal((await db.query('SELECT current_database() n')).rows[0].n,'aqualife_marketplace_staging');await db.end();
let result={status:'running',scope:'maintenance-ui-isolated-schema',commit:process.env.RAILWAY_GIT_COMMIT_SHA};
http.createServer((req,res)=>{res.writeHead(result.status==='pass'?200:503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(result));}).listen(Number(process.env.PORT||8080),'0.0.0.0');
const child=spawn(process.execPath,['--test','tests/manutencoes-manuais.test.mjs','tests/manutencoes-ui.test.mjs','tests/manutencoes-http.test.mjs'],{env:{...process.env,MAINTENANCE_TEST_DATABASE_URL:url.href},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',b=>process.stdout.write(b));child.stderr.on('data',b=>process.stderr.write(b));
child.on('exit',code=>{result={...result,status:code===0?'pass':'fail',exitCode:code};console.log(JSON.stringify(result));});

