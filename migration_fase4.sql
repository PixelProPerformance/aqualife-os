-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 4 — E-MAILS AUTOMÁTICOS (SMTP)
-- Idempotente. Rode DEPOIS das migrations anteriores.
-- Cole no Query Editor do Railway e clique em "Run Query".
-- ============================================================

-- Credenciais SMTP guardadas no banco (nunca fixas no código).
-- O admin preenche pelo painel. Serve para qualquer provedor:
-- Gmail (App Password), Resend, Brevo, SendGrid, Mailgun, etc.
INSERT INTO integracao_config (chave, valor) VALUES
  ('smtp_host',   NULL),   -- ex: smtp.gmail.com | smtp.resend.com
  ('smtp_port',   '587'),  -- 587 (STARTTLS) ou 465 (SSL)
  ('smtp_secure', 'false'),-- 'true' para porta 465
  ('smtp_user',   NULL),   -- usuário/login SMTP
  ('smtp_pass',   NULL),   -- senha/app password/api key
  ('smtp_from',   NULL)    -- ex: "Aqualife Aquarismo <contato@aqualifeaquarismo.com>"
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- FIM — migration Fase 4 concluída
-- ============================================================
