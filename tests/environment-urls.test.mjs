import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { appUrl } from '../src/app-url.js';

test('email URLs use the configured environment and preserve the production default', () => {
  assert.equal(appUrl('/dashboard.html', 'https://staging.example.invalid/'), 'https://staging.example.invalid/dashboard.html');
  assert.throws(() => appUrl('/dashboard.html', 'javascript:alert(1)'));
  assert.throws(() => appUrl('/dashboard.html', 'https://user:secret@example.invalid'));
  const source = readFileSync(new URL('../src/email.js', import.meta.url), 'utf8');
  assert.equal((source.match(/botao\(appUrl\("\/dashboard.html"\)/g) || []).length, 2);
});

test('public navigation stays on its current environment', () => {
  for (const file of ['site.html', 'tecnico.html']) {
    const source = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /https:\/\/app\.aqualifeaquarismo\.com/);
  }
});

test('newsletter links and logo use the current origin in generated HTML', () => {
  const source = readFileSync(new URL('../public/js/admin.js', import.meta.url), 'utf8');
  const templates = source.slice(source.indexOf('const NL_MODELOS='), source.indexOf('document.querySelectorAll("[data-modelo]")'));
  for (const origin of ['https://staging.example.invalid', 'https://app.aqualifeaquarismo.com']) {
    const context = vm.createContext({ location: { origin } });
    const emails = vm.runInContext(`${templates}; [NL_MODELOS.aviso(), NL_MODELOS.newsletter()]`, context);
    for (const html of emails) {
      assert.ok(html.includes(`href="${origin}/loja.html"`));
      assert.ok(html.includes(`src="${origin}/images/logo-azul.png"`));
      if (origin.includes('staging')) assert.ok(!html.includes('app.aqualifeaquarismo.com'));
    }
  }
});
