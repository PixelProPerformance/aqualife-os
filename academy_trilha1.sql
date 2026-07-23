-- ============================================================
-- AQUALIFE ACADEMY — CONTEÚDO · TRILHA 1 (Fundamentos)
-- Idempotente: apaga e recria os módulos desta trilha e as amostras antigas.
-- Rode DEPOIS da migration_fase6.sql.
-- ============================================================

-- Limpa dependências e remove versões anteriores (amostras antigas + módulos desta trilha)
DELETE FROM curso_progresso WHERE curso_id IN ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003');
DELETE FROM quiz_resultado  WHERE curso_id IN ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003');
DELETE FROM curso           WHERE id       IN ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003');

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000001','Módulo 01, Introdução ao Aquarismo','Entenda o que realmente significa manter um ecossistema aquático.','A base de tudo: o que é um aquário como ecossistema, os três grandes universos do hobby e a responsabilidade de quem cuida de vidas dentro de um vidro.','iniciante','Trilha 1 · Fundamentos do Aquarismo',35,1,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2010000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','O que é um aquário (muito além de um recipiente com água)','<p>Um aquário não é um enfeite com água: é um <b>ecossistema em miniatura</b>. Dentro dele convivem peixes, plantas, microrganismos e bactérias, todos dependentes do equilíbrio químico e biológico que você mantém.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌍</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Um ecossistema em miniatura</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Peixes, plantas e microrganismos</text><circle cx="160" cy="112" r="6" fill="#22C55E"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Bactérias que filtram a água</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Equilíbrio químico e biológico</text>
</svg></figure>
<p>Quando entendemos o aquário como um sistema vivo, paramos de reagir a problemas e passamos a <b>preveni-los</b>. A água é o "ar" que os peixes respiram, cuidar da água é cuidar dos animais.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> O aquarista não cuida de peixes; cuida da <b>água</b>. Peixes saudáveis são consequência de água estável.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2010000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','Água doce, marinho e lagos ornamentais','<p>O hobby se divide em três grandes caminhos, cada um com sua química e seu nível de exigência:</p>
<figure><svg viewBox="0 0 640 180" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="180" fill="#F6F9FB" rx="12"/>

