import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticar, RULESET_VERSION } from "../src/motor/engine.mjs";
import { orcar, rotear } from "../src/pricing.js";

test("diagnóstico: rejeita tipo de água desconhecido", () => {
  assert.throws(() => diagnosticar({}, "invalid"), /tipo de água inválido/);
});
test("diagnóstico: mantém faixas e confidência sem parâmetros", () => {
  const r = diagnosticar({}, "freshwater");
  assert.equal(r.ruleset_version, RULESET_VERSION);
  assert.equal(r.confianca, 0);
  assert.ok(r.nota >= 0 && r.nota <= 100);
});
test("diagnóstico: pontuação e urgência no domínio válido", () => {
  for (const waterType of ["freshwater", "marine", "pond"]) {
    const r = diagnosticar({ ph: 7, temperatura: 25 }, waterType);
    assert.ok(Number.isInteger(r.nota) && r.nota >= 0 && r.nota <= 100);
    assert.ok(["ok", "atencao", "alerta", "critico"].includes(r.urgencia));
    assert.ok(r.confianca >= 0 && r.confianca <= 100);
  }
});
test("pricing: encaminhamento por código postal", () => {
  assert.equal(rotear("3880-000", "Ovar"), "PT");
  assert.equal(rotear("22041-001", "Rio de Janeiro"), "RJ");
  assert.equal(rotear("01310-000", "São Paulo"), "SP");
});
test("pricing: local não suportado não gera cobrança", () => {
  assert.equal(orcar("", "cidade-desconhecida", "freshwater", 100, "avulsa", "pix").atende, false);
});
