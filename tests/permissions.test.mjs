import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/auth.js", import.meta.url), "utf8");

test("aquarista não recebe acesso global a aquários de outras organizações", () => {
  assert.match(server, /const _ehEquipe\s*=\s*\(req\)\s*=>\s*\["tecnico", "admin", "gestor"\]/);
  assert.match(server, /SELECT \* FROM asset WHERE id=\$1 AND organization_id=\$2 AND ativo IS DISTINCT FROM false/);
});
test("JWT sem segredo previsível de fallback", () => {
  assert.doesNotMatch(auth, /aqualife-dev-TROQUE-EM-PRODUCAO/);
  assert.match(auth, /SECRET\.length < 32/);
});
test("autodiagnóstico exige autenticação, assinatura e organization_id", () => {
  assert.match(server, /app\.post\("\/api\/aquarios\/:id\/autodiagnostico", exigeLogin, exigeAssinatura/);
  assert.match(server, /SELECT id, water_type, organization_id, name, label FROM asset WHERE id=\$1 AND organization_id=\$2/);
});