<circle cx="120" cy="70" r="42" fill="#fff" stroke="#0E7490" stroke-width="3"/>
<text x="120" y="82" text-anchor="middle" font-size="34">🐟</text>
<text x="120" y="138" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Água doce</text>
<text x="120" y="158" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">pH 6 a 7,5</text>
<circle cx="320" cy="70" r="42" fill="#fff" stroke="#0B2A3A" stroke-width="3"/>
<text x="320" y="82" text-anchor="middle" font-size="34">🐠</text>
<text x="320" y="138" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Marinho / Reef</text>
<text x="320" y="158" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">salinidade 1.025</text>
<circle cx="520" cy="70" r="42" fill="#fff" stroke="#22C55E" stroke-width="3"/>
<text x="520" y="82" text-anchor="middle" font-size="34">🪷</text>
<text x="520" y="138" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Lago ornamental</text>
<text x="520" y="158" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">grandes volumes</text>
</svg><figcaption>Três universos do aquarismo, cada um com sua química e seus cuidados.</figcaption></figure>
<p><b>Água doce</b> é o ponto de partida ideal: mais tolerante e acessível. O <b>marinho/reef</b> exige estabilidade rigorosa de salinidade e elementos. Os <b>lagos ornamentais</b> lidam com grandes volumes ao ar livre, clima e filtragem de alta vazão.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Comece pelo que combina com seu tempo e orçamento. Não existe caminho "melhor", existe o mais adequado ao seu momento.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2010000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','Responsabilidade biológica do aquarista','<p>Ao montar um aquário, você assume a responsabilidade por seres vivos que <b>não podem sair dali</b>. Tudo o que entra (ração, água, novos habitantes) e tudo o que falta (oxigênio, filtragem) afeta diretamente a sobrevivência deles.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🤝</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Responsabilidade do aquarista</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Respeitar o espaço de cada espécie</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Evitar superlotação</text><circle cx="160" cy="152" r="6" fill="#EF4444"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nunca soltar animais na natureza</text>
</svg></figure>
<p>Isso inclui escolhas éticas: respeitar o espaço mínimo de cada espécie, evitar superlotação e nunca soltar animais na natureza.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Peixe comprado por impulso, sem pesquisa, é a causa nº 1 de mortes evitáveis. Pesquise antes de comprar.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2010000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001','Escolhendo o primeiro projeto','<p>O primeiro aquário define se o hobby vai prosperar ou frustrar. Priorize:</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">✅</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">O primeiro projeto ideal</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Volume maior, mais estável</text><circle cx="160" cy="112" r="6" fill="#0E7490"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Espécies resistentes</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Equipamento bem dimensionado</text>
</svg></figure>
<ul>
<li><b>Volume maior é mais fácil:</b> quanto mais água, mais estável a química. Evite nano aquários no início.</li>
<li><b>Espécies resistentes:</b> tetras, corydoras e barbos perdoam pequenos erros.</li>
<li><b>Equipamento adequado:</b> filtro bem dimensionado, aquecedor e teste de água.</li>
</ul>
<div class="destaque">💡 <b>Ponto-chave:</b> Um aquário de 60, 120 L de água doce comunitário é o melhor "primeiro projeto" para a maioria das pessoas.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2010000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000001','Erros que todo iniciante comete','<p>Conhecer os erros clássicos economiza dinheiro e vidas:</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🚫</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Erros que matam peixes</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Povoar sem ciclagem</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Superalimentar</text><circle cx="160" cy="152" r="6" fill="#EF4444"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Lavar a mídia na torneira</text>
</svg></figure>
<ul>
<li>Colocar peixes no <b>primeiro dia</b>, sem ciclagem.</li>
<li><b>Superalimentar</b>, sobra de ração vira amônia.</li>
<li><b>Superlotar</b> o aquário logo de início.</li>
<li>Lavar a mídia biológica na <b>água da torneira</b> (o cloro mata as bactérias).</li>
<li>Fazer <b>trocas de 100%</b> achando que "quanto mais limpo, melhor".</li>
</ul>
<div class="destaque">💡 <b>Ponto-chave:</b> Paciência é o equipamento mais importante do aquarismo. A pressa mata mais peixes que qualquer doença.</div>',5);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3010000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','O que o aquarista, na prática, "cuida" em primeiro lugar?','["Dos enfeites","Da água","Da iluminação","Do vidro"]',1,'Água estável gera peixes saudáveis, cuidar da água é cuidar dos animais.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3010000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','Qual é geralmente o melhor primeiro projeto?','["Nano marinho","Reef completo","Doce comunitário 60–120 L","Lago de carpas"]',2,'Volume razoável de água doce comunitária é mais estável e tolerante a erros.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3010000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','Por que não lavar a mídia biológica na água da torneira?','["Suja a mídia","O cloro mata as bactérias","Gasta água","Enferruja"]',1,'O cloro/cloramina da torneira elimina as bactérias nitrificantes.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000002','Módulo 02, O Ciclo do Nitrogênio','Compreenda o processo biológico mais importante do aquarismo.','Amônia, nitrito, nitrato e as bactérias que sustentam a vida no aquário. Dominar a ciclagem é dominar o hobby.','iniciante','Trilha 1 · Fundamentos do Aquarismo',45,2,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','O que é amônia','<p>A <b>amônia (NH₃/NH₄⁺)</b> é o primeiro e mais tóxico resíduo do aquário. Ela surge da respiração dos peixes, da urina, das fezes e da decomposição de restos de ração e plantas.</p>
<figure><svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#0B2A3A"/></marker></defs>
<rect x="0" y="0" width="640" height="220" fill="#F6F9FB" rx="12"/>

