// Temporary UI fixtures only; refuses every project/database except the named staging.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
try{
 await db.connect();assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'aqualife_marketplace_staging');
 const emails=['qa-mp2-owner-20261026@example.invalid','qa-mp2-admin-20261026@example.invalid'];
 if(process.argv.includes('--cleanup')){
  const ids=(await db.query('SELECT id FROM app_user WHERE email=ANY($1::text[]) AND name=$2',[emails,'SYNTHETIC-MP2-VISUAL'])).rows.map(r=>r.id);
  await db.query("UPDATE marketplace_seller SET status='suspended' WHERE id IN (SELECT seller_id FROM marketplace_seller_user WHERE user_id=ANY($1::uuid[]))",[ids]);
  await db.query('UPDATE marketplace_seller_user SET active=false WHERE user_id=ANY($1::uuid[])',[ids]);
  await db.query('UPDATE app_user SET ativo=false WHERE id=ANY($1::uuid[])',[ids]);
  await db.query("INSERT INTO revoked_token(jti,expires_at) SELECT jti,now()+interval '12 hours' FROM unnest($1::text[]) AS jti ON CONFLICT DO NOTHING",[JSON.parse(process.env.QA_TOKEN_JTIS||'[]')]);
  console.log(JSON.stringify({result:'PASS',visualUsersDisabled:ids.length}));
 }else{
  assert.ok(process.env.QA_PASSWORD?.length>=24);
  for(const [index,email] of emails.entries()){
   const existing=(await db.query('SELECT id,name,role FROM app_user WHERE email=$1',[email])).rows[0];
   if(existing){
    assert.equal(existing.name,'SYNTHETIC-MP2-VISUAL');assert.equal(existing.role,index?'admin':'cliente');
    await db.query('UPDATE app_user SET senha_hash=$2,ativo=true WHERE id=$1',[existing.id,await bcrypt.hash(process.env.QA_PASSWORD,10)]);
    continue;
   }
   const org=randomUUID(),id=randomUUID();await db.query('INSERT INTO organization(id,name) VALUES($1,$2)',[org,'SYNTHETIC-MP2-VISUAL']);
   await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,org,'SYNTHETIC-MP2-VISUAL',email,await bcrypt.hash(process.env.QA_PASSWORD,10),index?'admin':'cliente']);
  }
  console.log(JSON.stringify({result:'PASS',visualUsersCreated:2,syntheticOnly:true}));
 }
}catch(e){console.error(JSON.stringify({result:'FAIL',code:e.code||e.name}));process.exitCode=1;}finally{await db.end();}
