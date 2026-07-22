-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 5 — E-MAIL VIA RESEND (HTTPS)
-- Idempotente. Rode DEPOIS das migrations anteriores.
-- Cole no Query Editor do Railway e clique em "Run Query".
-- ============================================================

-- O Railway bloqueia SMTP (portas 587/465). O Resend envia por
-- HTTPS (porta 443), que nunca é bloqueada. Se a chave do Resend
-- estiver preenchida, o sistema usa Resend; senão, cai no SMTP.

INSERT INTO integracao_config (chave, valor) VALUES
  ('resend_api_key',   NULL),  -- chave da conta Resend (re_...)
  ('email_reply_to',   NULL)   -- para onde vão as respostas (ex: br.aqualife@gmail.com)
ON CONFLICT (chave) DO NOTHING;

-- Reaproveitamos 'smtp_from' como o remetente (From) para ambos os
-- provedores. Se já tiver valor, mantém; senão, deixa em branco.
INSERT INTO integracao_config (chave, valor) VALUES ('smtp_from', NULL)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- FIM — migration Fase 5 concluída
-- ============================================================