<rect x="60" y="70" width="150" height="80" rx="12" fill="#fff" stroke="#EF4444" stroke-width="3"/>
<text x="135" y="105" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Amônia</text>
<text x="135" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-size="15" fill="#EF4444">NH₃/NH₄⁺</text>
<rect x="270" y="70" width="150" height="80" rx="12" fill="#fff" stroke="#EAB308" stroke-width="3"/>
<text x="345" y="105" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrito</text>
<text x="345" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-size="15" fill="#EAB308">NO₂⁻</text>
<rect x="480" y="70" width="150" height="80" rx="12" fill="#fff" stroke="#22C55E" stroke-width="3"/>
<text x="555" y="105" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrato</text>
<text x="555" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-size="15" fill="#22C55E">NO₃⁻</text>
<line x1="210" y1="110" x2="268" y2="110" stroke="#0B2A3A" stroke-width="3" marker-end="url(#ar)"/>
<line x1="420" y1="110" x2="478" y2="110" stroke="#0B2A3A" stroke-width="3" marker-end="url(#ar)"/>
<text x="239" y="60" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#0E7490">Nitrosomonas</text>
<text x="449" y="60" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#0E7490">Nitrobacter</text>
<text x="320" y="195" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Trocas parciais de água removem o nitrato acumulado</text>
</svg><figcaption>O ciclo do nitrogênio: bactérias transformam a amônia tóxica em nitrato, bem menos nocivo.</figcaption></figure>
<p>Mesmo em pequenas quantidades ela queima as brânquias e compromete a respiração. O ideal é <b>sempre zero</b>.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Em pH alto a amônia assume a forma NH₃, muito mais tóxica. pH elevado + amônia = emergência.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Como surgem os nitritos','<p>Bactérias do gênero <b>Nitrosomonas</b> consomem a amônia e a transformam em <b>nitrito (NO₂⁻)</b>. É um avanço, mas o nitrito ainda é tóxico.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🦠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrosomonas em ação</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Consomem a amônia</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Produzem nitrito (NO₂⁻)</text><circle cx="160" cy="152" r="6" fill="#EF4444"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nitrito ainda é tóxico</text>
</svg></figure>
<p>O nitrito prejudica o transporte de oxigênio no sangue do peixe (a chamada "doença do sangue marrom"). Também deve permanecer em <b>zero</b> num aquário maduro.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Nitrito detectável significa que a colônia de bactérias ainda não está completa. Não adicione mais peixes até zerar.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002','Formação dos nitratos','<p>Um segundo grupo de bactérias, o <b>Nitrobacter</b> (e Nitrospira), converte o nitrito em <b>nitrato (NO₃⁻)</b>, o produto final, bem menos tóxico.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#22C55E"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💧</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrato, o produto final</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nitrobacter converte o nitrito</text><circle cx="160" cy="112" r="6" fill="#22C55E"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Bem menos tóxico</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Removido nas trocas de água</text>
</svg></figure>
<p>O nitrato se acumula com o tempo e é removido pelas <b>trocas parciais de água</b> e absorvido pelas plantas. Em água doce, manter abaixo de 20, 40 mg/L é uma boa meta.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Amônia 0, nitrito 0 e nitrato controlado = ciclo do nitrogênio funcionando.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000002','As bactérias nitrificantes','<p>As bactérias que fazem toda essa mágica vivem principalmente na <b>mídia biológica do filtro</b> e no substrato, não flutuando na água. São elas a verdadeira "usina de tratamento" do aquário.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧫</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Onde vivem as bactérias</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Na mídia biológica do filtro</text><circle cx="160" cy="112" r="6" fill="#0E7490"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">E no substrato</text><circle cx="160" cy="152" r="6" fill="#EF4444"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sensíveis a cloro e remédios</text>
</svg></figure>
<p>Elas são sensíveis a cloro, medicamentos e à falta de oxigênio. Por isso a manutenção do filtro deve ser feita com <b>cuidado e com a própria água do aquário</b>.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca troque toda a mídia biológica de uma vez: você removeria a colônia inteira e reiniciaria o ciclo.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000002','O que é ciclagem','<p><b>Ciclagem</b> (ou maturação) é o período em que essas colônias de bactérias se estabelecem, antes de o aquário estar pronto para os peixes. Costuma levar de <b>3 a 6 semanas</b>.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⏳</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Ciclagem, 3 a 6 semanas</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Primeiro sobe a amônia</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Depois o nitrito</text><circle cx="160" cy="152" r="6" fill="#22C55E"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Por fim aparece o nitrato</text>
</svg></figure>
<p>Durante a ciclagem, você acompanha os testes: primeiro sobe a amônia, depois o nitrito e, por fim, aparece o nitrato enquanto amônia e nitrito zeram. Aí o aquário está maduro.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Ciclar é esperar as bactérias "nascerem". Pular essa etapa é a causa clássica da morte em massa de peixes novos.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000002','Ciclagem com peixes × sem peixes','<p>Existem duas abordagens:</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚖️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Como ciclar</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sem peixes, mais seguro</text><circle cx="160" cy="112" r="6" fill="#EF4444"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Com peixes, arriscado</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Prefira sempre o fishless</text>
</svg></figure>
<ul>
<li><b>Sem peixes (fishless):</b> adiciona-se uma fonte de amônia (amônia pura ou ração) para "alimentar" as bactérias. É a mais <b>ética e segura</b>, pois nenhum animal sofre.</li>
<li><b>Com peixes:</b> usa poucos peixes muito resistentes como fonte de amônia. Mais arriscado e estressante para os animais.</li>
</ul>
<div class="destaque">💡 <b>Ponto-chave:</b> Sempre que possível, prefira a ciclagem sem peixes. É mais humana e você controla melhor o processo.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000002','Como acelerar a ciclagem','<p>Você não cria bactérias do nada, mas pode <b>semear</b> o aquário novo com colônias já prontas:</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚡</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Semear o aquário novo</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mídia de um filtro maduro</text><circle cx="160" cy="112" r="6" fill="#0E7490"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Substrato de aquário pronto</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Boa temperatura e oxigênio</text>
</svg></figure>
<ul>
<li>Mídia biológica de um filtro maduro (a forma mais eficaz).</li>
<li>Substrato ou água de um aquário estabelecido.</li>
<li>Manter temperatura e oxigenação boas (as bactérias se multiplicam mais rápido).</li>
</ul>
<div class="destaque">💡 <b>Ponto-chave:</b> Um punhado de mídia madura pode reduzir a ciclagem de semanas para poucos dias.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2020000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000002','Mitos sobre bactérias comerciais','<p>Produtos de "bactérias em frasco" ajudam, mas cercam-se de exageros. Eles podem <b>acelerar</b> a ciclagem, porém não substituem o acompanhamento dos testes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">❓</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Bactérias de frasco</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ajudam, mas não fazem milagre</text><circle cx="160" cy="112" r="6" fill="#EF4444"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muitas vêm inativas</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Confirme sempre com testes</text>
</svg></figure>
<p>Muitos frascos mal armazenados contêm bactérias inativas. Nenhum deles torna o aquário "pronto na hora" de forma confiável.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Desconfie de promessas de "ciclagem instantânea". Sempre confirme com testes de amônia e nitrito antes de povoar.</div>',8);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3020000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','Qual a ordem correta do ciclo do nitrogênio?','["Nitrato → Nitrito → Amônia","Amônia → Nitrito → Nitrato","Nitrito → Amônia → Nitrato","Amônia → Nitrato → Nitrito"]',1,'Amônia (tóxica) → nitrito (tóxico) → nitrato (menos tóxico).',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3020000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Onde vivem principalmente as bactérias nitrificantes?','["Flutuando na água","Na mídia biológica e no substrato","Na superfície","No aquecedor"]',1,'Elas colonizam superfícies, sobretudo a mídia biológica do filtro.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3020000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000002','Qual forma de ciclagem é mais segura e ética?','["Com muitos peixes","Sem peixes (fishless)","Trocando 100% da água","Sem filtro"]',1,'A ciclagem sem peixes não expõe animais à amônia e ao nitrito.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3020000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000002','O que remove o nitrato acumulado no dia a dia?','["O aquecedor","As trocas parciais de água","A luz","O cloro"]',1,'Trocas parciais (e as plantas) mantêm o nitrato sob controle.',4);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000003','Módulo 03, Filtragem','Aprenda como manter a água estável com uma boa filtragem.','Os três tipos de filtragem, as mídias mais usadas, UV, skimmer e como dimensionar o filtro certo para o seu aquário.','iniciante','Trilha 1 · Fundamentos do Aquarismo',50,3,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','Filtragem mecânica','<p>A <b>filtragem mecânica</b> é a primeira barreira: retém partículas em suspensão, restos de ração, fezes e detritos, deixando a água visivelmente mais limpa.</p>
<figure><svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="210" fill="#F6F9FB" rx="12"/>

