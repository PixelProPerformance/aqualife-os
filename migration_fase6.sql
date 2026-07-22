-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 6 — AQUALIFE ACADEMY
-- Idempotente. Rode DEPOIS das migrations anteriores.
-- ============================================================

-- --------------------------------------------------------------
-- 1) CURSO — campos extras (a tabela já existe da fase 1)
-- --------------------------------------------------------------
ALTER TABLE curso ADD COLUMN IF NOT EXISTS resumo       TEXT;
ALTER TABLE curso ADD COLUMN IF NOT EXISTS nivel        TEXT DEFAULT 'iniciante'; -- iniciante | intermediario | avancado
ALTER TABLE curso ADD COLUMN IF NOT EXISTS categoria    TEXT;
ALTER TABLE curso ADD COLUMN IF NOT EXISTS duracao_min  INTEGER;
ALTER TABLE curso ADD COLUMN IF NOT EXISTS capa_url     TEXT;

-- --------------------------------------------------------------
-- 2) AULAS
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aula (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id   UUID NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL,
  conteudo   TEXT,            -- texto/HTML simples do material
  video_url  TEXT,            -- opcional (YouTube/Vimeo)
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aula_curso ON aula(curso_id, ordem);

-- --------------------------------------------------------------
-- 3) PERGUNTAS DO QUIZ
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_pergunta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id   UUID NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  pergunta   TEXT NOT NULL,
  opcoes     JSONB NOT NULL DEFAULT '[]',  -- ["Opção A","Opção B",...]
  correta    INTEGER NOT NULL DEFAULT 0,   -- índice (0-based) da opção correta
  explicacao TEXT,
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_curso ON quiz_pergunta(curso_id, ordem);

-- --------------------------------------------------------------
-- 4) PROGRESSO — campos extras (a tabela já existe da fase 1)
-- --------------------------------------------------------------
ALTER TABLE curso_progresso ADD COLUMN IF NOT EXISTS aulas_concluidas JSONB DEFAULT '[]';
ALTER TABLE curso_progresso ADD COLUMN IF NOT EXISTS quiz_melhor      INTEGER; -- melhor % no quiz

