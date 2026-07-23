-- ============================================================
-- AQUALIFE ACADEMY, CONTEÚDO · TRILHA 2 (Química da Água)
-- Idempotente. Rode DEPOIS da migration_fase6.sql (e da Trilha 1).
-- ============================================================

DELETE FROM curso_progresso WHERE curso_id IN ('a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000007');
DELETE FROM quiz_resultado  WHERE curso_id IN ('a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000007');
DELETE FROM curso           WHERE id       IN ('a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000007');

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000004','Módulo 04, Parâmetros da Água Doce','Todos os parâmetros que definem a saúde da água doce e como interpretá-los.','Temperatura, pH, KH, GH, compostos nitrogenados, cloro e oxigênio: o que cada número significa e como agir.','intermediario','Trilha 2 · Química da Água',55,4,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','Temperatura','<p>A temperatura governa o metabolismo dos peixes, o oxigênio disponível e a atividade das bactérias. A maioria dos tropicais de água doce vive bem entre <b>24 e 27 °C</b>.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Temperatura (água doce)</text>
<rect x="20" y="52" width="168" height="42" fill="#0E7490"/><text x="104" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Frio</text><rect x="188" y="52" width="224" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 24 a 27 °C</text><rect x="412" y="52" width="168" height="42" fill="#EF4444"/><text x="496" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Quente</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">18°</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">22°</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">26°</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">30°</text>
</svg></figure>
<p>Água mais quente acelera o metabolismo, mas <b>segura menos oxigênio</b>. Oscilações bruscas estressam mais do que uma temperatura um pouco fora do ideal, porém estável.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Estabilidade vale mais que perfeição: um aquecedor com termostato evita variações perigosas entre dia e noite.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','pH','<p>O <b>pH</b> mede o quão ácida ou alcalina está a água, numa escala de 0 a 14. Para um comunitário tropical, a faixa <b>6,5 a 7,5</b> atende quase todas as espécies.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Escala de pH</text>
<rect x="20" y="52" width="252" height="42" fill="#EAB308"/><text x="146" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ácido</text><rect x="272" y="52" width="112" height="42" fill="#22C55E"/><text x="328" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 6,5 a 7,5</text><rect x="384" y="52" width="196" height="42" fill="#0E7490"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alcalino</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">4</text><text x="160" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">6</text><text x="300" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">7</text><text x="440" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">10</text>
</svg></figure>
<p>Mais importante que "acertar" um número é a <b>estabilidade</b>. Um pH 7,6 constante é melhor que um pH 6,8 que oscila todo dia.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Não persiga um pH ideal com produtos químicos instáveis. Escolha peixes compatíveis com a sua água.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','KH (alcalinidade)','<p>O <b>KH</b> é a reserva de carbonatos que funciona como um <b>amortecedor do pH</b>. Quanto maior o KH, mais estável fica o pH ao longo do tempo.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">KH (alcalinidade)</text>
<rect x="20" y="52" width="168" height="42" fill="#EF4444"/><text x="104" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Instável</text><rect x="188" y="52" width="224" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 3 a 8 dKH</text><rect x="412" y="52" width="168" height="42" fill="#0E7490"/><text x="496" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alto</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">0</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">3</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">15</text>
</svg></figure>
<p>Em água doce, um KH entre <b>3 e 8 dKH</b> costuma dar boa estabilidade. KH muito baixo é a principal causa de quedas súbitas de pH.</p>
<div class="alerta">⚠️ <b>Atenção:</b> KH baixo, pH instável. Antes de "consertar" o pH, verifique sempre o KH.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000004','GH (dureza geral)','<p>O <b>GH</b> mede a dureza total da água, principalmente cálcio e magnésio. Ele influencia a saúde, a osmorregulação e a reprodução dos peixes.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">GH (dureza)</text>
<rect x="20" y="52" width="168" height="42" fill="#0E7490"/><text x="104" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Mole</text><rect x="188" y="52" width="252" height="42" fill="#22C55E"/><text x="314" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 4 a 12 dGH</text><rect x="440" y="52" width="140" height="42" fill="#EAB308"/><text x="510" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Duro</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">0</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">4</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">12</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">20</text>
</svg></figure>
<p>Uma faixa de <b>4 a 12 dGH</b> serve à maioria dos comunitários. Peixes de águas moles (como muitos tetras) preferem GH mais baixo; vivíparos gostam de GH mais alto.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> GH e KH são coisas diferentes: um mede dureza (cálcio/magnésio), o outro mede a capacidade de estabilizar o pH.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000004','Amônia','<p>A <b>amônia</b> é o resíduo mais tóxico do aquário, produzida pelos peixes e pela decomposição. O valor ideal é sempre <b>zero</b>.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">☠️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Amônia</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Resíduo mais tóxico</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ideal: sempre zero</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ataca as brânquias</text>
</svg></figure>
<p>Ela ataca as brânquias e compromete a respiração. Qualquer leitura acima de zero pede ação imediata: troca parcial de água e revisão da alimentação.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Em pH alto a amônia fica muito mais tóxica (forma NH₃). pH elevado somado a amônia é uma emergência.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000004','Nitrito','<p>O <b>nitrito (NO₂⁻)</b> é o segundo passo do ciclo do nitrogênio. Ainda é tóxico: prejudica o transporte de oxigênio no sangue do peixe.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🩸</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrito</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Segundo passo do ciclo</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ideal: zero</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Prejudica o oxigênio no sangue</text>
</svg></figure>
<p>Num aquário maduro deve estar em <b>zero</b>. Nitrito detectável indica ciclo incompleto ou filtro sobrecarregado.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Nitrito acima de zero, não adicione peixes. Faça trocas e espere a colônia de bactérias se completar.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000004','Nitrato','<p>O <b>nitrato (NO₃⁻)</b> é o produto final do ciclo, bem menos tóxico. Acumula com o tempo e é controlado pelas trocas de água e pelas plantas.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Nitrato (água doce)</text>
<rect x="20" y="52" width="196" height="42" fill="#22C55E"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal < 20 mg/L</text><rect x="216" y="52" width="168" height="42" fill="#EAB308"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Aceitável</text><rect x="384" y="52" width="196" height="42" fill="#EF4444"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alto, troque a água</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">0</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">20</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">40</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">80</text>
</svg></figure>
<p>Em água doce, procure manter <b>abaixo de 20 a 40 mg/L</b>. Nitrato alto favorece algas e estressa espécies sensíveis.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Nitrato subindo é sinal de que está na hora da troca parcial de água. É o "termômetro" da manutenção.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000004','Cloro','<p>O <b>cloro</b> da água de torneira é excelente para desinfetar o abastecimento, mas <b>mortal para o aquário</b>: mata peixes e, principalmente, as bactérias do filtro.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🚱</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Cloro</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Vem da torneira</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mata peixes e bactérias</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Trate a água sempre</text>
</svg></figure>
<p>Toda água nova deve ser tratada com um <b>condicionador (anticloro)</b> antes de entrar no aquário.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca reponha água direto da torneira sem tratar. O cloro reinicia o ciclo ao matar a colônia biológica.</div>',8);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000004','Cloramina','<p>Muitas cidades usam <b>cloramina</b> (cloro combinado com amônia) por ser mais estável que o cloro puro. O problema: ela não evapora ao deixar a água descansada.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧪</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Cloramina</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Cloro + amônia</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Não evapora descansando</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Exige anticloro específico</text>
</svg></figure>
<p>É preciso um condicionador que <b>neutralize cloro e amônia</b>. Deixar a água "descansando" não resolve a cloramina.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Descubra o que sua companhia de água usa. Se for cloramina, escolha um anticloro específico para ela.</div>',9);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000010','a1000000-0000-4000-8000-000000000004','Condutividade','<p>A <b>condutividade</b> mede a quantidade de sais e minerais dissolvidos na água (medida em µS/cm). É um retrato geral de quão "carregada" a água está.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">📶</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Condutividade</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sais dissolvidos (µS/cm)</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Útil para reprodução</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sobe entre trocas</text>
</svg></figure>
<p>É muito útil para reprodução e para espécies exigentes, e ajuda a acompanhar o acúmulo de sais entre as trocas de água.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Condutividade subindo entre trocas indica acúmulo de sais e resíduos. Ótimo indicador complementar ao nitrato.</div>',10);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000011','a1000000-0000-4000-8000-000000000004','Oxigênio dissolvido','<p>O <b>oxigênio dissolvido</b> é a vida do aquário: peixes, plantas (à noite) e bactérias consomem O₂. Um bom nível fica acima de <b>5 a 6 mg/L</b>.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Oxigênio dissolvido</text>
<rect x="20" y="52" width="224" height="42" fill="#EF4444"/><text x="132" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Baixo, perigo</text><rect x="244" y="52" width="336" height="42" fill="#22C55E"/><text x="412" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Bom > 5 a 6 mg/L</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">0</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">3</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">6</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">9</text>
</svg></figure>
<p>A troca gasosa acontece na <b>superfície</b>. Movimentação da água e uma boa superfície de contato oxigenam melhor que "jogar bolhas" no fundo.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Água quente segura menos oxigênio. Em dias de calor, reforce a movimentação da superfície.</div>',11);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2040000-0000-4000-8000-000000000012','a1000000-0000-4000-8000-000000000004','Como interpretar um teste','<p>Testar sem interpretar não adianta. Leia os parâmetros <b>em conjunto</b>: amônia e nitrito contam a maturidade do filtro; KH e pH contam a estabilidade; nitrato conta a manutenção.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🔎</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Interpretar o teste</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Leia os parâmetros juntos</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Observe tendências</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Base da Nota de Saúde</text>
</svg></figure>
<p>Anote os valores e observe <b>tendências</b> ao longo do tempo, não apenas o número de hoje. É assim que o Aqualife Care gera a Nota de Saúde do seu aquário.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Um parâmetro isolado engana. O diagnóstico certo vem da leitura combinada de todos eles.</div>',12);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3040000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','Qual faixa de pH atende a maioria dos comunitários tropicais?','["4,0 a 5,0","6,5 a 7,5","8,5 a 9,5","Qualquer uma"]',1,'6,5 a 7,5 atende quase todas as espécies comunitárias.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3040000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','O que o KH faz pela água?','["Mede a sujeira","Amortece o pH","Adiciona oxigênio","Remove cloro"]',1,'O KH é a reserva que estabiliza o pH.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3040000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','Qual o valor ideal de amônia e nitrito?','["Ambos altos","Ambos zero","Só amônia zero","Tanto faz"]',1,'Amônia e nitrito devem estar sempre em zero.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3040000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000004','Por que tratar a água nova antes de repor?','["Para esquentar","Para remover cloro/cloramina","Para deixar bonita","Não precisa"]',1,'O cloro e a cloramina matam peixes e bactérias.',4);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000005','Módulo 05, Parâmetros da Água Marinha','A química do aquário marinho e reef, onde a estabilidade é tudo.','Salinidade, alcalinidade, cálcio, magnésio, nutrientes e as análises avançadas (ICP, ORP) que sustentam um reef saudável.','avancado','Trilha 2 · Química da Água',60,5,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000005','Salinidade','<p>A <b>salinidade</b> é a quantidade de sal dissolvido na água do mar, medida em <b>ppt</b> (partes por mil). O padrão para reef é cerca de <b>35 ppt</b>.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Salinidade (reef)</text>
<rect x="20" y="52" width="196" height="42" fill="#0E7490"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Baixa</text><rect x="216" y="52" width="168" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal ~35 ppt</text><rect x="384" y="52" width="196" height="42" fill="#EF4444"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alta</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">28</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">33</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">37</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">42</text>
</svg></figure>
<p>Ela deve permanecer estável: quedas ou picos estressam peixes e, principalmente, corais e invertebrados, muito sensíveis a variações.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Reponha a evaporação sempre com água doce (RO/DI), nunca com água salgada: só a água evapora, o sal fica.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000005','Densidade','<p>A <b>densidade</b> (medida com refratômetro ou densímetro) é a forma prática de acompanhar a salinidade no dia a dia. O alvo de reef é cerca de <b>1.025 sg</b>.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🔬</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Densidade</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alvo ~1.025 sg</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Refratômetro é mais preciso</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Calibre com regularidade</text>
</svg></figure>
<p>O <b>refratômetro</b> é bem mais preciso que o densímetro de bóia, e deve ser calibrado com solução própria.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Calibre o refratômetro com regularidade. Um instrumento descalibrado leva a erros de salinidade perigosos.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000005','Temperatura','<p>No marinho, a temperatura ideal costuma ficar entre <b>24 e 26 °C</b>, mantida bem estável. Corais toleram mal picos de calor.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Temperatura (marinho)</text>
<rect x="20" y="52" width="196" height="42" fill="#0E7490"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Frio</text><rect x="216" y="52" width="168" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 24 a 26 °C</text><rect x="384" y="52" width="196" height="42" fill="#EF4444"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Calor, risco</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">22°</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">24°</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">26°</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">29°</text>
</svg></figure>
<p>Sistemas de reef quase sempre usam <b>controlador de temperatura</b> e, em climas quentes, chiller ou ventilação para evitar superaquecimento.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Calor excessivo derruba o oxigênio e pode causar branqueamento de corais. Monitore nos dias quentes.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','KH (alcalinidade)','<p>A <b>alcalinidade (KH)</b> é um dos parâmetros mais importantes do reef: sustenta o pH e fornece carbonatos para o crescimento do esqueleto dos corais.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Alcalinidade (KH reef)</text>
<rect x="20" y="52" width="168" height="42" fill="#EAB308"/><text x="104" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Baixa</text><rect x="188" y="52" width="224" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 7 a 11 dKH</text><rect x="412" y="52" width="168" height="42" fill="#0E7490"/><text x="496" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alta</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">5</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">7</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">11</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">14</text>
</svg></figure>
<p>A faixa usual é <b>7 a 11 dKH</b>, mantida o mais <b>estável</b> possível. Oscilações de KH são uma das principais causas de perda de corais SPS.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> No reef, estabilidade de KH vence valor perfeito. Prefira dosar pouco e sempre a corrigir de uma vez.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000005','Cálcio','<p>O <b>cálcio</b> é o tijolo do esqueleto dos corais e da concha de moluscos. A faixa alvo é <b>400 a 450 ppm</b>.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Cálcio</text>
<rect x="20" y="52" width="196" height="42" fill="#EAB308"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Baixo</text><rect x="216" y="52" width="168" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 400 a 450</text><rect x="384" y="52" width="196" height="42" fill="#0E7490"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alto</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">350</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">400</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">450</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">500</text>
</svg></figure>
<p>Cálcio, alcalinidade e magnésio trabalham <b>juntos</b>: manter os três equilibrados é a base de um reef que cresce.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Cálcio, KH e magnésio formam um trio. Corrigir um ignorando os outros gera instabilidade.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000005','Magnésio','<p>O <b>magnésio</b> (alvo de <b>1250 a 1350 ppm</b>) é o elemento que mantém cálcio e alcalinidade em solução, evitando que eles "precipitem" um sobre o outro.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧲</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Magnésio</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alvo 1250 a 1350 ppm</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mantém Ca e KH em solução</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Baixo trava a dosagem</text>
</svg></figure>
<p>Quando cálcio e KH não sobem por mais que você dose, quase sempre o <b>magnésio está baixo</b>.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Magnésio é o "equilibrista" do reef. Sem ele, cálcio e alcalinidade não se mantêm.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000005','pH','<p>No marinho o <b>pH</b> saudável fica entre <b>8,1 e 8,4</b>. Ele acompanha de perto a alcalinidade e varia um pouco entre dia e noite.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">pH (marinho)</text>
<rect x="20" y="52" width="196" height="42" fill="#EAB308"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Baixo</text><rect x="216" y="52" width="168" height="42" fill="#22C55E"/><text x="300" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 8,1 a 8,4</text><rect x="384" y="52" width="196" height="42" fill="#0E7490"/><text x="482" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Alto</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">7,8</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8,1</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8,4</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8,6</text>
</svg></figure>
<p>pH baixo costuma refletir excesso de CO₂ no ambiente ou alcalinidade insuficiente, mais do que um problema isolado.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Não corrija pH diretamente: ajuste a alcalinidade e a troca gasosa, e o pH acompanha.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000005','Fosfato','<p>O <b>fosfato (PO₄)</b> é um nutriente que, em excesso, alimenta algas e inibe o crescimento dos corais. O alvo é <b>baixo, porém não zero</b> (cerca de 0,03 a 0,1 ppm).</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌿</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Fosfato</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Baixo, mas não zero</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Excesso alimenta algas</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alvo ~0,03 a 0,1 ppm</text>
</svg></figure>
<p>Controla-se com boa filtragem, skimmer, trocas de água e mídias específicas (como GFO), sempre de forma gradual.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Zerar completamente os nutrientes é tão ruim quanto excesso: corais precisam de um mínimo de fosfato e nitrato.</div>',8);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000005','Nitrato','<p>Diferente da água doce, no reef o <b>nitrato</b> ideal não é zero: uma faixa baixa (cerca de <b>1 a 10 ppm</b>) alimenta os corais e mantém a cor.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🪸</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrato (reef)</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ideal 1 a 10 ppm</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Zero deixa corais pálidos</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alto favorece algas</text>
</svg></figure>
<p>Nitrato muito alto favorece algas; zerado demais deixa corais pálidos e a zooxantela sofre.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> No reef, pense em "nutrientes equilibrados", não em "água esterilizada". Fosfato e nitrato baixos, mas presentes.</div>',9);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000010','a1000000-0000-4000-8000-000000000005','ICP (análise de elementos)','<p>A análise <b>ICP</b> é um exame laboratorial que mede dezenas de elementos da água (maiores e traços) e detecta contaminações que os testes caseiros não veem.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧬</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Análise ICP</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mede dezenas de elementos</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Detecta contaminações</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">O "exame de sangue" do reef</text>
</svg></figure>
<p>É a ferramenta avançada para diagnosticar problemas persistentes e ajustar a reposição de elementos-traço com precisão.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> O ICP é como um "exame de sangue" do reef: revela o que nenhum teste de kit consegue mostrar.</div>',10);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000011','a1000000-0000-4000-8000-000000000005','ORP','<p>O <b>ORP</b> (potencial de oxirredução, em mV) indica a capacidade "oxidante" da água, um reflexo geral da qualidade e da carga orgânica. Valores comuns ficam entre <b>300 e 400 mV</b>.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚡</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">ORP</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Qualidade oxidante (mV)</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Comum 300 a 400 mV</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Observe a tendência</text>
</svg></figure>
<p>É um parâmetro de <b>tendência</b>: mais útil acompanhar a curva ao longo do tempo do que um número isolado.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Não persiga um número de ORP. Observe a tendência: quedas podem indicar acúmulo de matéria orgânica.</div>',11);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2050000-0000-4000-8000-000000000012','a1000000-0000-4000-8000-000000000005','Estabilidade química','<p>Se há uma lição no reef, é esta: <b>estabilidade importa mais que perfeição</b>. Corais se adaptam a valores um pouco fora do ideal, desde que constantes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚖️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Estabilidade química</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Constância > perfeição</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Automatize a reposição</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Oscilação é o inimigo</text>
</svg></figure>
<p>Automatizar a reposição (ATO, dosadoras) e testar com regularidade é o que mantém os parâmetros firmes ao longo das semanas.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> O maior inimigo do reef é a oscilação. Constância diária vale mais que qualquer valor "perfeito".</div>',12);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3050000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000005','Qual a densidade típica de um reef?','["1.005","1.015","1.025","1.040"]',2,'Cerca de 1.025 sg (aprox. 35 ppt).',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3050000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000005','Quando cálcio e KH não sobem, o que costuma estar baixo?','["Oxigênio","Magnésio","Nitrato","Temperatura"]',1,'O magnésio mantém cálcio e alcalinidade em solução.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3050000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000005','No reef, o nitrato ideal é:','["Zero absoluto","Baixo, mas não zero","O mais alto possível","Irrelevante"]',1,'Corais precisam de um mínimo de nutrientes; nem zero, nem alto.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3050000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000005','O que mais importa nos parâmetros do reef?','["Bater o valor perfeito","A estabilidade","Trocar 100% da água","O ORP máximo"]',1,'Estabilidade vence perfeição no aquário marinho.',4);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000006','Módulo 06, Parâmetros para Lagos Ornamentais','A química dos grandes volumes ao ar livre, onde oxigênio e filtragem mandam.','Como os parâmetros se comportam em lagos de carpas e ornamentais, sob influência do clima e de grandes volumes de água.','intermediario','Trilha 2 · Química da Água',45,6,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000006','Oxigênio','<p>Em lagos, o <b>oxigênio</b> é o parâmetro mais crítico. Carpas grandes, temperatura alta e matéria orgânica no fundo consomem muito O₂, sobretudo à noite.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Oxigênio no lago</text>
<rect x="20" y="52" width="224" height="42" fill="#EF4444"/><text x="132" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Crítico</text><rect x="244" y="52" width="336" height="42" fill="#22C55E"/><text x="412" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Bom > 6 mg/L</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">0</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">3</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">6</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">9</text>
</svg></figure>
<p>Cascatas, aeradores e boa movimentação de superfície são essenciais. Um bom alvo é manter acima de <b>6 mg/L</b>.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Peixes boiando na superfície ao amanhecer é sinal clássico de falta de oxigênio. Reforce a aeração.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000006','Temperatura','<p>Lagos vivem ao ar livre, então a <b>temperatura</b> varia com as estações. As carpas toleram uma ampla faixa, mas <b>mudanças bruscas</b> e o frio extremo exigem cuidado.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌡️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Temperatura no lago</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Varia com as estações</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Frio: comem menos</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Calor: menos oxigênio</text>
</svg></figure>
<p>No calor, a água segura menos oxigênio e o metabolismo dispara; no frio, os peixes reduzem a alimentação.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Ajuste a alimentação à temperatura: no frio, os peixes digerem devagar e comem menos.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000006','pH','<p>Para lagos de carpas, um <b>pH</b> entre <b>7,0 e 8,5</b> é confortável. O grande risco é a <b>oscilação diária</b>, puxada pela fotossíntese das algas.</p>
<figure><svg viewBox="0 0 600 130" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="600" height="130" rx="14" fill="#F6F9FB"/>
<text x="20" y="34" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">pH (lago de carpas)</text>
<rect x="20" y="52" width="196" height="42" fill="#EAB308"/><text x="118" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ácido</text><rect x="216" y="52" width="224" height="42" fill="#22C55E"/><text x="328" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Ideal 7,0 a 8,5</text><rect x="440" y="52" width="140" height="42" fill="#0E7490"/><text x="510" y="78" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff">Muito alcalino</text><text x="20" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">6</text><text x="206.66666666666666" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">7</text><text x="393.3333333333333" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">8,5</text><text x="580" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#64748B">10</text>
</svg></figure>
<p>Durante o dia as algas consomem CO₂ e o pH sobe; à noite ele cai. Um bom KH segura essa variação.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Em lago, o pH que oscila muito entre dia e noite quase sempre denuncia excesso de algas e KH baixo.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000006','KH','<p>O <b>KH</b> é o freio das oscilações de pH no lago. Manter o KH acima de <b>4 dKH</b> ajuda a segurar o pH estável apesar da atividade das algas.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧱</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">KH no lago</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Freia a oscilação de pH</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mantenha acima de 4 dKH</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Chuva dilui, reponha</text>
</svg></figure>
<p>Chuvas fortes podem diluir o KH; após temporais, vale conferir e repor a alcalinidade se necessário.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Depois de chuvas intensas, cheque o KH: água da chuva é mole e derruba a alcalinidade do lago.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000006','GH','<p>O <b>GH</b> (dureza) influencia a saúde e a coloração das carpas. Valores moderados favorecem o bem-estar e a resistência dos peixes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💎</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">GH no lago</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Afeta saúde e cor das carpas</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Concreto/calcário elevam</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Manta/chuva reduzem</text>
</svg></figure>
<p>Lagos de concreto ou com pedras calcárias tendem a ter GH e KH mais altos; lagos só com manta e água de chuva, mais baixos.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> O material do lago influencia a química: concreto e calcário elevam dureza e alcalinidade naturalmente.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000006','Amônia','<p>Como em qualquer sistema, a <b>amônia</b> deve ser <b>zero</b>. Em lagos, o grande gerador é o excesso de ração e a alta densidade de peixes grandes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">☠️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Amônia no lago</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ideal: zero</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Gerada por excesso de ração</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Exige muita filtragem</text>
</svg></figure>
<p>A filtragem biológica precisa ser dimensionada para a enorme carga que carpas adultas produzem.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Superalimentar carpas é o erro nº 1 em lagos. Sobra de ração vira amônia e derruba a qualidade da água.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000006','Nitrito','<p>O <b>nitrito</b> também deve ficar em <b>zero</b>. Picos aparecem quando a filtragem não acompanha o crescimento dos peixes ou após limpezas agressivas do filtro.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🩸</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrito no lago</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ideal: zero</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Pico se a filtragem não acompanha</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Volume esconde o problema</text>
</svg></figure>
<p>Em grandes volumes, mudanças são mais lentas, o que dá tempo de agir, mas também esconde problemas que se acumulam.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> O grande volume do lago dilui e "esconde" problemas. Teste com regularidade para não ser pego de surpresa.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000006','Nitrato','<p>O <b>nitrato</b> se acumula e alimenta algas, o pesadelo estético dos lagos. Trocas parciais, plantas aquáticas e boas mídias ajudam a controlá-lo.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌱</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrato no lago</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alimenta algas</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Trocas e plantas controlam</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Filtro vegetal ajuda</text>
</svg></figure>
<p>Plantas de zona de regeneração e filtros vegetais consomem nitrato e competem com as algas por nutrientes.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Plantas são aliadas contra o nitrato e as algas: elas "roubam" os nutrientes que as algas usariam.</div>',8);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000006','Filtragem em grandes volumes','<p>Filtrar um lago é outro jogo: são milhares de litros e uma carga biológica altíssima. Usam-se <b>pré-filtros, filtros de tambor, câmaras biológicas</b> e alta vazão.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌀</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Filtragem de grandes volumes</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Pré-filtro e tambor</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Câmara biológica</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Alta vazão</text>
</svg></figure>
<p>O objetivo é remover sólidos antes que apodreçam e oferecer área biológica suficiente para a amônia das carpas.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Em lago, remover o sólido cedo (pré-filtro/tambor) é metade da batalha pela água limpa.</div>',9);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2060000-0000-4000-8000-000000000010','a1000000-0000-4000-8000-000000000006','Como interpretar testes','<p>No lago, leia os testes considerando o <b>clima e a estação</b>: calor, chuva e queda de folhas mudam os parâmetros rapidamente.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">📅</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Interpretar no lago</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Considere clima e estação</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Cruze com o comportamento</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Teste com regularidade</text>
</svg></figure>
<p>Acompanhe oxigênio, amônia, nitrito e KH com regularidade, e cruze os números com o comportamento dos peixes.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> No lago, o contexto (estação, chuva, temperatura) é parte do diagnóstico tanto quanto o número do teste.</div>',10);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3060000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000006','Qual o parâmetro mais crítico em lagos?','["Cor da água","Oxigênio","GH","pH da chuva"]',1,'Grandes peixes e calor consomem muito oxigênio, sobretudo à noite.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3060000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000006','O que segura a oscilação de pH causada pelas algas?','["Um bom KH","Mais ração","Menos plantas","Água da chuva"]',0,'O KH amortece as variações de pH entre dia e noite.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3060000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000006','Qual o erro nº 1 em lagos de carpas?','["Trocar água","Superalimentar","Usar plantas","Aerar demais"]',1,'Excesso de ração vira amônia e degrada a água.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3060000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000006','O que ajuda a controlar nitrato e algas no lago?','["Mais sol","Plantas aquáticas","Parar as trocas","Menos filtragem"]',1,'Plantas consomem nitrato e competem com as algas.',4);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000007','Módulo 07, Interações Químicas Perigosas','Como os parâmetros se combinam, às vezes de forma perigosa. Conteúdo raro em português.','Nenhum parâmetro age sozinho. Aqui você entende as combinações que transformam números "normais" em risco real.','avancado','Trilha 2 · Química da Água',45,7,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000007','pH × amônia (NH₃)','<p>Este é o par mais perigoso do aquarismo. A amônia existe em duas formas: <b>NH₄⁺</b> (íon, pouco tóxico) e <b>NH₃</b> (gás, muito tóxico).</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">pH alto</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Amônia</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EF4444"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">NH₃ tóxico, emergência</text>
</svg></figure>
<p>Quanto <b>mais alto o pH e a temperatura</b>, maior a fração de NH₃. A mesma leitura de amônia é inofensiva em pH 6,5 e letal em pH 8,5.</p>
<div class="alerta">⚠️ <b>Atenção:</b> pH alto somado a amônia é a interação mais crítica: o motor de diagnóstico da Aqualife trata isso como emergência.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000007','KH × estabilidade do pH','<p>O <b>KH</b> é o que impede o pH de "despencar". Com KH suficiente, o pH resiste às ácidos produzidos no dia a dia; com KH baixo, ele cai de repente.</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">KH baixo</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Ácidos do dia a dia</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EF4444"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Queda brusca de pH</text>
</svg></figure>
<p>Quedas bruscas de pH (o temido "pH crash") quase sempre têm um KH esgotado por trás.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Antes de mexer no pH, olhe o KH. Corrigir o KH resolve a maioria das instabilidades de pH.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000007','Temperatura × oxigênio','<p>Água quente <b>segura menos oxigênio</b>. Ao mesmo tempo, o calor acelera o metabolismo dos peixes, que passam a <b>precisar de mais</b> O₂. É uma tesoura perigosa.</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Calor</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Mais metabolismo</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EF4444"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Menos O₂, mais demanda</text>
</svg></figure>
<p>Por isso, ondas de calor causam mortes: a demanda sobe justamente quando a oferta cai.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Em dias quentes, aumente a movimentação de superfície e evite superlotação: é quando o oxigênio fica no limite.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000007','Salinidade × toxicidade','<p>A salinidade altera o quanto certos compostos afetam os organismos e como os animais fazem osmorregulação. Mudanças rápidas de salinidade estressam e podem ser letais.</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Salinidade</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Mudança rápida</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EAB308"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Choque osmótico</text>
</svg></figure>
<p>Em marinho, variações de salinidade também deslocam o equilíbrio de outros parâmetros, afetando corais sensíveis.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Ajuste a salinidade sempre devagar. Mudanças rápidas causam choque, mesmo dentro de faixas "normais".</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000007','Nitrito × transporte de oxigênio','<p>O <b>nitrito</b> não só é tóxico: ele se liga à hemoglobina e forma metemoglobina, que <b>não carrega oxigênio</b> (a "doença do sangue marrom").</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Nitrito</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Hemoglobina</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EF4444"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Sangue não leva O₂</text>
</svg></figure>
<p>Ou seja, o peixe pode "sufocar" mesmo com bastante O₂ na água. Por isso nitrito acima de zero é tão grave.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Adicionar um pouco de sal pode reduzir a toxicidade do nitrito em emergências de água doce, mas a solução real é zerar o nitrito.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000007','Cloro × bactérias','<p>O <b>cloro</b> e a cloramina são projetados para matar microrganismos, e cumprem isso muito bem, inclusive as <b>bactérias benéficas</b> do seu filtro.</p>
<figure><svg viewBox="0 0 620 110" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="110" rx="14" fill="#F6F9FB"/>
<rect x="24" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="99" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Cloro</text>
<text x="198" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">+</text>
<rect x="222" y="30" width="150" height="50" rx="12" fill="#fff" stroke="#0E7490" stroke-width="2.5"/>
<text x="297" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="15" fill="#0B2A3A">Mídia biológica</text>
<text x="396" y="62" text-anchor="middle" font-size="24" fill="#0B2A3A">=</text>
<rect x="420" y="30" width="176" height="50" rx="12" fill="#EF4444"/>
<text x="508" y="61" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Colônia morta, ciclo reinicia</text>
</svg></figure>
<p>Repor água sem tratar, ou lavar a mídia na torneira, mata a colônia e reinicia o ciclo do nitrogênio, gerando picos de amônia.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Cloro e mídia biológica não convivem. Sempre trate a água e lave o filtro apenas com a água do aquário.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000007','Metais pesados','<p><b>Metais pesados</b> (cobre, zinco, chumbo) podem entrar pela água de torneira, encanamentos antigos ou objetos inadequados. São muito tóxicos, especialmente para <b>invertebrados e corais</b>.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧫</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Metais pesados</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Cobre, zinco, chumbo</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Letais a invertebrados</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Água RO/DI no reef</text>
</svg></figure>
<p>Condicionadores de água costumam quelar (neutralizar) metais; para reef, água RO/DI é praticamente obrigatória.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Cobre é letal para camarões, caramujos e corais. Jamais use medicamentos com cobre num aquário com invertebrados.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000007','Choque osmótico','<p>O <b>choque osmótico</b> ocorre quando um animal passa rápido demais entre águas de parâmetros muito diferentes (salinidade, GH, temperatura, pH).</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💧</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Choque osmótico</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mudança rápida de parâmetros</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Aclimate sempre devagar</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Causa de mortes iniciais</text>
</svg></figure>
<p>É a razão da <b>aclimatação lenta</b> ao introduzir novos habitantes: dar tempo para o corpo se ajustar evita o choque.</p>
<div class="destaque">💡 <b>Ponto-chave:</b> Aclimate sempre devagar. A maioria das mortes "sem explicação" nos primeiros dias é choque osmótico.</div>',8);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2070000-0000-4000-8000-000000000009','a1000000-0000-4000-8000-000000000007','Quando NÃO fazer TPAs grandes','<p>Trocas parciais são ótimas, mas uma <b>troca muito grande e brusca</b> pode fazer mais mal que bem, mudando de uma vez o pH, o KH, a temperatura e a salinidade.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/>
<rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🚰</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Quando NÃO fazer TPA grande</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Troca brusca muda tudo</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Prefira trocas pequenas</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Corrija aos poucos</text>
</svg></figure>
<p>Em aquários com parâmetros muito degradados, o certo é fazer <b>trocas menores e frequentes</b>, corrigindo aos poucos.</p>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca "salve" um aquário ruim com uma troca de 90%: a mudança brusca pode matar mais que o problema original.</div>',9);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3070000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000007','O que torna a amônia muito mais tóxica?','["pH e temperatura altos","Água fria","pH baixo","Pouca luz"]',0,'pH e temperatura altos aumentam a forma tóxica NH₃.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3070000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000007','A queda brusca de pH ("crash") está ligada a:','["GH alto","KH esgotado","Muito oxigênio","Nitrato zero"]',1,'Sem KH, o pH perde o amortecimento e despenca.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3070000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000007','Por que o nitrito é tão perigoso?','["Deixa a água turva","Impede o sangue de carregar oxigênio","Aumenta o pH","Esfria a água"]',1,'Forma metemoglobina, que não transporta oxigênio.',3);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3070000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000007','Diante de um aquário muito degradado, o certo é:','["Trocar 90% de uma vez","Trocas menores e frequentes","Não trocar nada","Só adicionar química"]',1,'Correções graduais evitam choque por mudança brusca.',4);

-- FIM Trilha 2