<rect x="30" y="35" width="180" height="140" rx="14" fill="#fff" stroke="#0E7490" stroke-width="3"/>
<text x="120" y="90" text-anchor="middle" font-size="38">🧽</text>
<text x="120" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Mecânica</text>
<text x="120" y="155" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Retém partículas</text>
<rect x="230" y="35" width="180" height="140" rx="14" fill="#fff" stroke="#22C55E" stroke-width="3"/>
<text x="320" y="90" text-anchor="middle" font-size="38">🦠</text>
<text x="320" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Biológica</text>
<text x="320" y="155" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Abriga bactérias</text>
<rect x="430" y="35" width="180" height="140" rx="14" fill="#fff" stroke="#F97316" stroke-width="3"/>
<text x="520" y="90" text-anchor="middle" font-size="38">⚗️</text>
<text x="520" y="130" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Química</text>
<text x="520" y="155" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Adsorve dissolvidos</text>
</svg><figcaption>Os três tipos de filtragem trabalham juntos num sistema equilibrado.</figcaption></figure>
<p>Usa-se perlon (manta), esponjas e pré-filtros. É a mídia que <b>mais suja</b> e deve ser limpa (ou trocada, no caso do perlon) com frequência.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Limpe a mídia mecânica com regularidade; ela não abriga a colônia principal de bactérias, então pode ser trocada sem medo.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','Filtragem biológica','<p>É o <b>coração do filtro</b>: superfícies porosas onde vivem as bactérias que fazem o ciclo do nitrogênio. Sem ela, não há aquário estável.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#22C55E"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🦠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Filtragem biológica</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Superfícies bem porosas</text><circle cx="160" cy="112" r="6" fill="#22C55E"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Abrigam as bactérias</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">O coração do filtro</text>
</svg></figure>
<p>Quanto maior a área de contato (mídias porosas), maior a colônia que o filtro sustenta. Essa mídia deve ser preservada ao máximo durante as limpezas.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca lave a mídia biológica na torneira nem troque toda de uma vez, você reiniciaria a ciclagem.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003','Filtragem química','<p>A <b>filtragem química</b> remove substâncias dissolvidas que a mecânica e a biológica não retêm, como coloração, odores e certos poluentes. É feita por mídias adsorventes (carvão ativado, resinas).</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#F97316"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚗️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Filtragem química</text>
<circle cx="160" cy="72" r="6" fill="#F97316"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Remove compostos dissolvidos</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Uso pontual</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ótima depois de medicar</text>
</svg></figure>
<p>É um recurso <b>pontual</b>, não obrigatório no dia a dia. Muito útil após medicar (para remover o remédio) ou para clarear a água.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Filtragem química é como um "remédio" da água: use quando precisa, não o tempo todo.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000003','Cerâmicas biológicas','<p>As <b>cerâmicas</b> (e mídias sinterizadas) são o material clássico de filtragem biológica. Sua estrutura cheia de poros oferece enorme área para as bactérias colonizarem.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🪨</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Cerâmicas biológicas</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muitos poros, mais bactérias</text><circle cx="160" cy="112" r="6" fill="#0E7490"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Duram anos</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Enxágue na água do aquário</text>
</svg></figure>
<p>Duram anos e não precisam ser trocadas, apenas enxaguadas suavemente na água do próprio aquário quando entupidas.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Mídia biológica de qualidade é investimento único: bem cuidada, dura a vida inteira do aquário.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000003','Carvão ativado','<p>O <b>carvão ativado</b> é a mídia química mais conhecida. Adsorve compostos orgânicos, corantes e odores, deixando a água "polida" e transparente.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#F97316"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚫</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Carvão ativado</text>
<circle cx="160" cy="72" r="6" fill="#F97316"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Adsorve orgânicos e odores</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Satura e precisa trocar</text><circle cx="160" cy="152" r="6" fill="#EF4444"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Não remove amônia</text>
</svg></figure>
<p>Ele <b>satura</b> com o tempo (alguns dias a semanas) e precisa ser substituído. Depois de saturado, para de agir, e não remove amônia.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Carvão não substitui trocas de água nem filtragem biológica. É um complemento temporário.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000003','Purigen','<p>O <b>Purigen</b> é uma resina sintética que remove compostos orgânicos nitrogenados antes de virarem amônia, mantendo a água extremamente cristalina.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#F97316"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🟠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Purigen</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Água extremamente cristalina</text><circle cx="160" cy="112" r="6" fill="#22C55E"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Regenerável e reutilizável</text><circle cx="160" cy="152" r="6" fill="#EAB308"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muda de cor ao saturar</text>
</svg></figure>
<p>Sua grande vantagem é ser <b>regenerável</b>: pode ser reativado com água sanitária (seguindo o procedimento correto) e reutilizado várias vezes.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Purigen "muda de cor" conforme satura, um indicador visual prático de quando regenerar.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000003','UV (esterilizador ultravioleta)','<p>O <b>esterilizador UV</b> faz a água passar por uma lâmpada ultravioleta que inativa algas unicelulares (água verde) e microrganismos livres, ajudando no controle de surtos.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💡</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Esterilizador UV</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Combate a água verde</text><circle cx="160" cy="112" r="6" fill="#0E7490"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Reduz patógenos livres</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Precisa de vazão adequada</text>
</svg></figure>
<p>É um <b>apoio</b>, não um substituto da filtragem. Deve ter vazão adequada para dar tempo de exposição à luz.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> UV é excelente contra "água verde" e para reduzir carga de patógenos, mas não corrige má qualidade de água.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000003','Skimmer (introdução)','<p>O <b>skimmer</b> (escumadeira de proteína) é típico do aquário marinho. Ele injeta microbolhas que "grudam" nos compostos orgânicos e os retiram da água na forma de espuma, <b>antes</b> de se decomporem.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0B2A3A"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌊</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Skimmer (marinho)</text>
<circle cx="160" cy="72" r="6" fill="#0B2A3A"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Microbolhas capturam orgânicos</text><circle cx="160" cy="112" r="6" fill="#22C55E"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Retira antes de decompor</text><circle cx="160" cy="152" r="6" fill="#0E7490"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Peça central no reef</text>
</svg></figure>
<p>Em água doce ele é pouco usado; no marinho/reef é peça central da filtragem.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> No reef, o skimmer é um dos equipamentos mais importantes, veremos ele em detalhe na trilha de marinho.</div>',8);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2030000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000003','Como dimensionar um filtro','<p>Um filtro subdimensionado não dá conta da carga biológica. Como regra prática de partida:</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">📏</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Dimensionar o filtro</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/>
<text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Vazão de 5 a 10× o volume/h</text><circle cx="160" cy="112" r="6" fill="#EAB308"/>
<text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Considere a carga de peixes</text><circle cx="160" cy="152" r="6" fill="#22C55E"/>
<text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Priorize a mídia biológica</text>
</svg></figure>
<ul>
<li>Busque uma <b>vazão de 5 a 10× o volume</b> do aquário por hora (ex.: 200 L → 1000, 2000 L/h).</li>
<li>Considere a <b>bioload</b>: muitos peixes ou peixes grandes pedem mais filtragem.</li>
<li>Priorize <b>volume de mídia biológica</b>, não só vazão.</li>
</ul>
<div class="destaque">💡 <b>Ponto-chave:</b> Na dúvida, superdimensione a filtragem. Sobra de filtro nunca foi problema; falta, sempre.</div>',9);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3030000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','Qual filtragem retém as partículas visíveis da água?','["Química","Biológica","Mecânica","UV"]',2,'A mecânica retém detritos em suspensão.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3030000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','Qual mídia é o "coração" do filtro e não deve ser trocada de uma vez?','["Perlon","Cerâmica/mídia biológica","Carvão","Purigen"]',1,'A mídia biológica abriga a colônia de bactérias.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3030000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003','Uma boa regra de vazão para o filtro é:','["0,5× o volume/h","5 a 10× o volume/h","50× o volume/h","Não importa"]',1,'Entre 5 e 10 vezes o volume por hora é um bom ponto de partida.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3030000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000003','O carvão ativado:','["Remove amônia","Dura para sempre","Satura e precisa ser trocado","Substitui trocas de água"]',2,'Ele adsorve orgânicos até saturar, quando deve ser substituído.',4);

-- FIM Trilha 1