-- --------------------------------------------------------------
-- 5) RESULTADOS DO QUIZ (histórico)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_resultado (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  curso_id   UUID NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  acertos    INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  percentual INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quizres_user ON quiz_resultado(user_id, curso_id);

-- ============================================================
-- SEED — 2 cursos de exemplo (idempotente por UUID fixo)
-- ============================================================

-- CURSO 1 — Fundamentos do Aquarismo (iniciante)
INSERT INTO curso (id, titulo, resumo, descricao, nivel, categoria, duracao_min, ordem, publicado)
VALUES ('a0000000-0000-0000-0000-000000000001',
  'Fundamentos do Aquarismo',
  'O essencial para montar e manter um aquário saudável desde o primeiro dia.',
  'Neste curso você aprende o ciclo do nitrogênio, os parâmetros que realmente importam e como maturar um aquário novo sem perder peixes.',
  'iniciante', 'Água doce', 25, 1, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aula (id, curso_id, titulo, conteudo, ordem) VALUES
('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
 'O ciclo do nitrogênio',
 'Todo aquário é um pequeno ecossistema. Os peixes produzem amônia (pela excreção e pelos restos de comida), que é altamente tóxica. Bactérias benéficas (Nitrosomonas) transformam a amônia em nitrito — ainda tóxico. Outras bactérias (Nitrobacter) transformam o nitrito em nitrato, bem menos tóxico, que é removido nas trocas parciais de água. Esse encadeamento (amônia → nitrito → nitrato) é o coração da estabilidade do aquário. Sem essas bactérias estabelecidas, mesmo pouca ração vira veneno para os peixes.', 1),
('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
 'Parâmetros essenciais da água',
 'Os parâmetros que você deve acompanhar: pH (acidez/alcalinidade), amônia (ideal 0), nitrito (ideal 0), nitrato (manter baixo com trocas), KH (estabilidade do pH) e GH (dureza). Em água doce comunitária, um pH entre 6,5 e 7,5 atende a maioria das espécies. O mais importante para peixes vivos é: amônia e nitrito sempre em zero. Um KH muito baixo deixa o pH instável, o que estressa os peixes mais do que um pH "errado" porém estável.', 2),
('a1000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',
 'Montagem e maturação',
 'Nunca coloque muitos peixes num aquário recém-montado. A "maturação" (ciclagem) leva de 3 a 6 semanas: é o tempo para as bactérias benéficas colonizarem o filtro e a mídia. Faça a ciclagem antes de povoar, monitorando amônia e nitrito até ambos zerarem e o nitrato começar a subir. Só então introduza os peixes aos poucos. Trocas parciais de água (20–30% por semana) mantêm o nitrato sob controle e repõem minerais.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_pergunta (id, curso_id, pergunta, opcoes, correta, explicacao, ordem) VALUES
('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
 'Qual substância produzida pelos peixes é a mais tóxica e aparece primeiro?',
 '["Nitrato","Amônia","Nitrito","Oxigênio"]', 1,
 'A amônia surge primeiro (excreção e restos de comida) e é a mais tóxica. Depois vira nitrito e, por fim, nitrato.', 1),
('a2000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
 'Quanto tempo leva, em média, a maturação (ciclagem) de um aquário novo?',
 '["Algumas horas","1 a 2 dias","3 a 6 semanas","6 meses"]', 2,
 'A ciclagem costuma levar de 3 a 6 semanas até as bactérias benéficas se estabelecerem.', 2),
('a2000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',
 'Para peixes vivos e saudáveis, os valores ideais de amônia e nitrito são:',
 '["Ambos altos","Ambos zero","Amônia alta, nitrito zero","Tanto faz"]', 1,
 'Amônia e nitrito devem estar sempre em zero. Qualquer valor acima disso é perigoso.', 3)
ON CONFLICT (id) DO NOTHING;

-- CURSO 2 — Diagnóstico de Água na Prática (intermediário)
INSERT INTO curso (id, titulo, resumo, descricao, nivel, categoria, duracao_min, ordem, publicado)
VALUES ('a0000000-0000-0000-0000-000000000002',
  'Diagnóstico de Água na Prática',
  'Aprenda a interpretar os parâmetros e agir com segurança quando algo sai do ideal.',
  'Um curso mais técnico: como ler pH, KH e GH em conjunto, e o que fazer diante de picos de amônia e nitrito.',
  'intermediario', 'Diagnóstico', 20, 2, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aula (id, curso_id, titulo, conteudo, ordem) VALUES
('a1000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000002',
 'Interpretando pH, KH e GH juntos',
 'Esses três parâmetros contam uma história juntos. O KH (alcalinidade) funciona como um "amortecedor" do pH: quanto maior o KH, mais estável o pH. Um KH muito baixo faz o pH oscilar bruscamente (o que chamamos de instabilidade), perigoso para os peixes. O GH mede a dureza total (cálcio e magnésio), importante para a saúde e reprodução. Ao diagnosticar, não olhe o pH isolado: um pH 6,8 com KH baixo é mais arriscado que um pH 7,6 estável com KH adequado.', 1),
('a1000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000002',
 'Amônia e nitrito: o que fazer',
 'Diante de um pico de amônia ou nitrito: 1) faça uma troca parcial de água imediata (25–50%) com água tratada; 2) reduza a alimentação; 3) não lave a mídia biológica do filtro na água da torneira (o cloro mata as bactérias); 4) verifique superlotação e restos de comida. Lembre-se da regra de ouro do Aqualife: o motor de diagnóstico DECIDE a gravidade com base nas faixas validadas; nitrito presente é ATENÇÃO, mas pH alto combinado com amônia é CRÍTICO, porque a amônia fica muito mais tóxica em pH elevado.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_pergunta (id, curso_id, pergunta, opcoes, correta, explicacao, ordem) VALUES
('a2000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000002',
 'Qual parâmetro funciona como "amortecedor" e estabiliza o pH?',
 '["GH","KH","Nitrato","Temperatura"]', 1,
 'O KH (alcalinidade) amortece variações de pH. KH baixo = pH instável.', 1),
('a2000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000002',
 'Diante de um pico de amônia, qual atitude está CORRETA?',
 '["Lavar a mídia do filtro na torneira","Alimentar mais os peixes","Troca parcial de água imediata","Não fazer nada"]', 2,
 'Troca parcial imediata com água tratada e reduzir alimentação. Nunca lavar a mídia biológica na torneira (o cloro mata as bactérias).', 2),
('a2000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000002',
 'Por que pH alto combinado com amônia é considerado CRÍTICO?',
 '["Porque o pH alto deixa a amônia mais tóxica","Porque a água fica turva","Porque baixa o oxigênio","Não é crítico"]', 0,
 'Em pH elevado a amônia assume a forma mais tóxica (NH3), por isso a combinação é classificada como crítica.', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM — migration Fase 6 concluída
-- ============================================================
