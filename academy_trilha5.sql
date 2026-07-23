-- ============================================================
-- AQUALIFE ACADEMY, CONTEÚDO · TRILHA 5 (Lagos Ornamentais)
-- Idempotente. Rode DEPOIS da migration_fase6.sql.
-- ============================================================

DELETE FROM curso_progresso WHERE curso_id IN ('a1000000-0000-4000-8000-000000000021','a1000000-0000-4000-8000-000000000022','a1000000-0000-4000-8000-000000000023','a1000000-0000-4000-8000-000000000024','a1000000-0000-4000-8000-000000000025');
DELETE FROM quiz_resultado  WHERE curso_id IN ('a1000000-0000-4000-8000-000000000021','a1000000-0000-4000-8000-000000000022','a1000000-0000-4000-8000-000000000023','a1000000-0000-4000-8000-000000000024','a1000000-0000-4000-8000-000000000025');
DELETE FROM curso           WHERE id       IN ('a1000000-0000-4000-8000-000000000021','a1000000-0000-4000-8000-000000000022','a1000000-0000-4000-8000-000000000023','a1000000-0000-4000-8000-000000000024','a1000000-0000-4000-8000-000000000025');

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000021','Módulo 21, Construção de Lagos','Do projeto ao dreno de fundo: a engenharia de um lago que funciona.','Projeto, escavação, impermeabilização, hidráulica e as peças-chave (bottom drain e skimmer) de um lago bem-feito.','avancado','Trilha 5 · Lagos Ornamentais',55,21,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000021','Projeto','<p>Um bom lago começa no papel. O <b>projeto</b> define localização, profundidade, volume, insolação e por onde a água vai circular, tudo antes da primeira pá de terra.</p>
<p>Erros de projeto (raso demais, sem sombra, sem acesso à filtragem) são caros para corrigir depois. Planejar é mais barato que refazer.</p>
<figure><svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="280" rx="14" fill="#F6F9FB"/>
<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4bacc9"/><stop offset="1" stop-color="#0E7490"/></linearGradient></defs>
<path d="M0,110 L130,110 L210,215 L430,215 L510,110 L640,110 L640,280 L0,280 Z" fill="#E7D9BC"/>
<path d="M130,116 L210,212 L430,212 L510,116 Z" fill="url(#ag)"/>
<path d="M130,116 L210,212 L430,212 L510,116" fill="none" stroke="#0B2A3A" stroke-width="3"/>
<line x1="130" y1="116" x2="510" y2="116" stroke="#bff0ff" stroke-width="2"/>
<rect x="296" y="205" width="48" height="14" rx="3" fill="#0B2A3A"/>
<rect x="470" y="104" width="42" height="26" rx="4" fill="#0E7490"/>
<path d="M170,150 l40,0" stroke="#fff" stroke-width="4" marker-end="url(#arw)"/>
<defs><marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#fff"/></marker></defs>
<text x="320" y="245" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#0B2A3A">Bottom drain (dreno de fundo)</text>
<text x="560" y="100" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#0E7490">Skimmer</text>
<text x="150" y="140" font-family="Inter,sans-serif" font-size="12" fill="#fff">Retorno</text>
<text x="60" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Anatomia de um lago bem projetado</text>
</svg><figcaption>O dreno de fundo puxa a sujeira pesada; o skimmer limpa a superfície; o retorno movimenta e oxigena.</figcaption></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Um lago bem projetado já "nasce" com dreno de fundo, skimmer e retorno pensados para a água se limpar sozinha.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000021','Escavação','<p>A <b>escavação</b> cria as zonas de profundidade: bordas rasas (segurança e plantas), platôs e uma parte funda central, para onde a sujeira converge e as carpas se abrigam no frio.</p>
<p>Para carpas, profundidade importa: uma zona funda estabiliza a temperatura e dá espaço aos peixes crescerem.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">⛏️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Escavação</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Bordas rasas para plantas</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Zona funda central</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Profundidade estabiliza a temperatura</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> A parte funda não é luxo: ela protege as carpas do frio e concentra os detritos perto do dreno de fundo.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000021','Impermeabilização','<p>A <b>impermeabilização</b> impede a água de vazar para o solo. As opções mais comuns são <b>manta (EPDM/PVC)</b> e <b>concreto</b>, cada uma com prós e contras de custo e durabilidade.</p>
<p>A manta EPDM é flexível e durável; o concreto é rígido e permite formas definidas, mas exige boa impermeabilização e cura.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧱</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Impermeabilização</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Manta EPDM: flexível e durável</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Concreto: rígido, formas livres</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Evite vazamentos e raízes</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Concreto novo libera alcalinidade (cal) que sobe muito o pH. Sempre cure e neutralize antes de introduzir peixes.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000021','Hidráulica','<p>A <b>hidráulica</b> é o sistema circulatório do lago: bombas, tubulações e desníveis que levam a água do lago à filtragem e de volta.</p>
<p>Tubos generosos e curvas suaves reduzem a perda de carga e economizam energia. A bomba deve mover o volume adequado sem forçar.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🔧</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Hidráulica</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Bombas e tubulações</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Curvas suaves, menos perda</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Dimensione para o volume</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Tubulação subdimensionada "estrangula" a bomba e gasta energia à toa. Prefira diâmetros maiores e curvas amplas.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000021','Retornos','<p>Os <b>retornos</b> devolvem a água filtrada ao lago. Bem posicionados, eles criam uma <b>corrente circular</b> que empurra a sujeira em direção ao dreno de fundo.</p>
<p>Também são responsáveis por parte da oxigenação, ao movimentar a superfície.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🔁</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Retornos</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Devolvem a água filtrada</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Criam corrente ao dreno</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ajudam na oxigenação</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> O segredo é a direção: retornos apontados para criar um giro levam os detritos direto ao dreno de fundo.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000021','Bottom Drain (dreno de fundo)','<p>O <b>dreno de fundo</b> é a peça que separa um lago amador de um profissional. Instalado no ponto mais fundo, ele puxa por gravidade a <b>sujeira pesada</b> direto para a filtragem.</p>
<p>Sem ele, os detritos apodrecem no fundo e degradam a água. Com ele, o lago praticamente se autolimpa.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🕳️</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Bottom Drain</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">No ponto mais fundo</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Puxa a sujeira por gravidade</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">O lago quase se autolimpa</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Bottom drain é quase impossível de instalar depois. Deixe-o previsto no projeto, antes da escavação.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2210000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000021','Skimmer','<p>O <b>skimmer</b> do lago suga a <b>película da superfície</b>: folhas, pólen, poeira e óleos, antes que afundem e apodreçam.</p>
<p>Combinado ao dreno de fundo (que cuida do fundo), ele mantém a coluna d''água limpa de cima a baixo.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🍃</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Skimmer</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Limpa a superfície</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Remove folhas e pólen</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Dupla com o dreno de fundo</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Superfície pelo skimmer, fundo pelo bottom drain: juntos, cobrem toda a sujeira do lago.</div>',7);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3210000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000021','A peça que separa um lago amador de um profissional é:','["A fonte","O dreno de fundo","A luz","A cascata"]',1,'O bottom drain puxa a sujeira pesada por gravidade.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3210000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000021','O concreto novo num lago exige cuidado porque:','["Esquenta a água","Libera cal e sobe o pH","Atrai algas","É frágil"]',1,'Precisa curar e neutralizar a alcalinidade antes dos peixes.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3210000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000021','O skimmer do lago cuida:','["Do fundo","Da superfície","Da temperatura","Das plantas"]',1,'Remove a película da superfície antes que afunde.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000022','Módulo 22, Filtragem para Lagos','Como filtrar milhares de litros e a alta carga das carpas.','Pré-filtro, tambor, câmara biológica, mídias, UV, vazão e oxigenação: a linha de filtragem de um lago.','avancado','Trilha 5 · Lagos Ornamentais',50,22,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000022','Pré-filtro (mecânico)','<p>A filtragem do lago é uma <b>linha em etapas</b>. A primeira é o <b>pré-filtro mecânico</b>: ele remove os sólidos grandes logo na entrada, antes que apodreçam.</p>
<p>Remover o sólido cedo é metade da batalha: alivia toda a filtragem seguinte e mantém a água clara.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="96" y1="46" x2="544" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="96" cy="46" r="20" fill="#0E7490"/><text x="96" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="96" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Lago</text><circle cx="208" cy="46" r="20" fill="#0E7490"/><text x="208" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="208" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Pré-filtro</text><circle cx="320" cy="46" r="20" fill="#0E7490"/><text x="320" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="320" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Câmara bio</text><circle cx="432" cy="46" r="20" fill="#0E7490"/><text x="432" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="432" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">UV</text><circle cx="544" cy="46" r="20" fill="#0E7490"/><text x="544" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">5</text><text x="544" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Retorno</text></svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Regra de ouro do lago: tire o sólido o quanto antes. Um bom pré-filtro poupa a biológica e clareia a água.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000022','Filtro de tambor (drum)','<p>O <b>filtro de tambor</b> é a versão automatizada da filtragem mecânica: uma tela rotativa retém os sólidos e se <b>autolava</b> por jatos, descartando a sujeira.</p>
<p>É o padrão dos lagos de carpas de alto nível: eficiente, contínuo e com pouca manutenção manual.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🥁</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Filtro de tambor</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Tela rotativa retém sólidos</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Autolavagem automática</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Padrão de lagos de nível</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> O drum filter entrega água cristalina com mínimo esforço, ideal para koi de qualidade.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000022','Câmara biológica','<p>Depois do mecânico vem a <b>câmara biológica</b>: onde as bactérias convertem a amônia das carpas em nitrato, como em qualquer aquário, só que em escala gigante.</p>
<p>Ela precisa de muito <b>volume de mídia</b> e boa oxigenação para dar conta da carga de peixes grandes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🦠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Câmara biológica</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Converte a amônia das carpas</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muito volume de mídia</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Precisa de oxigênio</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Carpas adultas produzem muita amônia. Uma câmara biológica subdimensionada é gargalo garantido.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000022','Mídias','<p>As <b>mídias</b> biológicas do lago (bioballs, K1/leito móvel, esteiras) oferecem superfície para as bactérias. O leito móvel (K1) é popular por se autolimpar com o movimento.</p>
<p>A escolha equilibra área de colonização, facilidade de limpeza e custo por litro.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧩</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Mídias</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Superfície para bactérias</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">K1 (leito móvel) se autolimpa</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Área x limpeza x custo</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> No leito móvel, o próprio atrito entre as mídias descama o excesso de biofilme, mantendo a colônia ativa.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000022','UV (clarificador)','<p>O <b>UV</b> combate a <b>água verde</b> (algas unicelulares em suspensão), passando a água por luz ultravioleta que faz as algas se aglutinarem e serem retidas pela filtragem.</p>
<p>É quase indispensável em lagos ao sol. Precisa de vazão correta e lâmpada trocada periodicamente.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💡</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">UV clarificador</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Elimina a água verde</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Vazão correta é essencial</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Troque a lâmpada no prazo</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> UV com vazão alta demais não dá tempo de agir. E a lâmpada perde potência antes de "queimar": troque no prazo.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000022','Vazão','<p>A <b>vazão</b> define quantas vezes a água passa pela filtragem por hora. Em lagos de carpas, busca-se circular <b>todo o volume a cada 1 a 2 horas</b>.</p>
<p>Vazão insuficiente deixa detritos assentarem; excessiva pode revolver o fundo e sobrecarregar o sistema.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌊</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Vazão</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Todo o volume a cada 1 a 2h</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Baixa: detritos assentam</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Muito alta: revolve o fundo</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Dimensione a bomba pela vazão-alvo e pela perda de carga real da tubulação, não só pelo número da caixa.</div>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2220000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000022','Oxigenação','<p>A <b>oxigenação</b> é vital no lago: carpas grandes, calor e a própria filtragem biológica consomem muito O₂, sobretudo à noite.</p>
<p>Aeradores, cascatas e boa movimentação de superfície garantem oxigênio para peixes e bactérias.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">💨</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Oxigenação</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Carpas e bactérias consomem O₂</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Aeradores e cascatas</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Reforce à noite e no calor</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> A madrugada quente é o momento crítico de oxigênio no lago. Mantenha aeração contínua nesses períodos.</div>',7);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3220000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000022','A primeira etapa da filtragem de um lago deve ser:','["A UV","O pré-filtro mecânico","A câmara biológica","O aquecedor"]',1,'Remover o sólido cedo alivia todo o resto.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3220000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000022','O filtro de tambor se destaca por:','["Aquecer a água","Autolavar e reter sólidos","Adicionar bactérias","Baixar o pH"]',1,'Tela rotativa com autolavagem automática.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3220000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000022','A UV do lago serve principalmente para:','["Matar carpas","Combater a água verde","Aumentar o pH","Aquecer"]',1,'Aglutina as algas unicelulares em suspensão.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000023','Módulo 23, Carpas Nishikigoi','A "joia viva" dos lagos japoneses: história, variedades e cuidados.','Origem, genética, variedades, critérios de julgamento, alimentação e crescimento das carpas koi.','intermediario','Trilha 5 · Lagos Ornamentais',45,23,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000023','História','<p>As <b>carpas nishikigoi</b> nasceram no Japão, a partir de carpas comuns criadas para alimento. Criadores notaram mutações de cor e passaram a selecioná-las, criando as koi ornamentais.</p>
<p>Hoje são símbolo de status e paciência, com exemplares de linhagem valendo pequenas fortunas.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🎌</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">História</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Origem no Japão</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Seleção de mutações de cor</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Símbolo de status e paciência</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> "Nishikigoi" significa carpa brocada. Cada koi é resultado de gerações de seleção cuidadosa.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000023','Genética','<p>A cor e o padrão das koi são <b>altamente genéticos</b>, mas imprevisíveis: de uma desova de milhares, poucos filhotes atingem qualidade de exposição.</p>
<p>Criadores selecionam agressivamente ao longo do crescimento, mantendo apenas os melhores padrões.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧬</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Genética</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Padrão é genético</text><circle cx="160" cy="112" r="6" fill="#EAB308"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Poucos atingem alta qualidade</text><circle cx="160" cy="152" r="6" fill="#22C55E"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Seleção rigorosa dos filhotes</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Comprar koi de bons pais aumenta a chance de qualidade, mas nunca garante: a genética koi é uma loteria refinada.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000023','Variedades','<p>Existem dezenas de <b>variedades</b>, definidas por cor e padrão. As mais clássicas são <b>Kohaku</b> (branco e vermelho), <b>Sanke</b> e <b>Showa</b> (que acrescentam preto).</p>
<p>Cada variedade tem regras de padrão que definem sua qualidade, do equilíbrio das manchas à nitidez das bordas.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🎨</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Variedades</text>
<circle cx="160" cy="72" r="6" fill="#EF4444"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Kohaku: branco e vermelho</text><circle cx="160" cy="112" r="6" fill="#0B2A3A"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sanke e Showa: com preto</text><circle cx="160" cy="152" r="6" fill="#0E7490"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Padrão define a qualidade</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Kohaku é o coração do hobby koi: "começa e termina no Kohaku", diz o ditado japonês.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000023','Julgamento','<p>Em exposições, as koi são <b>julgadas</b> por conformação corporal, qualidade da pele, brilho, e pela nitidez e equilíbrio do padrão de cores.</p>
<p>O <b>porte e a forma</b> pesam tanto quanto as cores: uma koi grande e bem conformada impressiona os juízes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🏆</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Julgamento</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Conformação e porte</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Qualidade da pele e brilho</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nitidez e equilíbrio do padrão</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Não é só a cor: corpo, pele e presença contam muito. Uma koi campeã é um conjunto harmônico.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000023','Alimentação','<p>A alimentação da koi acompanha a <b>temperatura da água</b>: no calor, o metabolismo acelera e elas comem bem; no frio, a digestão desacelera e a comida deve reduzir ou parar.</p>
<p>Rações de qualidade, ricas em proteína no verão e mais leves no outono, sustentam saúde e cor.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🍥</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Alimentação</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Regule pela temperatura</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Verão: mais proteína</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Frio: reduza ou pare</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Alimentar koi na água fria é perigoso: a comida não digere, apodrece no intestino e pode matar o peixe.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2230000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000023','Crescimento','<p>O <b>crescimento</b> das koi depende de genética, <b>volume de água</b>, qualidade da água e alimentação. Espaço e água limpa são tão importantes quanto a ração.</p>
<p>Koi pode ultrapassar 70 cm e viver décadas. Um lago apertado limita o porte e estressa os peixes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">📏</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Crescimento</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Depende de água e espaço</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Pode passar de 70 cm</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Lago apertado limita o porte</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Quer koi grande e saudável? Dê volume de água e qualidade. A ração sozinha não faz milagre.</div>',6);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3230000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000023','As carpas nishikigoi se originaram:','["Na China, como ornamentais","No Japão, de carpas de alimento","No Brasil","Na Europa"]',1,'Surgiram no Japão a partir de carpas comuns.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3230000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000023','A variedade "coração" do hobby koi é:','["Showa","Kohaku","Sanke","Ogon"]',1,'Kohaku (branco e vermelho) é a referência clássica.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3230000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000023','Alimentar koi na água fria é perigoso porque:','["Elas engordam","A comida não digere e apodrece","Ficam agressivas","Perdem a cor"]',1,'A digestão desacelera; a comida apodrece no intestino.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000024','Módulo 24, Nature Pools','A piscina natural, sem cloro, purificada por plantas e biologia.','O conceito de piscina natural, suas diferenças para a piscina tradicional e como a filtragem biológica mantém a água limpa.','avancado','Trilha 5 · Lagos Ornamentais',40,24,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000024','Conceito','<p>Uma <b>nature pool</b> (piscina natural) é um corpo d''água para banho <b>sem cloro nem produtos químicos</b>: a água é mantida limpa por processos biológicos, como num ecossistema saudável.</p>
<p>Une o prazer de nadar à estética de um lago vivo, com plantas e água cristalina.</p>
<figure><svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="190" rx="14" fill="#F6F9FB"/>
<rect x="30" y="60" width="330" height="100" rx="10" fill="#4bacc9"/>
<text x="195" y="115" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">Zona de banho</text>
<text x="195" y="140" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" fill="#eaffff">água limpa, sem cloro</text>
<rect x="370" y="60" width="240" height="100" rx="10" fill="#22C55E"/>
<text x="490" y="108" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="16" fill="#fff">Zona de regeneração</text>
<text x="490" y="132" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#eaffea">plantas + filtragem biológica</text>
<text x="60" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#0B2A3A">Nature pool: duas zonas</text>
</svg><figcaption>A zona de regeneração purifica a água biologicamente e a devolve limpa à zona de banho.</figcaption></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Na nature pool, quem "trata" a água não é o cloro, é a biologia: bactérias e plantas fazem o trabalho.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000024','Diferenças para piscinas','<p>Diferente da piscina de cloro, a nature pool <b>não agride a pele e os olhos</b> e não depende de dosagem química diária. Em troca, exige espaço para a zona de regeneração e um período de maturação.</p>
<p>É um sistema vivo: ganha em conforto e sustentabilidade, mas pede compreensão do equilíbrio biológico.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🆚</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Nature pool x piscina</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Sem cloro, não irrita</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Não precisa de química diária</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Exige espaço e maturação</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> A nature pool troca o balde de produtos químicos por um ecossistema. Mais conforto, menos química, outra lógica.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000024','Filtragem biológica','<p>O coração da nature pool é a <b>filtragem biológica</b>: as bactérias processam os nutrientes (nitrogênio, fósforo) que, de outra forma, alimentariam algas na água de banho.</p>
<p>É o mesmo ciclo do nitrogênio do aquário, aplicado em escala de piscina.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🦠</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Filtragem biológica</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Processa nutrientes</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Rouba o "alimento" das algas</text><circle cx="160" cy="152" r="6" fill="#0B2A3A"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">O ciclo do nitrogênio em escala</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Água de banho cristalina não vem de esterilizar, e sim de equilibrar: pouca oferta de nutrientes, poucas algas.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000024','Zona de regeneração','<p>A <b>zona de regeneração</b> é a área separada (rasa e plantada) por onde a água circula para ser purificada, antes de voltar à zona de banho.</p>
<p>Costuma ocupar uma parcela significativa da área total: é ela que sustenta todo o equilíbrio.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🌿</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Zona de regeneração</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Área rasa e plantada</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Purifica antes de retornar</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Ocupa parte relevante do total</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Reduzir demais a zona de regeneração para "ganhar" área de banho quebra o equilíbrio e traz algas.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000024','Plantas filtrantes','<p>As <b>plantas filtrantes</b> (aquáticas e palustres) absorvem nutrientes pelas raízes e competem diretamente com as algas, além de oxigenar e embelezar.</p>
<p>A diversidade de plantas torna o sistema mais estável e resiliente ao longo das estações.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🪷</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Plantas filtrantes</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Absorvem nutrientes</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Competem com as algas</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Diversidade traz estabilidade</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Plantas são filtros vivos: quanto mais nutrientes elas consomem, menos sobra para as algas.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2240000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000024','Manutenção','<p>A manutenção da nature pool é <b>diferente, não inexistente</b>: retirar folhas, podar plantas, limpar o skimmer e acompanhar os nutrientes mantêm a água no ponto.</p>
<p>É menos química e mais jardinagem: cuidar do ecossistema em vez de "clorar" a água.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧰</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Manutenção</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Podar e retirar folhas</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Limpar skimmer e filtros</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Acompanhar nutrientes</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Nature pool não é "zero manutenção": é uma manutenção mais verde, de jardineiro, no lugar da de químico.</div>',6);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3240000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000024','O que mantém a água de uma nature pool limpa?','["Cloro","Processos biológicos (bactérias e plantas)","Sal","Ozônio apenas"]',1,'A biologia substitui os químicos.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3240000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000024','A zona de regeneração serve para:','["Nadar","Purificar a água antes de retornar","Aquecer","Decoração apenas"]',1,'É a área plantada que trata a água.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3240000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000024','A manutenção da nature pool é:','["Inexistente","Mais \"jardinagem\" que química","Igual à piscina de cloro","Impossível"]',1,'Menos química, mais cuidado com o ecossistema.',3);

