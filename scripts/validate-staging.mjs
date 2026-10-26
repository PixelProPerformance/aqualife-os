import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';

// This script must never run against production, including a misconfigured URL.
assert.equal(process.env.RAILWAY_PROJECT_ID, 'f0a54aac-7782-432e-9339-77a261e2c4c8');
const base = 'https://aqualife-os-production-a81a.up.railway.app';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const users = [], tokens = [];
const run = `SYNTHETIC-${randomUUID()}`;
const password = randomBytes(32).toString('base64url');
let lastStep = 'connect';
async function request(route, { token, body, method = body ? 'POST' : 'GET', expected = 200 } = {}) {
  lastStep = `${method} ${route}`;
  const multipart = body instanceof FormData;
  const response = await fetch(base + route, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body && !multipart ? { 'content-type': 'application/json' } : {}) }, body: body ? (multipart ? body : JSON.stringify(body)) : undefined, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, expected, lastStep);
  console.log(JSON.stringify({ step: lastStep, status: response.status, ok: true }));
  return response.json();
}
async function account(role) {
  const org = randomUUID(), id = randomUUID(), email = `${id}@example.invalid`;
  await db.query('INSERT INTO organization(id,name) VALUES($1,$2)', [org, run]);
  await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)', [id, org, run, email, await bcrypt.hash(password, 10), role]);
  users.push(id);
  const login = await request('/api/login', { body: { email, senha: password } });
  assert.ok(login.token); tokens.push(login.token);
  return { id, org, token: login.token };
}
try {
  await db.connect();
  assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, 'aqualife_marketplace_staging');
  // Abort before creating fixtures if any external integration is configured.
  assert.equal(Number((await db.query("SELECT count(*) AS n FROM integracao_config WHERE valor IS NOT NULL AND valor <> '' AND chave IN ('cloudinary_cloud_name','smtp_host','resend_api_key','mercadopago_access_token','melhorenvio_token','focusnfe_token','meta_capi_token')")).rows[0].n), 0);
  const admin = await account('admin'), client = await account('cliente'), other = await account('cliente');
  await request('/api/dashboard', { token: client.token });
  await request('/api/academy/cursos', { token: client.token, expected: 402 });
  await db.query("INSERT INTO subscription(user_id,organization_id,price_cents,status,current_period_end) VALUES($1,$2,0,'ativa',now()+interval '1 day')", [client.id, client.org]);
  const course = await request('/api/admin/academy/cursos', { token: admin.token, body: { titulo: run, publicado: true }, expected: 201 });
  const lesson = await request(`/api/admin/academy/cursos/${course.id}/aulas`, { token: admin.token, body: { titulo: run, conteudo: '<p>Conteúdo fictício de homologação.</p>' }, expected: 201 });
  const courses = await request('/api/academy/cursos', { token: client.token });
  assert.ok(courses.some(c => c.id === course.id));
  await request(`/api/academy/cursos/${course.id}`, { token: client.token });
  await request(`/api/academy/cursos/${course.id}/aula/${lesson.id}/concluir`, { token: client.token, body: {} });
  const aquarium = await request('/api/aquarios', { token: client.token, body: { name: run, water_type: 'freshwater', volume_liters: 100 }, expected: 201 });
  await request(`/api/aquarios/${aquarium.id}`, { token: other.token, method: 'PUT', body: { name: 'forbidden' }, expected: 404 });
  const image = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: '#0088aa80' } }).png().toBuffer();
  const aquariumForm = new FormData(); aquariumForm.append('foto', new Blob([image], { type: 'image/png' }), 'synthetic.png');
  const uploadedAquarium = await request(`/api/aquarios/${aquarium.id}/foto`, { token: client.token, body: aquariumForm });
  assert.equal((await fetch(base + uploadedAquarium.foto_url)).status, 200);
  const product = await request('/api/admin/loja/produtos', { token: admin.token, body: { nome: run, ativo: true, preco_cents: 1234, estoque: 5 } });
  const productForm = new FormData(); productForm.append('fotos', new Blob([image], { type: 'image/png' }), 'synthetic.png');
  const photo = await request(`/api/admin/loja/produtos/${product.id}/fotos`, { token: admin.token, body: productForm });
  assert.equal(photo.destino, 'disco');
  const persisted = await fetch(base + photo.imagens[0].url);
  assert.equal(persisted.status, 200);
  const metadata = await sharp(Buffer.from(await persisted.arrayBuffer())).metadata();
  assert.equal(metadata.width, 1600); assert.equal(metadata.format, 'jpeg');
  await request(`/api/admin/loja/produtos/${product.id}`, { token: client.token, expected: 403 });
  const detail = await request(`/api/admin/loja/produtos/${product.id}`, { token: admin.token });
  const cart = await request('/api/loja/carrinho', { body: { itens: [{ variacao_id: detail.variacoes[0].id, qty: 2 }] } });
  assert.equal(cart.itens[0].preco_cents, 1234);
  assert.equal(cart.itens[0].qty, 2);
  const appointment = await request('/api/agendamento', { body: { nome: run, email: `${randomUUID()}@example.invalid`, telefone: '00000000000', cidade: 'SYNTHETIC', plano: 'avulsa' } });
  assert.ok(appointment.id, 'appointment must actually be persisted');
  const species = await request('/api/especies'); assert.ok(species);
  console.log(JSON.stringify({ result: 'PASS', run, uploadedFiles: [uploadedAquarium.foto_url, photo.imagens[0].url], paymentsOrInvoicesExecuted: false }));
} catch (error) {
  // Do not log connection errors, payloads or tokens.
  console.error(JSON.stringify({ result: 'FAIL', step: lastStep, code: error.code || error.name }));
  process.exitCode = 1;
} finally {
  for (const token of tokens) { try { await request('/api/logout', { token, body: {} }); } catch {} }
  if (users.length) {
    await db.query('UPDATE app_user SET ativo=false WHERE id=ANY($1::uuid[])', [users]);
    await db.query("UPDATE subscription SET status='cancelada' WHERE user_id=ANY($1::uuid[])", [users]);
    console.log(JSON.stringify({ accountsDisabled: users.length }));
  }
  await db.end();
}
