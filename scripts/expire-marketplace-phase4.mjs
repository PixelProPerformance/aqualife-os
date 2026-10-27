import assert from 'node:assert/strict';
import pg from 'pg';
import {registrarCarrinho} from '../src/marketplace/cart.js';
const staging=process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8';
assert.ok(staging||process.env.RAILWAY_PROJECT_ID==='5b0e93d9-9212-46ad-be57-90e4106a5452');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}),query=(...a)=>pool.query(...a);
try{assert.equal((await query('SELECT current_database() name')).rows[0].name,staging?'aqualife_marketplace_staging':'railway');
 const service=registrarCarrinho({app:{get(){},put(){},post(){}},query,exigeLogin(){},withTransaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}});
 const drain=process.argv.includes('--drain');const count=await (drain?service.drain():service.expire());if(drain)assert.equal((await query('SELECT count(*)::int n FROM marketplace_order_preparation WHERE closed_at IS NULL')).rows[0].n,0);
 console.log(JSON.stringify({result:'PASS',scope:drain?'PHASE4_DRAIN':'PHASE4_EXPIRATION',orders_released:count,commerce_enabled:false}));
}catch(e){console.error(JSON.stringify({result:'FAIL',code:e.code||e.name}));process.exitCode=1;}finally{await pool.end();}