INSERT INTO curso (id,titulo,resumo,descricao,nivel,categoria,duracao_min,ordem,publicado) VALUES ('a1000000-0000-4000-8000-000000000025','Módulo 25, Manutenção Profissional','Do hobby ao serviço: como manter sistemas com método e entregar laudos.','Cronograma, checklists, limpeza correta, relatório técnico e atendimento: a manutenção profissional da Aqualife.','avancado','Trilha 5 · Lagos Ornamentais',50,25,true);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000025','Cronograma de manutenção','<p>A manutenção profissional se apoia num <b>cronograma</b>: tarefas diárias, semanais e mensais, cada uma com sua frequência e responsável.</p>
<p>O cronograma transforma "cuidar quando lembra" em um processo previsível, que previne problemas em vez de apagar incêndios.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">📅</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Cronograma</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Diário, semanal, mensal</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Previsível e documentado</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Previne, não remedia</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Manutenção profissional é rotina, não reação. O cronograma é o que garante consistência entre visitas.</div>',1);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000025','Checklists técnicos','<p>Os <b>checklists</b> padronizam cada visita: verificar equipamentos, testar parâmetros, limpar o que precisa e registrar tudo. Nada fica ao acaso ou à memória.</p>
<p>Além de qualidade, o checklist gera <b>rastreabilidade</b>: fica registrado o que foi feito e como estava o sistema.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="110" y1="46" x2="530" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="110" cy="46" r="20" fill="#0E7490"/><text x="110" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="110" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Equipamentos</text><circle cx="250" cy="46" r="20" fill="#0E7490"/><text x="250" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="250" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Parâmetros</text><circle cx="390" cy="46" r="20" fill="#0E7490"/><text x="390" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="390" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Limpeza</text><circle cx="530" cy="46" r="20" fill="#0E7490"/><text x="530" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="530" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Registro</text></svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Checklist é o que separa o técnico do amador: garante que nada importante seja esquecido em nenhuma visita.</div>',2);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000025','Limpeza de filtros','<p>A <b>limpeza de filtros</b> exige cuidado: a mídia mecânica pode ser bem lavada, mas a <b>biológica</b> deve ser apenas enxaguada, e sempre na água do próprio sistema.</p>
<p>Limpar tudo de uma vez, ou usar água clorada, mata a colônia e reinicia o ciclo. O profissional limpa por partes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧽</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Limpeza de filtros</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Mecânica: lave bem</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Biológica: só enxágue</text><circle cx="160" cy="152" r="6" fill="#EF4444"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Nunca com água clorada</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Nunca lave toda a mídia biológica de uma vez nem na torneira: você reiniciaria a ciclagem do sistema.</div>',3);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000025','Trocas parciais de água','<p>As <b>trocas parciais</b> são o pilar da manutenção. O profissional troca um percentual adequado, com água tratada e na temperatura certa, sifonando o fundo no processo.</p>
<p>A frequência e o volume dependem da carga do sistema e dos parâmetros medidos, não de um número fixo.</p>
<figure><svg viewBox="0 0 640 115" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="640" height="115" rx="14" fill="#F6F9FB"/><line x1="110" y1="46" x2="530" y2="46" stroke="#CBD5E1" stroke-width="3"/><circle cx="110" cy="46" r="20" fill="#0E7490"/><text x="110" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">1</text><text x="110" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Testar</text><circle cx="250" cy="46" r="20" fill="#0E7490"/><text x="250" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">2</text><text x="250" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Sifonar</text><circle cx="390" cy="46" r="20" fill="#0E7490"/><text x="390" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">3</text><text x="390" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Repor tratada</text><circle cx="530" cy="46" r="20" fill="#0E7490"/><text x="530" y="53" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="#fff">4</text><text x="530" y="92" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#334155">Conferir</text></svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> O volume da troca deve responder aos parâmetros: quem manda na TPA é o teste, não o calendário cego.</div>',4);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000025','Equipamentos','<p>O profissional carrega um <b>kit</b>: testes confiáveis, sifão/bomba, baldes dedicados, condicionador, termômetro e ferramentas de limpeza. Instrumentos calibrados são inegociáveis.</p>
<p>Equipamento limpo e organizado evita contaminação cruzada entre clientes.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🧰</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Equipamentos</text>
<circle cx="160" cy="72" r="6" fill="#22C55E"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Testes calibrados</text><circle cx="160" cy="112" r="6" fill="#0E7490"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Baldes e sifão dedicados</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Evite contaminação cruzada</text>
</svg></figure>
<div class="alerta">⚠️ <b>Atenção:</b> Usar o mesmo material em vários clientes sem higienizar pode espalhar doenças de um aquário para outro.</div>',5);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000025','Como elaborar um relatório técnico','<p>O <b>relatório técnico</b> (laudo) é o que agrega valor à visita: registra os parâmetros, a gravidade de cada um, as ações tomadas e as recomendações, de forma clara para o cliente.</p>
<p>É exatamente o que o <b>Aqualife Care</b> automatiza: transforma as leituras numa Nota de Saúde e num laudo rastreável a cada visita.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/><rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/><rect x="20" y="20" width="9" height="110" rx="4" fill="#22C55E"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Relatório da visita</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">Nota de saúde 87 · 100</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#22C55E"/><text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Saudável</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/><text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Rotina mantida, próxima visita em 30 dias</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> O laudo profissionaliza o serviço: o cliente não paga só pela limpeza, mas pelo diagnóstico e pela tranquilidade.</div>
<a class="aquabook" href="https://app.aqualifeaquarismo.com/entrar.html">🩺 Gerar laudos automáticos no Aqualife Care</a>',6);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000025','Interpretação de parâmetros','<p>Interpretar é o núcleo do trabalho técnico: ler os parâmetros <b>em conjunto</b>, entender as interações (como pH e amônia) e traduzir tudo em decisões priorizadas.</p>
<p>É o que separa "medir" de "diagnosticar": o profissional sabe qual problema atacar primeiro.</p>
<figure><svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="620" height="150" rx="14" fill="#F6F9FB"/><rect x="20" y="20" width="580" height="110" rx="14" fill="#fff" stroke="#E2E8F0"/><rect x="20" y="20" width="9" height="110" rx="4" fill="#EAB308"/>
<text x="48" y="58" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">KH x pH</text>
<text x="48" y="86" font-family="Inter,sans-serif" font-size="15" fill="#64748B">Leitura: <tspan font-weight="700" fill="#0B2A3A">KH 1 dKH · pH instável</tspan></text>
<rect x="430" y="40" width="150" height="36" rx="18" fill="#EAB308"/><text x="505" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fff">Prioridade</text>
<line x1="48" y1="100" x2="572" y2="100" stroke="#E2E8F0"/><text x="48" y="121" font-family="Inter,sans-serif" font-size="14" fill="#334155">➡ Decisão: <tspan font-weight="700">Corrigir o KH primeiro estabiliza o pH</tspan></text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Diagnosticar é priorizar. Nem todo desvio tem o mesmo peso: o profissional resolve a causa raiz primeiro.</div>',7);
INSERT INTO aula (id,curso_id,titulo,conteudo,ordem) VALUES ('a2250000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000025','Atendimento ao cliente','<p>Metade do serviço é <b>relacionamento</b>: explicar o laudo em linguagem simples, alinhar expectativas, orientar entre visitas e transmitir confiança.</p>
<p>Um cliente que entende o valor do que recebe é um cliente que permanece, o que sustenta o negócio.</p>
<figure><svg viewBox="0 0 640 164" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="164" rx="14" fill="#F6F9FB"/><rect x="20" y="30" width="104" height="104" rx="20" fill="#0E7490"/>
<text x="72" y="100" text-anchor="middle" font-size="52">🤝</text>
<text x="150" y="40" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="#0B2A3A">Atendimento ao cliente</text>
<circle cx="160" cy="72" r="6" fill="#0E7490"/><text x="178" y="77" font-family="Inter,sans-serif" font-size="15" fill="#334155">Explique o laudo com clareza</text><circle cx="160" cy="112" r="6" fill="#22C55E"/><text x="178" y="117" font-family="Inter,sans-serif" font-size="15" fill="#334155">Oriente entre visitas</text><circle cx="160" cy="152" r="6" fill="#EAB308"/><text x="178" y="157" font-family="Inter,sans-serif" font-size="15" fill="#334155">Confiança fideliza</text>
</svg></figure>
<div class="destaque">💡 <b>Ponto-chave:</b> Técnica retém a água; comunicação retém o cliente. O laudo bem explicado é a sua melhor ferramenta de venda.</div>
<a class="aquabook" href="https://app.aqualifeaquarismo.com/entrar.html">🩺 Compartilhar o painel do cliente no Care</a>',8);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3250000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000025','A manutenção profissional se baseia em:','["Cuidar quando lembra","Cronograma e checklists","Só produtos químicos","Sorte"]',1,'Rotina documentada previne problemas.',1);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3250000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000025','Ao limpar a mídia biológica, o correto é:','["Lavar na torneira","Apenas enxaguar na água do sistema","Trocar toda de uma vez","Ferver"]',1,'Preserva a colônia de bactérias.',2);
INSERT INTO quiz_pergunta (id,curso_id,pergunta,opcoes,correta,explicacao,ordem) VALUES ('a3250000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000025','O relatório técnico (laudo) agrega valor porque:','["É bonito","Entrega diagnóstico e recomendações","Substitui a limpeza","Reduz o preço"]',1,'O cliente paga pelo diagnóstico e pela tranquilidade.',3);

-- FIM Trilha 5
