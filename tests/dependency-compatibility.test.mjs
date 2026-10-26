import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import nodemailer from 'nodemailer';
import sharp from 'sharp';

test('Nodemailer delivers UTF-8 HTML and reply-to to a local SMTP sink', async (t) => {
  let message = '';
  const server = createServer(socket => {
    socket.setEncoding('utf8');
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '', data = false;
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { data = false; socket.write('250 accepted\r\n'); }
          else message += line + '\r\n';
        } else if (/^EHLO/.test(line)) socket.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (line === 'DATA') { data = true; socket.write('354 send data\r\n'); }
        else if (line === 'QUIT') { socket.end('221 bye\r\n'); }
        else socket.write('250 ok\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: server.address().port, secure: false, ignoreTLS: true });
  t.after(() => transport.close());
  const info = await transport.sendMail({ from: 'test@example.invalid', to: 'sink@example.invalid', replyTo: 'reply@example.invalid', subject: 'Confirmação — Aqualife', html: '<p>Olá! 🐠</p>' });
  assert.deepEqual(info.accepted, ['sink@example.invalid']);
  assert.match(message, /Reply-To: reply@example.invalid/);
  assert.match(message, /Content-Type: text\/html/);
  assert.match(message, /Subject:/);
});

test('real shop upload route accepts images, compresses and persists JPEG; rejects unauthorized and invalid files', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'aqualife-upload-test-'));
  const oldDirectory = process.env.UPLOADS_DIR;
  process.env.UPLOADS_DIR = directory;
  t.after(async () => { if (oldDirectory === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = oldDirectory; await rm(directory, { recursive: true, force: true }); });
  const { registrarLoja } = await import('../src/loja.js');
  const app = express();
  const writes = [];
  registrarLoja({ app, getConfig: async () => null,
    exigeLogin: (req, res, next) => req.headers.authorization === 'Bearer test' ? next() : res.sendStatus(401),
    exigeAdmin: (req, res, next) => next(),
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM loja_produto')) return { rows: [{ id: 'synthetic-product' }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ n: 0 }] };
      if (sql.includes('INSERT INTO loja_imagem')) { writes.push(params); return { rows: [{ id: 'synthetic-photo', url: params[1], ordem: params[3], capa: params[4] }] }; }
      throw new Error('Unexpected query in isolated upload test');
    },
  });
  app.use((err, req, res, next) => res.status(400).json({ erro: err.message }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/loja/produtos/synthetic-product/fotos`;
  const image = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: '#0088aa80' } }).png().toBuffer();
  const form = () => { const body = new FormData(); body.append('fotos', new Blob([image], { type: 'image/png' }), 'synthetic.png'); return body; };
  assert.equal((await fetch(url, { method: 'POST', body: form() })).status, 401);
  const response = await fetch(url, { method: 'POST', headers: { authorization: 'Bearer test' }, body: form() });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.destino, 'disco'); assert.equal(writes.length, 1);
  const saved = await readFile(path.join(directory, path.basename(result.imagens[0].url)));
  const metadata = await sharp(saved).metadata();
  assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.width, 1600); assert.equal(metadata.height, 800); assert.equal(metadata.hasAlpha, false);
  const invalid = new FormData(); invalid.append('fotos', new Blob(['not an image'], { type: 'text/plain' }), 'invalid.txt');
  assert.equal((await fetch(url, { method: 'POST', headers: { authorization: 'Bearer test' }, body: invalid })).status, 400);
  assert.equal(writes.length, 1);
});
