-- ============================================================
-- AQUALIFE ACADEMY, CONTEÚDO · TRILHA 4 (Saúde Animal)
-- Idempotente. Rode DEPOIS da migration_fase6.sql.
-- ============================================================

DELETE FROM curso_progresso WHERE curso_id IN ('a1000000-0000-4000-8000-000000000017','a1000000-0000-4000-8000-000000000018','a1000000-0000-4000-8000-000000000019','a1000000-0000-4000-8000-000000000020');
DELETE FROM quiz_resultado  WHERE curso_id IN ('a1000000-0000-4000-8000-000000000017','a1000000-0000-4000-8000-000000000018','a1000000-0000-4000-8000-000000000019','a1000000-0000-4000-8000-000000000020');
DELETE FROM curso           WHERE id       IN ('a1000000-0000-4000-8000-000000000017','a1000000-0000-4000-8000-000000000018','a1000000-0000-4000-8000-000000000019','a1000000-0000-4000-8000-000000000020');

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000017','Módulo 17, Sinais de Estresse','Ler o comportamento do peixe é a primeira linha de diagnóstico.','Antes de qualquer doença, o peixe avisa pelo comportamento. Aprenda a enxergar os sinais cedo.','intermediario','Trilha 4 · Saúde Animal',35,17,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000017','Respiração acelerada','<p>Guelras se movendo rápido, ou o peixe "ofegante" na superfície, quase sempre apontam para <b>falta de oxigênio</b> ou <b>água intoxicada</b> (amônia, nitrito).</p>
<p>É um dos sinais mais urgentes: verifique oxigenação, temperatura e teste amônia/nitrito imediatamente.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💨</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Respiração acelerada</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Falta de oxigênio</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Amônia ou nitrito</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Cheque a água já</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Peixes reunidos na superfície ofegando é emergência: pode ser oxigênio no limite ou pico de amônia.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000017','Peixe parado','<p>Um peixe normalmente ativo que fica <b>parado num canto</b>, no fundo ou na superfície, sinaliza mal-estar: água ruim, temperatura errada ou início de doença.</p>
<p>Compare com o comportamento habitual da espécie: alguns são naturalmente quietos, outros não.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🛑</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Peixe parado</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Fora do comportamento normal</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Água, temperatura ou doença</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Observe e teste</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Conhecer o "normal" de cada peixe é o que permite notar o "anormal" cedo. Observe seu aquário todo dia.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000017','Nadadeiras fechadas','<p>Nadadeiras <b>coladas ao corpo</b> (em vez de abertas) são um clássico sinal de desconforto ou estresse, comum em água de má qualidade ou temperatura baixa.</p>
<p>Se persistir, costuma preceder doenças como podridão de nadadeiras.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🎏</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nadadeiras fechadas</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Desconforto ou estresse</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Pode preceder fin rot</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Revise a qualidade da água</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Nadadeira "cerradinha" por dias é um alerta precoce. Corrija a água antes que vire doença.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000017','Perda de cor','<p>O <b>desbotamento</b> das cores reflete estresse, medo ou problema de saúde. Peixes pálidos muitas vezes estão assustados, doentes ou em água inadequada.</p>
<p>Cores voltam quando o peixe se sente seguro: bom cardume, esconderijos e água estável.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🎨</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Perda de cor</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Estresse ou medo</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Água inadequada</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Segurança traz a cor de volta</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Cor apagada raramente é "genética". Quase sempre é recado de estresse ou de água que precisa de atenção.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000017','Coceira (flashing)','<p>Quando o peixe <b>se raspa</b> em pedras, substrato ou decoração (o "flashing"), há irritação na pele ou nas guelras, muitas vezes por parasitas ou por água irritante.</p>
<p>É um sinal precoce importante de íctio e oodinium, antes mesmo de aparecerem pontos.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌀</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Coceira / flashing</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Peixe se raspa nas superfícies</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Parasitas ou água irritante</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sinal precoce de íctio</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Flashing frequente costuma anteceder o íctio visível. Aja cedo: observe de perto e cheque a água.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000017','Saltos','<p>Peixe que <b>salta</b> para fora está tentando escapar de algo: água intoxicada, parâmetros ruins, agressão de outro peixe ou susto.</p>
<p>Além de perigoso (o peixe pode morrer fora d''água), é um recado de que algo no ambiente está errado.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⬆️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Saltos</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Fuga de água ruim ou agressão</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Risco de morte fora da água</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Tampe e investigue a causa</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Aquário sempre tampado. E lembre: salto repetido não é "acidente", é fuga de um problema no ambiente.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000017','Apatia','<p>A <b>apatia</b> (peixe sem energia, que não reage à comida nem ao ambiente) indica adoecimento ou intoxicação já instalados.</p>
<p>Perda de apetite é um dos primeiros sinais: um peixe que para de comer merece atenção imediata.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EAB308"/>
<text x="72" y="100" text-anchor="middle" font-size="52">😴</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Apatia</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sem energia, não reage</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Perda de apetite</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Adoecimento em curso</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Recusar comida é um dos primeiros sintomas de quase tudo. Não ignore um peixe que parou de comer.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2170000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000017','Isolamento','<p>Um peixe de cardume que <b>se afasta do grupo</b>, ou um que se esconde o tempo todo, pode estar doente, sendo perseguido ou estressado por parâmetros ruins.</p>
<p>Observar quem se isola ajuda a identificar o doente antes que ele contamine os outros.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🚪</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Isolamento</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Afasta-se do cardume</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Doença ou perseguição</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Identifique cedo o doente</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> O que se isola costuma ser o primeiro a adoecer. Vigie-o de perto e esteja pronto para o hospital tank.</div>',8);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3170000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000017','Respiração muito acelerada aponta principalmente para:','["Fome","Falta de oxigênio ou intoxicação","Excesso de luz","Idade"]',1,'Oxigênio baixo ou amônia/nitrito. É urgente.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3170000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000017','O "flashing" (peixe se raspando) é sinal precoce de:','["Boa saúde","Parasitas como íctio","Fome","Reprodução"]',1,'Irritação por parasitas ou água; antecede o íctio visível.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3170000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000017','Um peixe que parou de comer:','["Está apenas de dieta","Merece atenção imediata","É sempre normal","Está reproduzindo"]',1,'Perda de apetite é um dos primeiros sintomas de doença.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000018','Módulo 18, Principais Doenças','As doenças mais comuns, como reconhecê-las e o que fazer.','Íctio, oodinium, fungos, podridão de nadadeiras e as doenças bacterianas: identificação e conduta.','intermediario','Trilha 4 · Saúde Animal',45,18,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000018','Íctio (pontos brancos)','<p>O <b>íctio</b> é a doença mais comum: pequenos <b>pontos brancos</b> como grãos de sal pelo corpo e nadadeiras, causados por um parasita. Vem quase sempre com coceira e respiração rápida.</p>
<p>O tratamento combina <b>elevar a temperatura</b> (acelera o ciclo do parasita) e medicação específica, sempre com água bem oxigenada.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚪</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Íctio</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Pontos brancos "de sal"</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Parasita, muito contagioso</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Calor + medicação</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Íctio se espalha rápido. Trate todo o aquário e aumente a oxigenação, pois água quente segura menos O₂.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000018','Oodinium (veludo)','<p>O <b>oodinium</b> forma uma poeira dourada/aveludada sobre a pele, mais fina que o íctio. É agressivo e pede ação rápida.</p>
<p>Peixes ficam ofegantes e coçando cedo, às vezes antes do "veludo" ser visível a olho nu.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EAB308"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🟡</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Oodinium (veludo)</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Poeira dourada na pele</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muito agressivo</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ação rápida e específica</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> O oodinium mata rápido e é sutil no início. Coceira intensa sem pontos brancos evidentes acende o alerta.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000018','Fungos','<p>Os <b>fungos</b> aparecem como tufos <b>algodoados</b> brancos sobre feridas, boca ou olhos. Costumam ser oportunistas: instalam-se onde já havia uma lesão ou água ruim.</p>
<p>Corrigir a qualidade da água e tratar a ferida é metade da cura.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">☁️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Fungos</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Tufos algodoados</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Oportunistas em feridas</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Trate a água e a lesão</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Fungo raramente é a causa raiz: quase sempre vem depois de uma ferida ou de água descuidada. Trate a origem.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000018','Fin Rot (podridão de nadadeiras)','<p>A <b>podridão de nadadeiras</b> "desfia" e escurece as bordas das nadadeiras. É bacteriana e quase sempre ligada a <b>água de má qualidade</b> ou frio.</p>
<p>Na maioria dos casos leves, melhorar a água já reverte o quadro sem medicação pesada.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🎏</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Fin Rot</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nadadeiras desfiadas</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Bacteriana, água ruim/fria</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Corrigir a água costuma reverter</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Antes de medicar fin rot, conserte a água e a temperatura. Muitos casos se resolvem só com isso.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000018','Hidropsia','<p>A <b>hidropsia</b> é o inchaço do corpo com as <b>escamas eriçadas</b> (aspecto de "pinha"). Costuma ser o estágio final de uma infecção interna grave.</p>
<p>O prognóstico é reservado. Isolar o peixe, otimizar a água e tratar cedo dá a melhor (ainda que pequena) chance.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🍍</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Hidropsia</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Corpo inchado, escamas eriçadas</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Infecção interna grave</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Prognóstico reservado</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Escamas em "pinha" indicam quadro avançado. Isole o peixe rapidamente para proteger os demais.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000018','Popeye (exoftalmia)','<p>O <b>popeye</b> é o olho saltado, projetado para fora. Pode ser por lesão (um olho) ou infecção/água ruim (frequentemente os dois olhos).</p>
<p>A conduta base é melhorar a água; casos infecciosos podem exigir antibiótico.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">👁️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Popeye</text>
<circle cx="160" cy="72" r="6" fill="#EAB308"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Olho saltado</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Lesão ou infecção</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Água limpa é a base</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Popeye num olho só sugere trauma; nos dois, pense em água/infecção. Comece sempre melhorando a água.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000018','Parasitas','<p>Além do íctio e do oodinium, há <b>vermes e outros parasitas</b> externos e internos. Sinais incluem emagrecimento com apetite, fezes esbranquiçadas e coceira.</p>
<p>A quarentena de novos peixes é a melhor defesa: evita introduzir parasitas no aquário principal.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🪱</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Parasitas</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Externos e internos</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Emagrecimento, coceira</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Quarentena previne</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Quarentenar todo peixe novo por algumas semanas é o hábito que mais evita surtos de doença.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2180000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000018','Doenças bacterianas','<p>As <b>infecções bacterianas</b> causam úlceras, manchas avermelhadas, apatia e podem ser internas. Quase sempre surgem quando a <b>imunidade cai</b> por estresse ou água ruim.</p>
<p>Prevenção vale mais que cura: água estável, boa alimentação e baixo estresse mantêm o sistema imune forte.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🦠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Bacterianas</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Úlceras, manchas vermelhas</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Surgem com imunidade baixa</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Prevenir > medicar</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Antibiótico sem necessidade prejudica o filtro biológico. Corrija a causa antes de partir para medicação forte.</div>',8);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3180000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000018','Pontos brancos "de sal" pelo corpo indicam:','["Fungos","Íctio","Popeye","Hidropsia"]',1,'Íctio, parasita muito contagioso.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3180000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000018','A podridão de nadadeiras está quase sempre ligada a:','["Excesso de luz","Água de má qualidade ou frio","Muita ração viva","Idade"]',1,'É bacteriana, ligada a água ruim/fria.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3180000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000018','A melhor defesa contra introduzir parasitas é:','["Medicar sempre","Quarentenar peixes novos","Trocar 100% da água","Baixar a temperatura"]',1,'Quarentena de novos peixes evita surtos.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000019','Módulo 19, Diagnóstico Inteligente','Transformando números em decisões. O coração do Aqualife Care.','Como ler um laudo de água: cada parâmetro fora da faixa vira uma ação prática e priorizada.','avancado','Trilha 4 · Saúde Animal',40,19,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000019','Como interpretar um laudo','<p>Um laudo não é uma lista de números: é um <b>diagnóstico</b>. Cada parâmetro fora da faixa recebe uma gravidade (ideal, atenção, crítico) e uma <b>ação recomendada</b>.</p>
<p>É exatamente assim que o <b>Aqualife Care</b> funciona: o motor avalia os parâmetros por regras validadas e devolve uma Nota de Saúde de 0 a 100, com o que fazer.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EF4444"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Exemplo de leitura</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">pH 6,4 · KH 1 dKH</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EF4444"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Crítico</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Repor KH e estabilizar o pH</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Números são meios, não fins. O laudo bom responde a pergunta que importa: "o que eu faço agora?".</div>
<a class="aquabook" href="https://app.aqualifeaquarismo.com/entrar.html">🩺 Ver a Nota de Saúde no painel do Care</a>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000019','pH baixo','<p>Um <b>pH baixo</b> isolado nem sempre é o problema; o perigo é a <b>instabilidade</b>. pH que despenca costuma vir de KH esgotado e de acúmulo de ácidos.</p>
<p>A decisão certa raramente é "jogar produto para subir o pH", e sim <b>repor o KH</b> e fazer trocas parciais.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EF4444"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">pH</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">5,8</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EF4444"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Crítico</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Repor KH, troca parcial, evitar químicos bruscos</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> pH baixo? Olhe o KH primeiro. Corrigir a alcalinidade resolve a maioria dos casos de pH instável.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000019','KH baixo','<p>O <b>KH baixo</b> é a causa oculta de metade dos problemas de pH. Sem carbonatos, a água perde a capacidade de amortecer e o pH oscila ou cai.</p>
<p>A ação é <b>repor a alcalinidade</b> de forma gradual, até uma faixa estável (em água doce, 3 a 8 dKH).</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EAB308"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">KH</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">1 dKH</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EAB308"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Alerta</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Repor alcalinidade gradualmente</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> KH é prioridade de diagnóstico: ele sustenta o pH. Corrigi-lo antes evita o efeito dominó.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000019','Nitrito alto','<p><b>Nitrito acima de zero</b> é sempre grave: indica ciclo incompleto ou filtro sobrecarregado, e sufoca o peixe por dentro.</p>
<p>Decisão imediata: <b>troca parcial de água</b>, reduzir alimentação e não adicionar peixes até zerar.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EF4444"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nitrito</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">0,8 ppm</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EF4444"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Crítico</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Troca parcial já, reduzir ração, não povoar</tspan></text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Nitrito nunca é "aceitável". Qualquer leitura acima de zero pede ação no mesmo dia.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000019','GH inadequado','<p>Um <b>GH fora da faixa</b> da espécie afeta osmorregulação, saúde e reprodução. Não existe "GH ideal universal": depende de quem mora no aquário.</p>
<p>A decisão é <b>aproximar o GH das necessidades da espécie</b>, ajustando a água de reposição, sem mudanças bruscas.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EAB308"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">GH</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">2 dGH</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EAB308"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Atenção</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Ajustar a dureza à espécie, sem choque</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> GH se interpreta junto com os habitantes. O mesmo valor pode ser perfeito para tetras e ruim para vivíparos.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000019','Temperatura','<p>A <b>temperatura</b> entra no diagnóstico porque altera tudo: oxigênio, toxicidade da amônia e metabolismo. Um valor alto num laudo muda o peso dos outros.</p>
<p>Decisão: trazer a temperatura à faixa da espécie e, no calor, <b>reforçar a oxigenação</b> enquanto ajusta.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#EAB308"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Temperatura</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">30 °C</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EAB308"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Atenção</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Resfriar aos poucos, reforçar oxigênio</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Temperatura não é só conforto: ela reprograma a gravidade dos outros parâmetros no laudo.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2190000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000019','Condutividade','<p>A <b>condutividade</b> mostra o acúmulo geral de sais e resíduos. Sozinha diz pouco; como <b>tendência</b>, revela quando a manutenção está atrasada.</p>
<p>Se está subindo entre as trocas, a decisão é aumentar a frequência ou o volume das trocas parciais.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/>
<rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/>
<rect x="20" y="20" width="9" height="110" rx="4" fill="#0E7490"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Condutividade</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">900 µS/cm</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#0E7490"/>
<text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Acompanhar</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/>
<text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Trocas mais frequentes se a tendência sobe</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Condutividade é um parâmetro de tendência: o valor de hoje importa menos que a direção da curva.</div>',7);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3190000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000019','Um bom laudo, acima de tudo, responde:','["Quantos peixes cabem","O que fazer agora","A marca do filtro","A cor da água"]',1,'Transforma números em uma decisão prática.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3190000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000019','Diante de pH baixo e instável, a primeira suspeita é:','["GH alto","KH esgotado","Muita luz","Nitrato zero"]',1,'Sem KH, o pH perde amortecimento.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3190000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000019','Nitrito acima de zero exige:','["Esperar","Ação no mesmo dia","Mais ração","Aumentar a temperatura"]',1,'É sempre grave; troca parcial imediata.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000020','Módulo 20, Ações Corretivas','Do diagnóstico à prática: como corrigir cada problema com segurança.','Baixar nitrato, subir KH, estabilizar pH, fazer uma TPA correta, medicar e, principalmente, quando não medicar.','intermediario','Trilha 4 · Saúde Animal',40,20,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000020','Como baixar o nitrato','<p>O <b>nitrato alto</b> se combate por vários caminhos somados: trocas parciais regulares, plantas, controle da alimentação e, no marinho, boa filtragem e refúgio.</p>
<p>A base do controle continua sendo a <b>troca parcial de água</b>, feita com constância.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="110" y1="46" x2="530" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="110" cy="46" r="20" fill="#0E7490"/><text x="110" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="110" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Trocas parciais</text><circle cx="250" cy="46" r="20" fill="#0E7490"/><text x="250" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="250" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Plantas</text><circle cx="390" cy="46" r="20" fill="#0E7490"/><text x="390" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="390" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Menos ração</text><circle cx="530" cy="46" r="20" fill="#0E7490"/><text x="530" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="530" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Sifonar o fundo</text></svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Nitrato não some com um truque: é a soma de trocas regulares, plantas e alimentação sob controle.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000020','Como aumentar o KH','<p>Para <b>subir o KH</b>, usa-se bicarbonato de sódio (em água doce, com cautela), buffers de alcalinidade prontos, ou elementos calcários no sistema.</p>
<p>O segredo é fazer isso <b>aos poucos</b>: elevar o KH de forma brusca também sacode o pH.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="110" y1="46" x2="530" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="110" cy="46" r="20" fill="#0E7490"/><text x="110" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="110" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Medir o KH</text><circle cx="250" cy="46" r="20" fill="#0E7490"/><text x="250" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="250" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Dosar aos poucos</text><circle cx="390" cy="46" r="20" fill="#0E7490"/><text x="390" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="390" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Remedir</text><circle cx="530" cy="46" r="20" fill="#0E7490"/><text x="530" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="530" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Estabilizar</text></svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca corrija o KH de uma vez. Subidas bruscas de alcalinidade desestabilizam o pH e estressam os peixes.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000020','Como estabilizar o pH','<p>Estabilizar o pH quase nunca é "usar produto de pH". A estabilidade real vem de um <b>KH adequado</b> e de rotina de trocas, não de correções químicas diárias.</p>
<p>Escolher habitantes compatíveis com a sua água de torneira é a estratégia mais duradoura.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⚖️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Estabilizar o pH</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Garanta um bom KH</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Rotina de trocas</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Evite químicos de pH</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> pH estável se constrói com KH e rotina, não com frascos de "pH up/down", que criam um sobe-e-desce perigoso.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000020','Como fazer uma TPA corretamente','<p>A <b>troca parcial de água (TPA)</b> é a manutenção mais importante. Feita certo, repõe minerais e remove resíduos sem estressar os peixes.</p>
<p>Troque de <b>20 a 30% por semana</b>, com água tratada (sem cloro) e na <b>mesma temperatura</b> do aquário.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="96" y1="46" x2="544" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="96" cy="46" r="20" fill="#0E7490"/><text x="96" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="96" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Desligar bombas</text><circle cx="208" cy="46" r="20" fill="#0E7490"/><text x="208" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="208" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Sifonar o fundo</text><circle cx="320" cy="46" r="20" fill="#0E7490"/><text x="320" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="320" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Água tratada</text><circle cx="432" cy="46" r="20" fill="#0E7490"/><text x="432" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="432" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Mesma temperatura</text><circle cx="544" cy="46" r="20" fill="#0E7490"/><text x="544" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">5</text><text x="544" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Religar</text></svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> A água nova deve entrar tratada e na temperatura do aquário. Choque térmico numa TPA faz mais mal que bem.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000020','Como medicar','<p>Medicar exige método: <b>identificar</b> a doença, isolar o peixe num <b>aquário hospital</b> quando possível, remover o carvão ativado (ele absorve o remédio) e seguir a <b>dose e o tempo</b> corretos.</p>
<p>Reforce a oxigenação durante o tratamento, pois muitos medicamentos reduzem o oxigênio disponível.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="96" y1="46" x2="544" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="96" cy="46" r="20" fill="#0E7490"/><text x="96" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="96" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Identificar</text><circle cx="208" cy="46" r="20" fill="#0E7490"/><text x="208" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="208" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Isolar</text><circle cx="320" cy="46" r="20" fill="#0E7490"/><text x="320" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="320" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Remover carvão</text><circle cx="432" cy="46" r="20" fill="#0E7490"/><text x="432" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="432" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Dosar certo</text><circle cx="544" cy="46" r="20" fill="#0E7490"/><text x="544" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">5</text><text x="544" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#334155">Oxigenar</text></svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca "chute" o remédio. Diagnóstico errado e subdose criam resistência e pioram o quadro.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2200000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000020','Quando NÃO medicar','<p>Boa parte dos "problemas de doença" é, na verdade, <b>problema de água</b>. Medicar às cegas um peixe que sofre de amônia ou frio só piora tudo e ainda mata o filtro biológico.</p>
<p>A regra: <b>primeiro corrija a água</b> e o ambiente. Muitos sintomas somem sozinhos quando a causa raiz é resolvida.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#EF4444"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🚫</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Quando NÃO medicar</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Antes, corrija a água</text><circle cx="160" cy="112" r="6" fill="#EF4444"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Não medique às cegas</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Remédio agride o filtro</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Na dúvida, água antes de remédio. A maioria dos sintomas melhora quando o ambiente volta ao normal.</div>
<a class="aquabook" href="https://app.aqualifeaquarismo.com/entrar.html">🩺 Acompanhar a evolução no painel do Care</a>',6);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3200000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000020','A base do controle de nitrato é:','["Um produto milagroso","Trocas parciais regulares","Parar de alimentar","Aumentar a luz"]',1,'Trocas constantes, somadas a plantas e menos ração.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3200000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000020','A água nova de uma TPA deve entrar:','["Gelada","Tratada e na mesma temperatura","Direto da torneira","Bem quente"]',1,'Sem cloro e sem choque térmico.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3200000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000020','Diante de sintomas com água ruim, o certo é:','["Medicar às cegas","Primeiro corrigir a água","Trocar o peixe","Nada fazer"]',1,'Muitos sintomas somem ao resolver a causa raiz.',3);

-- FIM Trilha 4
