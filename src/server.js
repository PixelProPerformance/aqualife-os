/**
 * AQUALIFE OS — SERVIDOR RAILWAY
 * ================================================================
 * Versão Railway: sem Supabase, sem RLS. Segurança feita via
 * middleware + queries com filtro por organization_id.
 * A REGRA DE OURO se mantém: o motor DECIDE, a IA só escreve.
 * ================================================================
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { testarConexao, query } from "./db.js";
import { hashSenha, verificarSenha, gerarToken, exigeLogin, exigeAdmin,
         solicitarRecuperacaoSenha, redefinirSenha } from "./auth.js";
import { getConfig, setConfig, criarPreference, criarPreapproval,
         getPagamento, getPreapproval } from "./mp.js";
import { enviarEmail, emailRecuperacaoSenha, emailConfirmacaoPagamento,
         emailBoasVindasFundador, emailTeste } from "./email.js";
import { orcar as orcarPreco, TNOME as PRICING_TNOME, PLANOS as PRICING_PLANOS } from "./pricing.js";
import { enviarPurchaseCAPI } from "./capi.js";
import { diagnosticar, RULESET_VERSION } from "./motor/engine.mjs";
import { coletarEventos, visaoGeral, funil, secoes, paisDosHeaders } from "./analytics_api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const IA_KEY = process.env.ANTHROPIC_API_KEY?.trim();
import multer from "multer";
import { mkdirSync } from "fs";

// Pasta de uploads (criada automaticamente)
const UPLOADS_DIR = "./public/uploads";
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB, 10 fotos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});



// CORS — permitir domínio próprio (com e sem www) e Railway
app.use((req, res, next) => {
  const allowed = [
    "https://aqualifeaquarismo.com",
    "https://www.aqualifeaquarismo.com",
    "https://app.aqualifeaquarismo.com",
    "http://aqualifeaquarismo.com",
    "http://www.aqualifeaquarismo.com",
    "https://aqualife-os-production.up.railway.app",
  ];
  const origin = req.headers.origin;
  if (!origin || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../public")));



// ============================================================
// ENCICLOPÉDIA — ESPÉCIES (público, sem login)
// ============================================================
// Dados embutidos directamente — sem dependência de ficheiros externos
// Gerado automaticamente — 286 espécies, 38 incompatibilidades
const _ESPECIES  = [{"id":"neon-cardinal","categoria":"agua-doce","nome_comum":"Neon-cardinal","nome_cientifico":"Paracheirodon axelrodi","temp_min":23.0,"temp_max":27.0,"ph_min":4.5,"ph_max":6.8,"gh_min":1.0,"gh_max":6.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":10.0,"erros_comuns":"Manter em água alcalina, cardume pequeno (<8), iluminação intensa, aclimatação rápida","sinais_estresse":"Perda da coloração azul/vermelha, isolamento, respiração acelerada, permanência no fundo","notas":null,"foto_url":"/images/especies/Neon-cardinal.png","slug":"neon-cardinal"},{"id":"neon-tetra","categoria":"agua-doce","nome_comum":"Neon-tetra","nome_cientifico":"Paracheirodon innesi","temp_min":21.0,"temp_max":27.0,"ph_min":5.0,"ph_max":7.0,"gh_min":1.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":10.0,"erros_comuns":"Temperatura acima de 27°C por longos períodos, pH elevado, introdução em aquário recém-montado","sinais_estresse":"Cores apagadas, natação errática, emagrecimento, suscetibilidade à Doença do Neon","notas":null,"foto_url":"/images/especies/Neon-tetra.jfif","slug":"neon-tetra"},{"id":"neon-verde","categoria":"agua-doce","nome_comum":"Neon-verde","nome_cientifico":"Paracheirodon simulans","temp_min":24.0,"temp_max":28.0,"ph_min":4.0,"ph_max":6.5,"gh_min":1.0,"gh_max":4.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":3.5,"temperamento":"pacifico","cardume_min":10.0,"erros_comuns":"Correnteza forte, iluminação intensa, poucos esconderijos","sinais_estresse":"Cardume disperso, perda do brilho verde, apatia","notas":null,"foto_url":"","slug":"neon-verde"},{"id":"tetra-negro","categoria":"agua-doce","nome_comum":"Tetra-negro","nome_cientifico":"Gymnocorymbus ternetzi","temp_min":22.0,"temp_max":28.0,"ph_min":5.8,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cardume pequeno, mistura com peixes de nadadeiras longas, superlotação","sinais_estresse":"Mordidas entre indivíduos, nadadeiras fechadas, perseguições constantes","notas":null,"foto_url":"/images/especies/Tetra-negro.jfif","slug":"tetra-negro"},{"id":"tetra-limao","categoria":"agua-doce","nome_comum":"Tetra-limao","nome_cientifico":"Hyphessobrycon pulchripinnis","temp_min":23.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água muito dura, ausência de vegetação, poucos indivíduos","sinais_estresse":"Amarelecimento reduzido, timidez excessiva, permanência escondido","notas":null,"foto_url":"/images/especies/Tetra-limao.jpg","slug":"tetra-limao"},{"id":"tetra-rummy-nose","categoria":"agua-doce","nome_comum":"Tetra-rummy-nose","nome_cientifico":"Hemigrammus rhodostomus","temp_min":24.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":8.0,"erros_comuns":"Oscilações de parâmetros, aquário recém-ciclado, nitrato elevado","sinais_estresse":"Cabeça perde a coloração vermelha, cardume desorganizado, respiração rápida","notas":null,"foto_url":"","slug":"tetra-rummy-nose"},{"id":"tetra-serpae","categoria":"agua-doce","nome_comum":"Tetra-serpae","nome_cientifico":"Hyphessobrycon eques","temp_min":23.0,"temp_max":27.0,"ph_min":5.0,"ph_max":7.5,"gh_min":2.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":4.0,"temperamento":"semi_agressivo","cardume_min":6.0,"erros_comuns":"Cardume pequeno, convivência com peixes lentos, falta de espaço","sinais_estresse":"Mordidas em nadadeiras, agressividade elevada, perseguições frequentes","notas":null,"foto_url":"","slug":"tetra-serpae"},{"id":"tetra-diamante","categoria":"agua-doce","nome_comum":"Tetra-diamante","nome_cientifico":"Moenkhausia pittieri","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água muito clara, ausência de plantas, alimentação pobre","sinais_estresse":"Escamas sem brilho, coloração opaca, comportamento retraído","notas":null,"foto_url":"","slug":"tetra-diamante"},{"id":"tetra-imperador","categoria":"agua-doce","nome_comum":"Tetra-imperador","nome_cientifico":"Nematobrycon palmeri","temp_min":23.0,"temp_max":27.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Excesso de machos, pouco espaço territorial, iluminação intensa","sinais_estresse":"Disputas constantes, perda do brilho ocular, nadadeiras fechadas","notas":null,"foto_url":"/images/especies/Tetra-imperador.png","slug":"tetra-imperador"},{"id":"tetra-congo","categoria":"agua-doce","nome_comum":"Tetra-congo","nome_cientifico":"Phenacogrammus interruptus","temp_min":23.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":8.5,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário pequeno, pouca oxigenação, água dura em excesso","sinais_estresse":"Cores desbotadas, cauda retraída, dificuldade para nadar","notas":null,"foto_url":"","slug":"tetra-congo"},{"id":"tetra-bandeira","categoria":"agua-doce","nome_comum":"Tetra-bandeira","nome_cientifico":"Hyphessobrycon columbianus","temp_min":22.0,"temp_max":27.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cardume reduzido, alimentação insuficiente, mistura com espécies muito pequenas","sinais_estresse":"Beliscões, perseguições, comportamento hiperativo","notas":null,"foto_url":"","slug":"tetra-bandeira"},{"id":"tetra-pinguim","categoria":"agua-doce","nome_comum":"Tetra-pinguim","nome_cientifico":"Thayeria boehlkei","temp_min":22.0,"temp_max":28.0,"ph_min":5.8,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário curto, poucos indivíduos, correnteza muito fraca","sinais_estresse":"Cardume desorganizado, perda da inclinação característica ao nadar","notas":null,"foto_url":"/images/especies/Tetra-pinguim.png","slug":"tetra-pinguim"},{"id":"tetra-fantasma-negro","categoria":"agua-doce","nome_comum":"Tetra-fantasma-negro","nome_cientifico":"Hyphessobrycon megalopterus","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":4.5,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Poucos esconderijos, excesso de machos, água alcalina","sinais_estresse":"Nadadeiras fechadas, coloração escura excessiva, isolamento","notas":null,"foto_url":"/images/especies/Tetra-fantasma-negro.png","slug":"tetra-fantasma-negro"},{"id":"tetra-fantasma-vermelho","categoria":"agua-doce","nome_comum":"Tetra-fantasma-vermelho","nome_cientifico":"Hyphessobrycon sweglesi","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água dura, iluminação intensa, aquário pouco plantado","sinais_estresse":"Vermelho desbotado, perda do apetite, comportamento tímido","notas":null,"foto_url":"","slug":"tetra-fantasma-vermelho"},{"id":"tetra-glowlight","categoria":"agua-doce","nome_comum":"Tetra-glowlight","nome_cientifico":"Hemigrammus erythrozonus","temp_min":24.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água alcalina, iluminação intensa, cardume pequeno","sinais_estresse":"Faixa laranja apagada, permanência escondido, pouca atividade","notas":null,"foto_url":"/images/especies/Tetra-glowlight.png","slug":"tetra-glowlight"},{"id":"tetra-cabeca-e-cauda","categoria":"agua-doce","nome_comum":"Tetra-cabeca-e-cauda","nome_cientifico":"Hemigrammus ocellifer","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":4.5,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Qualidade da água inadequada, poucos indivíduos, superpopulação","sinais_estresse":"Mancha caudal menos evidente, perda do brilho, natação irregular","notas":null,"foto_url":"","slug":"tetra-cabeca-e-cauda"},{"id":"tetra-cardeal-verde","categoria":"agua-doce","nome_comum":"Tetra-cardeal-verde","nome_cientifico":"Hemigrammus hyanuary","temp_min":23.0,"temp_max":27.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":8.0,"erros_comuns":"Temperaturas baixas (<24°C), água alcalina, iluminação intensa","sinais_estresse":"Faixa verde pouco brilhante, cardume disperso, apatia","notas":null,"foto_url":"","slug":"tetra-cardeal-verde"},{"id":"peixe-machado","categoria":"agua-doce","nome_comum":"Peixe-machado","nome_cientifico":"Carnegiella strigata","temp_min":24.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário sem tampa, correnteza forte, cardume pequeno, pouca vegetação flutuante","sinais_estresse":"Saltos frequentes, permanência imóvel na superfície, perda de apetite","notas":null,"foto_url":"","slug":"peixe-machado"},{"id":"peixe-lapis","categoria":"agua-doce","nome_comum":"Peixe-lapis","nome_cientifico":"Nannostomus beckfordi","temp_min":24.0,"temp_max":28.0,"ph_min":5.0,"ph_max":7.0,"gh_min":1.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água alcalina, iluminação intensa, poucos esconderijos","sinais_estresse":"Coloração apagada, isolamento, pouca atividade","notas":null,"foto_url":"/images/especies/Peixe-lapis.jpg","slug":"peixe-lapis"},{"id":"tetra-vampiro","categoria":"agua-doce","nome_comum":"Tetra-vampiro","nome_cientifico":"Hydrolycus scomberoides","temp_min":23.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":1000.0,"tamanho_adulto":45.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação inadequada, pouca oxigenação","sinais_estresse":"Colisões contra o vidro, respiração acelerada, perda de apetite","notas":null,"foto_url":"","slug":"tetra-vampiro"},{"id":"piranha-vermelha","categoria":"agua-doce","nome_comum":"Piranha-vermelha","nome_cientifico":"Pygocentrus nattereri","temp_min":24.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":30.0,"temperamento":"agressivo","cardume_min":4.0,"erros_comuns":"Grupo pequeno, alimentação insuficiente, espaço reduzido","sinais_estresse":"Mordidas entre indivíduos, comportamento extremamente agressivo, coloração escura","notas":null,"foto_url":"/images/especies/Piranha-vermelha.png","slug":"piranha-vermelha"},{"id":"ramirezi","categoria":"agua-doce","nome_comum":"Ramirezi","nome_cientifico":"Mikrogeophagus ramirezi","temp_min":25.0,"temp_max":30.0,"ph_min":5.0,"ph_max":7.0,"gh_min":1.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Temperatura baixa, nitrato elevado, aquário recém-ciclado","sinais_estresse":"Escurecimento do corpo, nadadeiras fechadas, apatia, perda de apetite","notas":null,"foto_url":"/images/especies/Ramirezi.png","slug":"ramirezi"},{"id":"ramirezi-boliviano","categoria":"agua-doce","nome_comum":"Ramirezi-boliviano","nome_cientifico":"Mikrogeophagus altispinosus","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Água muito dura, falta de esconderijos","sinais_estresse":"Coloração apagada, isolamento, pouca interação","notas":null,"foto_url":"","slug":"ramirezi-boliviano"},{"id":"apistogramma-cacatuoides","categoria":"agua-doce","nome_comum":"Apistogramma-cacatuoides","nome_cientifico":"Apistogramma cacatuoides","temp_min":24.0,"temp_max":29.0,"ph_min":5.5,"ph_max":7.5,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Ausência de cavernas, excesso de machos, aquário pequeno","sinais_estresse":"Disputas territoriais, nadadeiras fechadas, fêmeas escondidas","notas":null,"foto_url":"/images/especies/Apistogramma-cacatuoides.jpg","slug":"apistogramma-cacatuoides"},{"id":"apistogramma-agassizii","categoria":"agua-doce","nome_comum":"Apistogramma-agassizii","nome_cientifico":"Apistogramma agassizii","temp_min":24.0,"temp_max":29.0,"ph_min":5.0,"ph_max":6.5,"gh_min":1.0,"gh_max":6.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Água alcalina, poucos refúgios, iluminação intensa","sinais_estresse":"Estresse territorial, perda das cores, pouca alimentação","notas":null,"foto_url":"/images/especies/Apistogramma-agassizii.jpg","slug":"apistogramma-agassizii"},{"id":"apistogramma-borellii","categoria":"agua-doce","nome_comum":"Apistogramma-borellii","nome_cientifico":"Apistogramma borellii","temp_min":22.0,"temp_max":27.0,"ph_min":5.5,"ph_max":7.5,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Temperatura elevada por longos períodos, pouca vegetação","sinais_estresse":"Falta de reprodução, apatia, isolamento","notas":null,"foto_url":"","slug":"apistogramma-borellii"},{"id":"acara-disco","categoria":"agua-doce","nome_comum":"Acara-disco","nome_cientifico":"Symphysodon aequifasciatus","temp_min":27.0,"temp_max":30.0,"ph_min":5.5,"ph_max":7.0,"gh_min":1.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":20.0,"temperamento":"pacifico","cardume_min":5.0,"erros_comuns":"Oscilação de temperatura, água velha, alimentação inadequada","sinais_estresse":"Corpo escurecido, fezes brancas, isolamento, respiração rápida","notas":null,"foto_url":"/images/especies/Acara-disco.png","slug":"acara-disco"},{"id":"acara-bandeira","categoria":"agua-doce","nome_comum":"Acara-bandeira","nome_cientifico":"Pterophyllum scalare","temp_min":24.0,"temp_max":29.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":15.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário baixo, mistura com peixes mordedores, poucos esconderijos","sinais_estresse":"Nadadeiras fechadas, agressividade excessiva, isolamento","notas":null,"foto_url":"/images/especies/Acara-bandeira.png","slug":"acara-bandeira"},{"id":"acara-bandeira-altum","categoria":"agua-doce","nome_comum":"Acara-bandeira-altum","nome_cientifico":"Pterophyllum altum","temp_min":27.0,"temp_max":31.0,"ph_min":4.5,"ph_max":6.0,"gh_min":1.0,"gh_max":5.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":18.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Água alcalina, aquário baixo, parâmetros instáveis","sinais_estresse":"Estresse respiratório, perda da postura elegante, coloração opaca","notas":null,"foto_url":"/images/especies/Acara-bandeira-altum.jpg","slug":"acara-bandeira-altum"},{"id":"kribensis","categoria":"agua-doce","nome_comum":"Kribensis","nome_cientifico":"Pelvicachromis pulcher","temp_min":24.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":2.0,"erros_comuns":"Poucos esconderijos, excesso de casais","sinais_estresse":"Disputas territoriais, escavações excessivas, perseguições","notas":null,"foto_url":"/images/especies/Kribensis.jpg","slug":"kribensis"},{"id":"oscar","categoria":"agua-doce","nome_comum":"Oscar","nome_cientifico":"Astronotus ocellatus","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":35.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, filtragem insuficiente, superalimentação","sinais_estresse":"Buracos na cabeça (HLLE), perda de apetite, agressividade","notas":null,"foto_url":"/images/especies/Oscar.png","slug":"oscar"},{"id":"acara-azul","categoria":"agua-doce","nome_comum":"Acara-azul","nome_cientifico":"Andinoacara pulcher","temp_min":22.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":6.0,"gh_max":18.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":15.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Espaço reduzido, mistura com peixes pequenos","sinais_estresse":"Territorialismo intenso, perseguições, escavação constante","notas":null,"foto_url":"/images/especies/Acara-azul.jpg","slug":"acara-azul"},{"id":"jack-dempsey","categoria":"agua-doce","nome_comum":"Jack-dempsey","nome_cientifico":"Rocio octofasciata","temp_min":22.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":6.0,"gh_max":18.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":20.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Pouco espaço, esconderijos insuficientes","sinais_estresse":"Escurecimento, agressividade elevada, recusa alimentar","notas":null,"foto_url":"/images/especies/Jack-dempsey.png","slug":"jack-dempsey"},{"id":"ciclideo-joia","categoria":"agua-doce","nome_comum":"Ciclideo-joia","nome_cientifico":"Hemichromis bimaculatus","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.8,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":12.0,"temperamento":"agressivo","cardume_min":2.0,"erros_comuns":"Aquário comunitário, poucos territórios","sinais_estresse":"Ataques constantes, coloração muito escura, estresse dos companheiros","notas":null,"foto_url":"/images/especies/Ciclideo-joia.png","slug":"ciclideo-joia"},{"id":"severum","categoria":"agua-doce","nome_comum":"Severum","nome_cientifico":"Heros severus","temp_min":23.0,"temp_max":29.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":250.0,"tamanho_adulto":20.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Alimentação pobre em vegetais, aquário pequeno","sinais_estresse":"Escurecimento, perda de apetite, comportamento retraído","notas":null,"foto_url":"/images/especies/Severum.png","slug":"severum"},{"id":"bocca-de-fogo","categoria":"agua-doce","nome_comum":"Bocca-de-fogo","nome_cientifico":"Thorichthys meeki","temp_min":23.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":8.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":15.0,"temperamento":"semi_agressivo","cardume_min":2.0,"erros_comuns":"Falta de território, substrato inadequado","sinais_estresse":"Exibição exagerada das brânquias, perseguições, estresse territorial","notas":null,"foto_url":"/images/especies/Bocca-de-fogo.png","slug":"bocca-de-fogo"},{"id":"coridora-bronze","categoria":"agua-doce","nome_comum":"Coridora-bronze","nome_cientifico":"Corydoras aeneus","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.8,"gh_min":4.0,"gh_max":16.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cascalho grosso, manutenção isolada","sinais_estresse":"Barbilhões desgastados, pouca atividade, respiração frequente na superfície","notas":null,"foto_url":"/images/especies/Coridora-bronze.png","slug":"coridora-bronze"},{"id":"coridora-panda","categoria":"agua-doce","nome_comum":"Coridora-panda","nome_cientifico":"Corydoras panda","temp_min":20.0,"temp_max":25.0,"ph_min":6.0,"ph_max":7.4,"gh_min":2.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Temperatura alta (>27°C), fundo abrasivo","sinais_estresse":"Perda dos barbilhões, letargia, emagrecimento","notas":null,"foto_url":"/images/especies/Coridora-panda.png","slug":"coridora-panda"},{"id":"coridora-julii","categoria":"agua-doce","nome_comum":"Coridora-julii","nome_cientifico":"Corydoras julii","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário sujo, substrato inadequado","sinais_estresse":"Barbilhões lesionados, pouca alimentação","notas":null,"foto_url":"/images/especies/Coridora-julii.png","slug":"coridora-julii"},{"id":"coridora-sterbai","categoria":"agua-doce","nome_comum":"Coridora-sterbai","nome_cientifico":"Corydoras sterbai","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.6,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Pouca oxigenação, nitrato elevado","sinais_estresse":"Respiração rápida, permanência na superfície","notas":null,"foto_url":"/images/especies/Coridora-sterbai.png","slug":"coridora-sterbai"},{"id":"coridora-pigmeu","categoria":"agua-doce","nome_comum":"Coridora-pigmeu","nome_cientifico":"Corydoras pygmaeus","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":2.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":10.0,"erros_comuns":"Grupo pequeno, peixes grandes como companheiros","sinais_estresse":"Timidez extrema, cardume disperso","notas":null,"foto_url":"/images/especies/Coridora-pigmeu.png","slug":"coridora-pigmeu"},{"id":"coridora-leopardo","categoria":"agua-doce","nome_comum":"Coridora-leopardo","nome_cientifico":"Corydoras trilineatus","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cascalho cortante, pouca circulação","sinais_estresse":"Lesões nos barbilhões, pouca atividade","notas":null,"foto_url":"/images/especies/Coridora-leopardo.png","slug":"coridora-leopardo"},{"id":"cascudo-otocinclus","categoria":"agua-doce","nome_comum":"Cascudo-otocinclus","nome_cientifico":"Otocinclus affinis","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Introdução em aquário novo, falta de biofilme e algas","sinais_estresse":"Abdômen afundado, emagrecimento, mortalidade rápida","notas":null,"foto_url":"/images/especies/Coridora-sterbai.png","slug":"cascudo-otocinclus"},{"id":"cascudo-ancistrus","categoria":"agua-doce","nome_comum":"Cascudo-ancistrus","nome_cientifico":"Ancistrus cirrhosus","temp_min":22.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":12.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Pouca madeira, alimentação apenas com algas","sinais_estresse":"Abdômen fino, crescimento lento, perda de apetite","notas":null,"foto_url":"/images/especies/Cascudo-ancistrus.png","slug":"cascudo-ancistrus"},{"id":"cascudo-comum","categoria":"agua-doce","nome_comum":"Cascudo-comum","nome_cientifico":"Hypostomus plecostomus","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":45.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, filtragem insuficiente","sinais_estresse":"Crescimento deformado, letargia, baixa oxigenação","notas":null,"foto_url":"/images/especies/Cascudo-comum.png","slug":"cascudo-comum"},{"id":"cascudo-zebra","categoria":"agua-doce","nome_comum":"Cascudo-zebra","nome_cientifico":"Hypancistrus zebra","temp_min":26.0,"temp_max":30.0,"ph_min":6.0,"ph_max":7.0,"gh_min":2.0,"gh_max":8.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":9.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Temperatura baixa, pouca correnteza, oxigenação insuficiente","sinais_estresse":"Respiração acelerada, perda de apetite, permanência escondido","notas":null,"foto_url":"/images/especies/Cascudo-zebra.jpg","slug":"cascudo-zebra"},{"id":"limpa-vidro-siames","categoria":"agua-doce","nome_comum":"Limpa-vidro-siamês","nome_cientifico":"Crossocheilus oblongus","temp_min":23.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":15.0,"temperamento":"pacifico","cardume_min":4.0,"erros_comuns":"Aquário pequeno, falta de algas naturais, alimentação insuficiente, convivência com peixes agressivos","sinais_estresse":"Emagrecimento, perda de atividade, permanência escondido, disputas territoriais","notas":null,"foto_url":"/images/especies/Limpa-vidro-siamês.png","slug":"limpa-vidro-siames"},{"id":"barbo-sumatra","categoria":"agua-doce","nome_comum":"Barbo-sumatra","nome_cientifico":"Puntigrus tetrazona","temp_min":22.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":14.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":7.0,"temperamento":"semi_agressivo","cardume_min":6.0,"erros_comuns":"Cardume pequeno (<8), mistura com peixes de nadadeiras longas, superlotação","sinais_estresse":"Beliscões frequentes, perseguições, coloração apagada, agressividade elevada","notas":null,"foto_url":"/images/especies/Barbo-sumatrapng","slug":"barbo-sumatra"},{"id":"barbo-cereja","categoria":"agua-doce","nome_comum":"Barbo-cereja","nome_cientifico":"Puntius titteya","temp_min":23.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Pouca vegetação, poucos indivíduos, iluminação intensa","sinais_estresse":"Machos perdem o vermelho intenso, isolamento, pouca atividade","notas":null,"foto_url":"/images/especies/Barbo-cereja.png","slug":"barbo-cereja"},{"id":"barbo-rosaceo","categoria":"agua-doce","nome_comum":"Barbo-rosaceo","nome_cientifico":"Pethia conchonius","temp_min":18.0,"temp_max":24.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Temperatura muito elevada, aquário pequeno, grupo reduzido","sinais_estresse":"Coloração opaca, perseguições constantes, perda de apetite","notas":null,"foto_url":"","slug":"barbo-rosaceo"},{"id":"barbo-odessa","categoria":"agua-doce","nome_comum":"Barbo-odessa","nome_cientifico":"Pethia padamya","temp_min":22.0,"temp_max":26.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água de baixa qualidade, poucos exemplares, falta de espaço","sinais_estresse":"Faixa vermelha desbotada, estresse social, nadadeiras retraídas","notas":null,"foto_url":"","slug":"barbo-odessa"},{"id":"barbo-tico-tico","categoria":"agua-doce","nome_comum":"Barbo-tico-tico","nome_cientifico":"Barbodes semifasciolatus","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cardume pequeno, alimentação pobre, pouca circulação","sinais_estresse":"Hiperatividade, perseguições, coloração menos intensa","notas":null,"foto_url":"","slug":"barbo-tico-tico"},{"id":"danio-zebra","categoria":"agua-doce","nome_comum":"Danio-zebra","nome_cientifico":"Danio rerio","temp_min":18.0,"temp_max":26.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":16.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário curto, correnteza insuficiente, grupo pequeno","sinais_estresse":"Natação errática, cardume desorganizado, perda de apetite","notas":null,"foto_url":"","slug":"danio-zebra"},{"id":"danio-perola","categoria":"agua-doce","nome_comum":"Danio-perola","nome_cientifico":"Danio albolineatus","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Iluminação excessiva, poucos indivíduos","sinais_estresse":"Brilho reduzido, timidez, permanência nas laterais do aquário","notas":null,"foto_url":"","slug":"danio-perola"},{"id":"danio-leopardo","categoria":"agua-doce","nome_comum":"Danio-leopardo","nome_cientifico":"Danio frankei","temp_min":18.0,"temp_max":25.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário pequeno, água quente em excesso (>28°C)","sinais_estresse":"Hiperatividade seguida de apatia, perda da coloração","notas":null,"foto_url":"","slug":"danio-leopardo"},{"id":"rasbora-arlequim","categoria":"agua-doce","nome_comum":"Rasbora-arlequim","nome_cientifico":"Trigonostigma heteromorpha","temp_min":22.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":2.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":8.0,"erros_comuns":"Água alcalina, grupo pequeno, ausência de plantas","sinais_estresse":"Cardume disperso, perda da mancha triangular, timidez","notas":null,"foto_url":"","slug":"rasbora-arlequim"},{"id":"rasbora-galaxy","categoria":"agua-doce","nome_comum":"Rasbora-galaxy","nome_cientifico":"Danio margaritatus","temp_min":20.0,"temp_max":26.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":2.0,"temperamento":"pacifico","cardume_min":8.0,"erros_comuns":"Aquário comunitário com peixes grandes, iluminação intensa, poucos esconderijos","sinais_estresse":"Machos perdem as cores, permanecem escondidos, redução da atividade","notas":null,"foto_url":"","slug":"rasbora-galaxy"},{"id":"rasbora-brigittae","categoria":"agua-doce","nome_comum":"Rasbora-brigittae","nome_cientifico":"Boraras brigittae","temp_min":24.0,"temp_max":28.0,"ph_min":4.5,"ph_max":6.5,"gh_min":1.0,"gh_max":6.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":2.0,"temperamento":"pacifico","cardume_min":10.0,"erros_comuns":"Correnteza forte, aquário pouco plantado, cardume pequeno","sinais_estresse":"Vermelho apagado, isolamento, dificuldade para competir por alimento","notas":null,"foto_url":"","slug":"rasbora-brigittae"},{"id":"rasbora-escada","categoria":"agua-doce","nome_comum":"Rasbora-escada","nome_cientifico":"Trigonostigma espei","temp_min":23.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":8.0,"erros_comuns":"Água dura, poucos indivíduos, iluminação intensa","sinais_estresse":"Cardume desorganizado, perda da coloração cobre, pouca movimentação","notas":null,"foto_url":"","slug":"rasbora-escada"},{"id":"betta","categoria":"agua-doce","nome_comum":"Betta","nome_cientifico":"Betta splendens","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":20.0,"tamanho_adulto":7.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Correnteza forte, convivência com peixes agressivos, temperatura baixa","sinais_estresse":"Nadadeiras fechadas, perda das cores, apatia, recusa alimentar","notas":null,"foto_url":"","slug":"betta"},{"id":"gurami-anao","categoria":"agua-doce","nome_comum":"Gurami-anao","nome_cientifico":"Trichogaster lalius","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Água fria, excesso de machos, pouca vegetação","sinais_estresse":"Escurecimento, respiração acelerada, isolamento","notas":null,"foto_url":"","slug":"gurami-anao"},{"id":"gurami-perola","categoria":"agua-doce","nome_comum":"Gurami-perola","nome_cientifico":"Trichopodus leerii","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":12.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Aquário sem plantas, iluminação intensa, poucos esconderijos, excesso de machos","sinais_estresse":"Pérolas menos evidentes, timidez, perda do apetite, respiração acelerada","notas":null,"foto_url":"","slug":"gurami-perola"},{"id":"gurami-azul","categoria":"agua-doce","nome_comum":"Gurami-azul","nome_cientifico":"Trichopodus trichopterus","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":12.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, superlotação, excesso de machos, correnteza forte","sinais_estresse":"Territorialismo excessivo, perseguições, coloração escurecida, nadadeiras fechadas","notas":null,"foto_url":"","slug":"gurami-azul"},{"id":"gurami-beijador","categoria":"agua-doce","nome_comum":"Gurami-beijador","nome_cientifico":"Helostoma temminckii","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":25.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação pobre em vegetais, filtragem insuficiente","sinais_estresse":"\"Beijos\" agressivos constantes, emagrecimento, perda de atividade, isolamento","notas":null,"foto_url":"","slug":"gurami-beijador"},{"id":"colisa-mel","categoria":"agua-doce","nome_comum":"Colisa-mel","nome_cientifico":"Trichogaster chuna","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Água alcalina, ausência de plantas flutuantes, correnteza intensa","sinais_estresse":"Machos perdem a coloração nupcial, pouca alimentação, permanência escondido","notas":null,"foto_url":"","slug":"colisa-mel"},{"id":"paraiso","categoria":"agua-doce","nome_comum":"Paraiso","nome_cientifico":"Macropodus opercularis","temp_min":16.0,"temp_max":26.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Convivência com machos da mesma espécie, aquário pequeno, temperatura elevada","sinais_estresse":"Disputas frequentes, nadadeiras danificadas, comportamento extremamente territorial","notas":null,"foto_url":"","slug":"paraiso"},{"id":"guppy","categoria":"agua-doce","nome_comum":"Guppy","nome_cientifico":"Poecilia reticulata","temp_min":22.0,"temp_max":28.0,"ph_min":6.8,"ph_max":7.8,"gh_min":8.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Superpopulação, reprodução descontrolada, pH ácido, má qualidade da água","sinais_estresse":"Cauda fechada, perda das cores, apatia, surgimento de doenças oportunistas","notas":null,"foto_url":"","slug":"guppy"},{"id":"platy","categoria":"agua-doce","nome_comum":"Platy","nome_cientifico":"Xiphophorus maculatus","temp_min":21.0,"temp_max":28.0,"ph_min":7.0,"ph_max":8.2,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Água mole e ácida, excesso de machos, alimentação inadequada","sinais_estresse":"Isolamento, perda do apetite, coloração opaca","notas":null,"foto_url":"","slug":"platy"},{"id":"espada","categoria":"agua-doce","nome_comum":"Espada","nome_cientifico":"Xiphophorus hellerii","temp_min":22.0,"temp_max":28.0,"ph_min":7.0,"ph_max":8.2,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":12.0,"temperamento":"semi_agressivo","cardume_min":3.0,"erros_comuns":"Aquário pequeno, excesso de machos, falta de espaço para natação","sinais_estresse":"Perseguições constantes, espadas danificadas, estresse social","notas":null,"foto_url":"","slug":"espada"},{"id":"molinesia","categoria":"agua-doce","nome_comum":"Molinesia","nome_cientifico":"Poecilia sphenops","temp_min":22.0,"temp_max":28.0,"ph_min":7.0,"ph_max":8.5,"gh_min":10.0,"gh_max":30.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Água ácida, ausência de minerais, alimentação pobre em vegetais","sinais_estresse":"Emagrecimento, fezes finas, letargia, perda da coloração","notas":null,"foto_url":"","slug":"molinesia"},{"id":"molinesia-vela","categoria":"agua-doce","nome_comum":"Molinesia-vela","nome_cientifico":"Poecilia latipinna","temp_min":22.0,"temp_max":28.0,"ph_min":7.5,"ph_max":8.5,"gh_min":12.0,"gh_max":30.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":12.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Aquário pequeno, água pouco mineralizada, baixa oxigenação","sinais_estresse":"Nadadeira dorsal retraída, pouca atividade, crescimento comprometido","notas":null,"foto_url":"","slug":"molinesia-vela"},{"id":"barrigudinho","categoria":"agua-doce","nome_comum":"Barrigudinho","nome_cientifico":"Poecilia vivipara","temp_min":20.0,"temp_max":30.0,"ph_min":7.0,"ph_max":8.5,"gh_min":8.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Água ácida, aquário sem vegetação, alimentação insuficiente","sinais_estresse":"Coloração apagada, baixa reprodução, pouca movimentação","notas":null,"foto_url":"","slug":"barrigudinho"},{"id":"killi-panchax","categoria":"agua-doce","nome_comum":"Killi-panchax","nome_cientifico":"Aplocheilus lineatus","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário sem tampa, convivência com peixes muito pequenos, correnteza intensa","sinais_estresse":"Saltos frequentes, isolamento, perda de apetite","notas":null,"foto_url":"","slug":"killi-panchax"},{"id":"killi-gardneri","categoria":"agua-doce","nome_comum":"Killi-gardneri","nome_cientifico":"Fundulopanchax gardneri","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":6.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Poucos esconderijos, excesso de machos, aquário aberto","sinais_estresse":"Disputas constantes, nadadeiras danificadas, perda da coloração","notas":null,"foto_url":"","slug":"killi-gardneri"},{"id":"peixe-lampada","categoria":"agua-doce","nome_comum":"Peixe-lampada","nome_cientifico":"Aplocheilus panchax","temp_min":20.0,"temp_max":28.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":7.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário destampado, alimentação inadequada, peixes pequenos como companheiros","sinais_estresse":"Saltos, agressividade, pouca atividade","notas":null,"foto_url":"","slug":"peixe-lampada"},{"id":"botia-palhaco","categoria":"agua-doce","nome_comum":"Botia-palhaco","nome_cientifico":"Chromobotia macracanthus","temp_min":24.0,"temp_max":30.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":30.0,"temperamento":"pacifico","cardume_min":5.0,"erros_comuns":"Grupo pequeno (<5), aquário pequeno, ausência de tocas","sinais_estresse":"Perda das cores, isolamento, respiração acelerada, permanência escondido","notas":null,"foto_url":"","slug":"botia-palhaco"},{"id":"botia-zebra","categoria":"agua-doce","nome_comum":"Botia-zebra","nome_cientifico":"Botia striata","temp_min":23.0,"temp_max":27.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":5.0,"erros_comuns":"Grupo pequeno (<5), ausência de esconderijos, substrato abrasivo","sinais_estresse":"Isolamento, respiração acelerada, perda das listras intensas","notas":null,"foto_url":"","slug":"botia-zebra"},{"id":"botia-kuhli","categoria":"agua-doce","nome_comum":"Botia-kuhli","nome_cientifico":"Pangio kuhlii","temp_min":24.0,"temp_max":30.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"pacifico","cardume_min":5.0,"erros_comuns":"Aquário sem areia fina, iluminação intensa, poucos refúgios","sinais_estresse":"Permanecer enterrado constantemente, emagrecimento, pouca atividade noturna","notas":null,"foto_url":"","slug":"botia-kuhli"},{"id":"ciclideo-zebra-malawi","categoria":"agua-doce","nome_comum":"Ciclideo-zebra-malawi","nome_cientifico":"Metriaclima estherae","temp_min":24.0,"temp_max":28.0,"ph_min":7.8,"ph_max":8.6,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":12.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Poucas rochas, mistura inadequada de Mbunas, aquário pequeno","sinais_estresse":"Territorialismo extremo, perseguições, coloração apagada","notas":null,"foto_url":"","slug":"ciclideo-zebra-malawi"},{"id":"ciclideo-yellow","categoria":"agua-doce","nome_comum":"Ciclideo-yellow","nome_cientifico":"Labidochromis caeruleus","temp_min":24.0,"temp_max":28.0,"ph_min":7.8,"ph_max":8.6,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Água ácida, poucas cavernas, excesso de machos","sinais_estresse":"Amarelo desbotado, isolamento, perda de apetite","notas":null,"foto_url":"","slug":"ciclideo-yellow"},{"id":"ciclideo-frontosa","categoria":"agua-doce","nome_comum":"Ciclideo-frontosa","nome_cientifico":"Cyphotilapia frontosa","temp_min":24.0,"temp_max":27.0,"ph_min":8.0,"ph_max":9.0,"gh_min":12.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":35.0,"temperamento":"semi_agressivo","cardume_min":5.0,"erros_comuns":"Aquário pequeno, iluminação intensa, temperatura elevada","sinais_estresse":"Permanência escondida, coloração escura, respiração acelerada","notas":null,"foto_url":"","slug":"ciclideo-frontosa"},{"id":"ciclideo-julidochromis","categoria":"agua-doce","nome_comum":"Ciclideo-julidochromis","nome_cientifico":"Julidochromis ornatus","temp_min":23.0,"temp_max":27.0,"ph_min":7.8,"ph_max":9.0,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"territorial","cardume_min":2.0,"erros_comuns":"Falta de fendas rochosas, excesso de casais","sinais_estresse":"Disputas territoriais, perda das listras, isolamento","notas":null,"foto_url":"","slug":"ciclideo-julidochromis"},{"id":"ciclideo-concha","categoria":"agua-doce","nome_comum":"Ciclideo-concha","nome_cientifico":"Neolamprologus multifasciatus","temp_min":24.0,"temp_max":27.0,"ph_min":7.8,"ph_max":9.0,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":4.0,"temperamento":"territorial","cardume_min":4.0,"erros_comuns":"Poucas conchas, substrato inadequado, poucos indivíduos","sinais_estresse":"Escavação excessiva, permanência escondido nas conchas, pouca alimentação","notas":null,"foto_url":"","slug":"ciclideo-concha"},{"id":"ciclideo-pavao","categoria":"agua-doce","nome_comum":"Ciclideo-pavao","nome_cientifico":"Aulonocara stuartgranti","temp_min":24.0,"temp_max":28.0,"ph_min":7.8,"ph_max":8.6,"gh_min":10.0,"gh_max":25.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":13.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Mistura com Mbunas muito agressivos, poucas áreas abertas","sinais_estresse":"Machos perdem a coloração, isolamento, pouco apetite","notas":null,"foto_url":"","slug":"ciclideo-pavao"},{"id":"peixe-elefante","categoria":"agua-doce","nome_comum":"Peixe-elefante","nome_cientifico":"Gnathonemus petersii","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":23.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário iluminado, substrato grosso, pouca oferta de alimento vivo","sinais_estresse":"Respiração acelerada, emagrecimento, esconder-se continuamente","notas":null,"foto_url":"","slug":"peixe-elefante"},{"id":"pacu","categoria":"agua-doce","nome_comum":"Pacu","nome_cientifico":"Piaractus mesopotamicus","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":1000.0,"tamanho_adulto":60.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação inadequada, baixa filtragem","sinais_estresse":"Colisões contra os vidros, crescimento deformado, apatia","notas":null,"foto_url":"","slug":"pacu"},{"id":"arowana-prata","categoria":"agua-doce","nome_comum":"Arowana-prata","nome_cientifico":"Osteoglossum bicirrhosum","temp_min":24.0,"temp_max":30.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":1500.0,"tamanho_adulto":90.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário sem tampa, pouco espaço para natação, alimentação monótona","sinais_estresse":"Saltos constantes, mandíbula deformada (\"drop eye\"), perda de apetite","notas":null,"foto_url":"","slug":"arowana-prata"},{"id":"peixe-faca-negro","categoria":"agua-doce","nome_comum":"Peixe-faca-negro","nome_cientifico":"Apteronotus albifrons","temp_min":23.0,"temp_max":28.0,"ph_min":6.0,"ph_max":null,"gh_min":4.0,"gh_max":12.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":50.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Poucos esconderijos, correnteza intensa, iluminação forte","sinais_estresse":"Permanecer escondido o dia todo, emagrecimento, respiração acelerada","notas":null,"foto_url":"","slug":"peixe-faca-negro"},{"id":"bicudo","categoria":"agua-doce","nome_comum":"Bicudo","nome_cientifico":"Boulengerella maculata","temp_min":24.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":500.0,"tamanho_adulto":35.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário curto, sustos frequentes, tampa inadequada","sinais_estresse":"Saltos, colisões, perda de apetite, respiração rápida","notas":null,"foto_url":"","slug":"bicudo"},{"id":"peixe-tigre","categoria":"agua-doce","nome_comum":"Peixe-tigre","nome_cientifico":"Datnioides microlepis","temp_min":24.0,"temp_max":28.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":40.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação insuficiente, companheiros inadequados","sinais_estresse":"Escurecimento das barras, isolamento, recusa alimentar","notas":null,"foto_url":"","slug":"peixe-tigre"},{"id":"poliptero","categoria":"agua-doce","nome_comum":"Poliptero","nome_cientifico":"Polypterus senegalus","temp_min":24.0,"temp_max":29.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":30.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário destampado, alimentação insuficiente, substrato inadequado","sinais_estresse":"Permanecer imóvel por longos períodos, emagrecimento, dificuldade respiratória","notas":null,"foto_url":"","slug":"poliptero"},{"id":"camarao-red-cherry","categoria":"agua-doce","nome_comum":"Camarao-red-cherry","nome_cientifico":"Neocaridina davidi","temp_min":18.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":6.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":20.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cobre na água, peixes predadores, oscilações de pH/GH","sinais_estresse":"Mudança de coloração, mortalidade após muda, pouca reprodução","notas":null,"foto_url":"","slug":"camarao-red-cherry"},{"id":"camarao-amano","categoria":"agua-doce","nome_comum":"Camarao-amano","nome_cientifico":"Caridina multidentata","temp_min":20.0,"temp_max":27.0,"ph_min":6.5,"ph_max":7.8,"gh_min":6.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Falta de biofilme, cobre, baixa oxigenação","sinais_estresse":"Letargia, falhas na muda, perda de transparência","notas":null,"foto_url":"","slug":"camarao-amano"},{"id":"camarao-crystal-red","categoria":"agua-doce","nome_comum":"Camarao-crystal-red","nome_cientifico":"Caridina cantonensis","temp_min":20.0,"temp_max":25.0,"ph_min":5.8,"ph_max":6.8,"gh_min":1.0,"gh_max":4.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"GH/KH elevados, temperatura alta, mudanças bruscas","sinais_estresse":"Perda do branco intenso, mortalidade durante a ecdise, pouca atividade","notas":null,"foto_url":"","slug":"camarao-crystal-red"},{"id":"caramujo-neritina","categoria":"agua-doce","nome_comum":"Caramujo-neritina","nome_cientifico":"Neritina natalensis","temp_min":22.0,"temp_max":28.0,"ph_min":7.0,"ph_max":8.5,"gh_min":8.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":20.0,"tamanho_adulto":2.5,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Água ácida, falta de cálcio, tampa aberta","sinais_estresse":"Casca desgastada, pouca movimentação, retração prolongada","notas":null,"foto_url":"","slug":"caramujo-neritina"},{"id":"caramujo-ampularia","categoria":"agua-doce","nome_comum":"Caramujo-ampularia","nome_cientifico":"Pomacea bridgesii","temp_min":20.0,"temp_max":28.0,"ph_min":7.0,"ph_max":8.0,"gh_min":8.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Água mole, deficiência de cálcio, cobre","sinais_estresse":"Casca corroída, retração constante, perda de apetite","notas":null,"foto_url":"","slug":"caramujo-ampularia"},{"id":"matinho","categoria":"agua-doce","nome_comum":"Matinho","nome_cientifico":"Hyphessobrycon anisitsi","temp_min":18.0,"temp_max":28.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":7.0,"temperamento":"semi_agressivo","cardume_min":6.0,"erros_comuns":"Cardume pequeno, mistura com peixes lentos","sinais_estresse":"Beliscões, perseguições, coloração opaca","notas":null,"foto_url":"","slug":"matinho"},{"id":"tanictis","categoria":"agua-doce","nome_comum":"Tanictis","nome_cientifico":"Tanichthys albonubes","temp_min":16.0,"temp_max":24.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":19.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":4.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Temperatura elevada (>26°C), poucos indivíduos","sinais_estresse":"Cardume disperso, perda das cores, letargia","notas":null,"foto_url":"","slug":"tanictis"},{"id":"peixe-arco-iris-boesemani","categoria":"agua-doce","nome_comum":"Peixe-arco-iris-boesemani","nome_cientifico":"Melanotaenia boesemani","temp_min":25.0,"temp_max":30.0,"ph_min":7.0,"ph_max":8.0,"gh_min":8.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":12.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Aquário pequeno, poucos indivíduos, pouca circulação","sinais_estresse":"Metade azul e laranja desbotadas, pouca atividade","notas":null,"foto_url":"","slug":"peixe-arco-iris-boesemani"},{"id":"peixe-arco-iris-neon","categoria":"agua-doce","nome_comum":"Peixe-arco-iris-neon","nome_cientifico":"Melanotaenia praecox","temp_min":23.0,"temp_max":28.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":15.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cardume reduzido, iluminação intensa sem plantas","sinais_estresse":"Azul metálico apagado, isolamento, timidez","notas":null,"foto_url":"","slug":"peixe-arco-iris-neon"},{"id":"peixe-arco-iris-madagascar","categoria":"agua-doce","nome_comum":"Peixe-arco-iris-madagascar","nome_cientifico":"Bedotia geayi","temp_min":22.0,"temp_max":26.0,"ph_min":7.0,"ph_max":8.0,"gh_min":8.0,"gh_max":20.0,"kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":9.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Água parada, grupo pequeno, aquário curto","sinais_estresse":"Perda do brilho, respiração acelerada, pouca atividade","notas":null,"foto_url":"","slug":"peixe-arco-iris-madagascar"},{"id":"palhaco-ocellaris","categoria":"marinho","nome_comum":"Palhaco-ocellaris","nome_cientifico":"Amphiprion ocellaris","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":2.0,"erros_comuns":"Introdução sem quarentena, ausência de refúgios, oscilações de salinidade, convivência com espécies agressivas","sinais_estresse":"Respiração acelerada, perda do apetite, coloração opaca, permanência em um canto","notas":null,"foto_url":"/images/especies/Palhaco-ocellaris.png","slug":"palhaco-ocellaris"},{"id":"palhaco-percula","categoria":"marinho","nome_comum":"Palhaco-percula","nome_cientifico":"Amphiprion percula","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":2.0,"erros_comuns":"Aquário recém-montado, temperatura instável, mudanças bruscas de salinidade","sinais_estresse":"Isolamento, escurecimento da coloração, pouca atividade","notas":null,"foto_url":"","slug":"palhaco-percula"},{"id":"palhaco-tomate","categoria":"marinho","nome_comum":"Palhaco-tomate","nome_cientifico":"Amphiprion frenatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":14.0,"temperamento":"agressivo","cardume_min":2.0,"erros_comuns":"Aquário pequeno, mistura com outros palhaços, poucos territórios","sinais_estresse":"Territorialismo excessivo, perseguições, mordidas constantes","notas":null,"foto_url":"/images/especies/Palhaco-tomate.png","slug":"palhaco-tomate"},{"id":"palhaco-clarkii","categoria":"marinho","nome_comum":"Palhaco-clarkii","nome_cientifico":"Amphiprion clarkii","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":15.0,"temperamento":"agressivo","cardume_min":2.0,"erros_comuns":"Introdução simultânea de vários casais, pouco espaço","sinais_estresse":"Agressividade elevada, perseguições, isolamento do indivíduo dominado","notas":null,"foto_url":"/images/especies/Palhaco-clarkii.png","slug":"palhaco-clarkii"},{"id":"palhaco-maroon","categoria":"marinho","nome_comum":"Palhaco-maroon","nome_cientifico":"Premnas biaculeatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":17.0,"temperamento":"agressivo","cardume_min":2.0,"erros_comuns":"Convivência com espécies dóceis, aquário pequeno","sinais_estresse":"Ataques frequentes, mordidas, defesa exagerada do território","notas":null,"foto_url":"/images/especies/Palhaco-maroon.png","slug":"palhaco-maroon"},{"id":"palhaco-skunk","categoria":"marinho","nome_comum":"Palhaco-skunk","nome_cientifico":"Amphiprion akallopisos","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":11.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Iluminação intensa, ausência de esconderijos","sinais_estresse":"Timidez, permanência escondido, perda de apetite","notas":null,"foto_url":"/images/especies/Palhaco-skunk.png","slug":"palhaco-skunk"},{"id":"palhaco-sebae","categoria":"marinho","nome_comum":"Palhaco-sebae","nome_cientifico":"Amphiprion sebae","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":14.0,"temperamento":"semi_agressivo","cardume_min":2.0,"erros_comuns":"Aquário imaturo, baixa qualidade da água","sinais_estresse":"Respiração rápida, perda das faixas escuras, letargia","notas":null,"foto_url":"/images/especies/Palhaco-sebae.png","slug":"palhaco-sebae"},{"id":"donzela-azul","categoria":"marinho","nome_comum":"Donzela-azul","nome_cientifico":"Chrysiptera cyanea","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, excesso de indivíduos, poucos esconderijos","sinais_estresse":"Territorialismo extremo, perseguições constantes, mordidas","notas":null,"foto_url":"/images/especies/Donzela-azul.png","slug":"donzela-azul"},{"id":"donzela-amarela","categoria":"marinho","nome_comum":"Donzela-amarela","nome_cientifico":"Chrysiptera parasema","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":7.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Introdução tardia no aquário, pouca estrutura rochosa","sinais_estresse":"Perda da coloração azul intensa, isolamento","notas":null,"foto_url":"/images/especies/Donzela-amarela.png","slug":"donzela-amarela"},{"id":"donzela-tres-listras","categoria":"marinho","nome_comum":"Donzela-tres-listras","nome_cientifico":"Dascyllus aruanus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":8.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Grupo reduzido, espaço limitado","sinais_estresse":"Ataques frequentes, dominância excessiva, estresse dos demais peixes","notas":null,"foto_url":"/images/especies/Donzela-tres-listras.png","slug":"donzela-tres-listras"},{"id":"donzela-domino","categoria":"marinho","nome_comum":"Donzela-domino","nome_cientifico":"Dascyllus trimaculatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":14.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, excesso de indivíduos","sinais_estresse":"Escurecimento da coloração, agressividade intensa","notas":null,"foto_url":"/images/especies/Donzela-domino.png","slug":"donzela-domino"},{"id":"donzela-verde","categoria":"marinho","nome_comum":"Donzela-verde","nome_cientifico":"Chromis viridis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":6.0,"erros_comuns":"Cardume pequeno, pouca alimentação, baixa circulação","sinais_estresse":"Cardume disperso, perda do verde metálico, isolamento","notas":null,"foto_url":"","slug":"donzela-verde"},{"id":"cirurgiao-patela","categoria":"marinho","nome_comum":"Cirurgiao-patela","nome_cientifico":"Paracanthurus hepatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":31.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, baixa oferta de algas, quarentena inadequada","sinais_estresse":"Manchas esbranquiçadas (íctio marinho), perda do azul intenso, respiração acelerada","notas":null,"foto_url":"/images/especies/Cirurgiao-patela.png","slug":"cirurgiao-patela"},{"id":"cirurgiao-amarelo","categoria":"marinho","nome_comum":"Cirurgiao-amarelo","nome_cientifico":"Zebrasoma flavescens","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":20.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Pouco espaço para natação, alimentação pobre em algas","sinais_estresse":"Amarelo desbotado, emagrecimento, agressividade","notas":null,"foto_url":"/images/especies/Cirurgiao-amarelo.png","slug":"cirurgiao-amarelo"},{"id":"cirurgiao-sailfin","categoria":"marinho","nome_comum":"Cirurgiao-sailfin","nome_cientifico":"Zebrasoma velifer","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":500.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário curto, poucos vegetais na dieta","sinais_estresse":"Nadadeiras retraídas, perda do apetite, pouca atividade","notas":null,"foto_url":"/images/especies/Cirurgiao-sailfin.png","slug":"cirurgiao-sailfin"},{"id":"cirurgiao-branco","categoria":"marinho","nome_comum":"Cirurgiao-branco","nome_cientifico":"Acanthurus leucosternon","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":500.0,"tamanho_adulto":23.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Introdução precoce, parâmetros instáveis, quarentena inadequada","sinais_estresse":"Forte suscetibilidade ao Cryptocaryon (íctio marinho), respiração rápida, perda das cores","notas":null,"foto_url":"","slug":"cirurgiao-branco"},{"id":"cirurgiao-chocolate","categoria":"marinho","nome_comum":"Cirurgiao-chocolate","nome_cientifico":"Acanthurus pyroferus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":25.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, pouca oferta de algas","sinais_estresse":"Coloração apagada, emagrecimento, comportamento territorial","notas":null,"foto_url":"/images/especies/Cirurgiao-chocolate.png","slug":"cirurgiao-chocolate"},{"id":"cirurgiao-naso","categoria":"marinho","nome_comum":"Cirurgiao-naso","nome_cientifico":"Naso lituratus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":45.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário insuficiente para seu porte, dieta inadequada","sinais_estresse":"Perda do apetite, emagrecimento, coloração opaca","notas":null,"foto_url":"/images/especies/Cirurgiao-naso.png","slug":"cirurgiao-naso"},{"id":"cirurgiao-kole","categoria":"marinho","nome_comum":"Cirurgiao-kole","nome_cientifico":"Ctenochaetus strigosus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":18.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Falta de biofilme, pouca rocha viva madura","sinais_estresse":"Emagrecimento, raspagem excessiva nas rochas, perda da atividade","notas":null,"foto_url":"","slug":"cirurgiao-kole"},{"id":"cirurgiao-powder-brown","categoria":"marinho","nome_comum":"Cirurgiao-powder-brown","nome_cientifico":"Acanthurus japonicus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":21.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Oscilações de temperatura, baixa oxigenação, estresse no transporte","sinais_estresse":"Respiração acelerada, íctio marinho, perda das cores","notas":null,"foto_url":"/images/especies/Cirurgiao-powder-brown.png","slug":"cirurgiao-powder-brown"},{"id":"anjo-coral","categoria":"marinho","nome_comum":"Anjo-coral","nome_cientifico":"Centropyge bispinosa","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, pouca rocha viva, alimentação limitada","sinais_estresse":"Mordiscar corais em excesso, perda da coloração, isolamento","notas":null,"foto_url":"/images/especies/Anjo-coral.png","slug":"anjo-coral"},{"id":"anjo-chama","categoria":"marinho","nome_comum":"Anjo-chama","nome_cientifico":"Centropyge loricula","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, pouca rocha viva, alimentação pouco variada","sinais_estresse":"Vermelho desbotado, mordiscar corais excessivamente, isolamento","notas":null,"foto_url":"/images/especies/Anjo-chama.png","slug":"anjo-chama"},{"id":"anjo-lemonpeel","categoria":"marinho","nome_comum":"Anjo-lemonpeel","nome_cientifico":"Centropyge flavissima","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":250.0,"tamanho_adulto":14.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Pouca oferta de algas e esponjas, aquário imaturo","sinais_estresse":"Amarelo apagado, perda de apetite, esconder-se constantemente","notas":null,"foto_url":"","slug":"anjo-lemonpeel"},{"id":"anjo-frances","categoria":"marinho","nome_comum":"Anjo-frances","nome_cientifico":"Pomacanthus paru","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":800.0,"tamanho_adulto":41.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, dieta pobre em esponjas, baixa filtragem","sinais_estresse":"Escurecimento da coloração, emagrecimento, pouca atividade","notas":null,"foto_url":"","slug":"anjo-frances"},{"id":"anjo-imperador","categoria":"marinho","nome_comum":"Anjo-imperador","nome_cientifico":"Pomacanthus imperator","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":1000.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Introdução em aquário recém-montado, espaço insuficiente","sinais_estresse":"Perda da coloração azul e amarela, recusa alimentar, respiração acelerada","notas":null,"foto_url":"/images/especies/Anjo-imperador.png","slug":"anjo-imperador"},{"id":"anjo-koran","categoria":"marinho","nome_comum":"Anjo-koran","nome_cientifico":"Pomacanthus semicirculatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":800.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno para adultos, alimentação inadequada","sinais_estresse":"Coloração opaca, crescimento comprometido, agressividade","notas":null,"foto_url":"/images/especies/Anjo-koran.png","slug":"anjo-koran"},{"id":"anjo-regal","categoria":"marinho","nome_comum":"Anjo-regal","nome_cientifico":"Pygoplites diacanthus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":25.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário imaturo, pouca rocha viva, dieta inadequada","sinais_estresse":"Recusa alimentar, emagrecimento rápido, isolamento","notas":null,"foto_url":"","slug":"anjo-regal"},{"id":"bodiao-limpador","categoria":"marinho","nome_comum":"Bodiao-limpador","nome_cientifico":"Labroides dimidiatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":11.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário sem peixes suficientes, tentativa de adaptação com dieta artificial","sinais_estresse":"Emagrecimento severo, pouca atividade, mortalidade precoce","notas":null,"foto_url":"/images/especies/Bodiao-limpador.png","slug":"bodiao-limpador"},{"id":"bodiao-seis-linhas","categoria":"marinho","nome_comum":"Bodiao-seis-linhas","nome_cientifico":"Pseudocheilinus hexataenia","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, excesso de peixes tímidos, poucos esconderijos","sinais_estresse":"Perseguições constantes, comportamento hiperterritorial","notas":null,"foto_url":"","slug":"bodiao-seis-linhas"},{"id":"bodiao-melanurus","categoria":"marinho","nome_comum":"Bodiao-melanurus","nome_cientifico":"Halichoeres melanurus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":12.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Substrato inadequado, ausência de areia fina, aquário destampado","sinais_estresse":"Permanecer escondido, dificuldade para enterrar-se, saltos","notas":null,"foto_url":"/images/especies/Bodiao-melanurus.png","slug":"bodiao-melanurus"},{"id":"bodiao-fada","categoria":"marinho","nome_comum":"Bodiao-fada","nome_cientifico":"Cirrhilabrus rubriventralis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário aberto, iluminação intensa, ausência de refúgios","sinais_estresse":"Saltos, perda da coloração, timidez extrema","notas":null,"foto_url":"","slug":"bodiao-fada"},{"id":"bodiao-verde","categoria":"marinho","nome_comum":"Bodiao-verde","nome_cientifico":"Halichoeres chloropterus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":19.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Falta de substrato arenoso, alimentação insuficiente","sinais_estresse":"Permanecer escondido, emagrecimento, perda do brilho","notas":null,"foto_url":"","slug":"bodiao-verde"},{"id":"gobi-mandarim","categoria":"marinho","nome_comum":"Gobi-mandarim","nome_cientifico":"Synchiropus splendidus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":7.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário jovem, ausência de copépodes, competição alimentar","sinais_estresse":"Abdômen afundado, emagrecimento progressivo, pouca atividade","notas":null,"foto_url":"/images/especies/Gobi-mandarim.png","slug":"gobi-mandarim"},{"id":"gobi-watchman-amarelo","categoria":"marinho","nome_comum":"Gobi-watchman-amarelo","nome_cientifico":"Cryptocentrus cinctus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Falta de areia, ausência de tocas, peixes agressivos","sinais_estresse":"Permanecer escondido, perda de apetite, respiração acelerada","notas":null,"foto_url":"/images/especies/Gobi-watchman-amarelo.png","slug":"gobi-watchman-amarelo"},{"id":"gobi-neon","categoria":"marinho","nome_comum":"Gobi-neon","nome_cientifico":"Elacatinus oceanops","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Poucos esconderijos, companheiros agressivos","sinais_estresse":"Isolamento, pouca atividade de limpeza, perda da coloração","notas":null,"foto_url":"","slug":"gobi-neon"},{"id":"gobi-firefish","categoria":"marinho","nome_comum":"Gobi-firefish","nome_cientifico":"Nemateleotris magnifica","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":9.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário sem tampa, poucos esconderijos, peixes agressivos","sinais_estresse":"Saltos, permanência escondido, perda do apetite","notas":null,"foto_url":"/images/especies/Gobi-firefish.png","slug":"gobi-firefish"},{"id":"gobi-diamante","categoria":"marinho","nome_comum":"Gobi-diamante","nome_cientifico":"Valenciennea puellaris","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":15.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Substrato muito grosso, falta de microfauna, aquário recém-montado","sinais_estresse":"Emagrecimento, deixar de peneirar a areia, pouca atividade","notas":null,"foto_url":"","slug":"gobi-diamante"},{"id":"blenio-lawnmower","categoria":"marinho","nome_comum":"Blenio-lawnmower","nome_cientifico":"Salarias fasciatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":14.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Poucas algas naturais, alimentação insuficiente","sinais_estresse":"Abdômen afundado, perda de peso, pouca atividade","notas":null,"foto_url":"","slug":"blenio-lawnmower"},{"id":"blenio-bicolor","categoria":"marinho","nome_comum":"Blenio-bicolor","nome_cientifico":"Ecsenius bicolor","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":10.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Falta de algas, poucas rochas, aquário pequeno","sinais_estresse":"Permanecer escondido, emagrecimento, perda da coloração","notas":null,"foto_url":"/images/especies/Blenio-bicolor.jpg","slug":"blenio-bicolor"},{"id":"cardinal-banggai","categoria":"marinho","nome_comum":"Cardinal-banggai","nome_cientifico":"Pterapogon kauderni","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Poucos esconderijos, grupo incompatível, baixa qualidade da água","sinais_estresse":"Permanecer imóvel, respiração acelerada, perda do apetite","notas":null,"foto_url":"/images/especies/Cardinal-banggai.png","slug":"cardinal-banggai"},{"id":"cardinal-pajama","categoria":"marinho","nome_comum":"Cardinal-pajama","nome_cientifico":"Sphaeramia nematoptera","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Iluminação intensa, ausência de refúgios","sinais_estresse":"Isolamento, pouca alimentação, coloração opaca","notas":null,"foto_url":"/images/especies/Cardinal-pajama.png","slug":"cardinal-pajama"},{"id":"gramma-royal","categoria":"marinho","nome_comum":"Gramma-royal","nome_cientifico":"Gramma loreto","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":8.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Poucas cavernas, convivência com peixes agressivos","sinais_estresse":"Permanecer escondido, perda da coloração roxa, recusa alimentar","notas":null,"foto_url":"/images/especies/Gramma-royal.png","slug":"gramma-royal"},{"id":"basslet-chalk","categoria":"marinho","nome_comum":"Basslet-chalk","nome_cientifico":"Serranus tortugarum","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Poucos esconderijos, aquário pequeno, companheiros agressivos","sinais_estresse":"Permanecer escondido, perda da coloração azul/amarela, recusa alimentar","notas":null,"foto_url":"","slug":"basslet-chalk"},{"id":"anthias-lyretail","categoria":"marinho","nome_comum":"Anthias-lyretail","nome_cientifico":"Pseudanthias squamipinnis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":15.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Alimentação insuficiente (menos de 2–3 vezes ao dia), poucos indivíduos, baixa circulação","sinais_estresse":"Abdômen afundado, coloração opaca, isolamento, respiração acelerada","notas":null,"foto_url":"","slug":"anthias-lyretail"},{"id":"borboleta-copperband","categoria":"marinho","nome_comum":"Borboleta-copperband","nome_cientifico":"Chelmon rostratus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":20.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário recém-montado, falta de alimento natural, competição alimentar","sinais_estresse":"Emagrecimento rápido, recusa alimentar, perda da atividade","notas":null,"foto_url":"/images/especies/Borboleta-copperband.png","slug":"borboleta-copperband"},{"id":"borboleta-raccoon","categoria":"marinho","nome_comum":"Borboleta-raccoon","nome_cientifico":"Chaetodon lunula","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":20.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, pouca rocha viva, alimentação limitada","sinais_estresse":"Coloração apagada, respiração acelerada, pouca movimentação","notas":null,"foto_url":"","slug":"borboleta-raccoon"},{"id":"borboleta-longnose","categoria":"marinho","nome_comum":"Borboleta-longnose","nome_cientifico":"Forcipiger flavissimus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":22.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário imaturo, dieta inadequada, poucos invertebrados naturais","sinais_estresse":"Abdômen retraído, perda do amarelo intenso, recusa alimentar","notas":null,"foto_url":"","slug":"borboleta-longnose"},{"id":"borboleta-quatro-olhos","categoria":"marinho","nome_comum":"Borboleta-quatro-olhos","nome_cientifico":"Chaetodon capistratus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":15.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Pouca oferta de alimento natural, aquário pequeno","sinais_estresse":"Emagrecimento, perda da falsa mancha ocular, apatia","notas":null,"foto_url":"","slug":"borboleta-quatro-olhos"},{"id":"peixe-gatilho-picasso","categoria":"marinho","nome_comum":"Peixe-gatilho-picasso","nome_cientifico":"Rhinecanthus aculeatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":30.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, convivência com peixes dóceis, alimentação insuficiente","sinais_estresse":"Territorialismo extremo, mordidas, escavação excessiva","notas":null,"foto_url":"","slug":"peixe-gatilho-picasso"},{"id":"peixe-gatilho-niger","categoria":"marinho","nome_comum":"Peixe-gatilho-niger","nome_cientifico":"Odonus niger","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":50.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Espaço insuficiente para natação, alimentação pobre","sinais_estresse":"Coloração escura, perda do apetite, comportamento agressivo","notas":null,"foto_url":"/images/especies/Peixe-gatilho-niger.png","slug":"peixe-gatilho-niger"},{"id":"baiacu-valentini","categoria":"marinho","nome_comum":"Baiacu-valentini","nome_cientifico":"Canthigaster valentini","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":11.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Alimentação sem alimentos duros, aquário pequeno","sinais_estresse":"Dentes excessivamente longos, emagrecimento, perda da atividade","notas":null,"foto_url":"/images/especies/Baiacu-valentini.png","slug":"baiacu-valentini"},{"id":"baiacu-porcupine","categoria":"marinho","nome_comum":"Baiacu-porcupine","nome_cientifico":"Diodon holocanthus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":50.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Dieta inadequada, aquário pequeno, baixa filtragem","sinais_estresse":"Dificuldade para alimentar-se, dentes crescidos, apatia","notas":null,"foto_url":"","slug":"baiacu-porcupine"},{"id":"peixe-caixa-amarelo","categoria":"marinho","nome_comum":"Peixe-caixa-amarelo","nome_cientifico":"Ostracion cubicus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":500.0,"tamanho_adulto":45.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Estresse intenso, captura inadequada, aquário pequeno","sinais_estresse":"Escurecimento da coloração, perda de apetite, permanência escondido","notas":null,"foto_url":"/images/especies/Peixe-caixa-amarelo.png","slug":"peixe-caixa-amarelo"},{"id":"peixe-leao","categoria":"marinho","nome_comum":"Peixe-leao","nome_cientifico":"Pterois volitans","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":38.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Alimentação exclusivamente com peixes vivos, aquário pequeno","sinais_estresse":"Recusa alimentar, emagrecimento, respiração acelerada","notas":null,"foto_url":"/images/especies/Peixe-leao.png","slug":"peixe-leao"},{"id":"peixe-leao-anao","categoria":"marinho","nome_comum":"Peixe-leao-anao","nome_cientifico":"Dendrochirus zebra","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":25.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Falta de esconderijos, iluminação intensa","sinais_estresse":"Permanecer imóvel constantemente, perda do apetite","notas":null,"foto_url":"","slug":"peixe-leao-anao"},{"id":"foxface","categoria":"marinho","nome_comum":"Foxface","nome_cientifico":"Siganus vulpinus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":24.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Pouca oferta de algas, aquário pequeno, estresse social","sinais_estresse":"Corpo escurecido ou com manchas marrons, espinhos dorsais constantemente erguidos, perda do apetite","notas":null,"foto_url":"/images/especies/Foxface.png","slug":"foxface"},{"id":"coelho-magnifico","categoria":"marinho","nome_comum":"Coelho-magnifico","nome_cientifico":"Siganus magnificus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":500.0,"tamanho_adulto":24.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Alimentação pobre em vegetais, baixa oxigenação","sinais_estresse":"Escurecimento da coloração, pouca atividade, emagrecimento","notas":null,"foto_url":"","slug":"coelho-magnifico"},{"id":"cavalo-marinho","categoria":"marinho","nome_comum":"Cavalo-marinho","nome_cientifico":"Hippocampus erectus","temp_min":22.0,"temp_max":26.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":15.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Correnteza intensa, competição alimentar, temperatura elevada","sinais_estresse":"Permanecer sem se fixar, emagrecimento, respiração acelerada","notas":null,"foto_url":"/images/especies/Cavalo-marinho.png","slug":"cavalo-marinho"},{"id":"cavalo-marinho-anao","categoria":"marinho","nome_comum":"Cavalo-marinho-anao","nome_cientifico":"Hippocampus zosterae","temp_min":22.0,"temp_max":26.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":2.5,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Aquário comunitário, falta de alimento vivo, fluxo intenso","sinais_estresse":"Perda de peso, pouca fixação em macroalgas, letargia","notas":null,"foto_url":"","slug":"cavalo-marinho-anao"},{"id":"hawkfish-longnose","categoria":"marinho","nome_comum":"Hawkfish-longnose","nome_cientifico":"Oxycirrhites typus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":13.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Poucos poleiros naturais, aquário pequeno","sinais_estresse":"Permanecer escondido, perda da coloração, pouca atividade","notas":null,"foto_url":"/images/especies/Hawkfish-longnose.png","slug":"hawkfish-longnose"},{"id":"dottyback-orchid","categoria":"marinho","nome_comum":"Dottyback-orchid","nome_cientifico":"Pseudochromis fridmani","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":7.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, poucos esconderijos","sinais_estresse":"Territorialismo excessivo, perseguições, isolamento","notas":null,"foto_url":"/images/especies/Dottyback-orchid.png","slug":"dottyback-orchid"},{"id":"dottyback-neon","categoria":"marinho","nome_comum":"Dottyback-neon","nome_cientifico":"Pseudochromis aldabraensis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":10.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Companheiros muito pacíficos, falta de refúgios","sinais_estresse":"Agressividade elevada, ataques frequentes, coloração escurecida","notas":null,"foto_url":"/images/especies/Dottyback-neon.png","slug":"dottyback-neon"},{"id":"moreia-fita","categoria":"marinho","nome_comum":"Moreia-fita","nome_cientifico":"Rhinomuraena quaesita","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":100.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário aberto, alimentação inadequada, aquário jovem","sinais_estresse":"Recusa alimentar, permanência escondida, emagrecimento","notas":null,"foto_url":"","slug":"moreia-fita"},{"id":"moreia-floco-de-neve","categoria":"marinho","nome_comum":"Moreia-floco-de-neve","nome_cientifico":"Echidna nebulosa","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":75.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário sem tampa, dieta inadequada, pouca filtragem","sinais_estresse":"Tentativas de fuga, pouca alimentação, respiração acelerada","notas":null,"foto_url":"/images/especies/Moreia-floco-de-neve.png","slug":"moreia-floco-de-neve"},{"id":"peixe-agulha","categoria":"marinho","nome_comum":"Peixe-agulha","nome_cientifico":"Doryrhamphus excisus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":7.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Falta de microfauna, correnteza intensa, competição alimentar","sinais_estresse":"Emagrecimento, pouca atividade, perda da coloração","notas":null,"foto_url":"","slug":"peixe-agulha"},{"id":"peixe-sapo","categoria":"marinho","nome_comum":"Peixe-sapo","nome_cientifico":"Antennarius maculatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":120.0,"tamanho_adulto":10.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Alimentação excessiva, aquário comunitário, pouca estabilidade","sinais_estresse":"Abdômen excessivamente dilatado, apatia, dificuldade respiratória","notas":null,"foto_url":"","slug":"peixe-sapo"},{"id":"peixe-porco","categoria":"marinho","nome_comum":"Peixe-porco","nome_cientifico":"Balistoides conspicillum","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":800.0,"tamanho_adulto":50.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação insuficiente, companheiros frágeis","sinais_estresse":"Territorialismo extremo, mordidas constantes, agressividade elevada","notas":null,"foto_url":"","slug":"peixe-porco"},{"id":"camarao-limpador","categoria":"marinho","nome_comum":"Camarao-limpador","nome_cientifico":"Lysmata amboinensis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Uso de cobre, baixa concentração de iodo, peixes predadores","sinais_estresse":"Falhas na muda, perda de atividade, mortalidade após ecdise","notas":null,"foto_url":"/images/especies/Camarao-limpador.png","slug":"camarao-limpador"},{"id":"camarao-fogo","categoria":"marinho","nome_comum":"Camarao-fogo","nome_cientifico":"Lysmata debelius","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Iluminação intensa, falta de esconderijos, cobre","sinais_estresse":"Permanecer escondido constantemente, perda da coloração vermelha, falhas na muda","notas":null,"foto_url":"","slug":"camarao-fogo"},{"id":"camarao-pistola","categoria":"marinho","nome_comum":"Camarao-pistola","nome_cientifico":"Alpheus randalli","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Falta de substrato, ausência de goby simbiótico, peixes agressivos","sinais_estresse":"Permanecer escondido continuamente, pouca escavação, perda de atividade","notas":null,"foto_url":"","slug":"camarao-pistola"},{"id":"camarao-arlequim","categoria":"marinho","nome_comum":"Camarao-arlequim","nome_cientifico":"Hymenocera picta","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Falta de estrelas-do-mar como alimento, aquário jovem","sinais_estresse":"Emagrecimento, pouca movimentação, mortalidade por inanição","notas":null,"foto_url":"","slug":"camarao-arlequim"},{"id":"ermitao-patas-azuis","categoria":"marinho","nome_comum":"Ermitao-patas-azuis","nome_cientifico":"Clibanarius tricolor","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":20.0,"tamanho_adulto":2.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Poucas conchas disponíveis, excesso de indivíduos","sinais_estresse":"Disputas por conchas, abandono da concha, pouca atividade","notas":null,"foto_url":"/images/especies/Ermitao-patas-azuis.jpg","slug":"ermitao-patas-azuis"},{"id":"ermitao-scarlet","categoria":"marinho","nome_comum":"Ermitao-scarlet","nome_cientifico":"Paguristes cadenati","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":20.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Falta de conchas maiores, baixa oferta de algas","sinais_estresse":"Permanecer imóvel, perda de atividade, disputas constantes","notas":null,"foto_url":"","slug":"ermitao-scarlet"},{"id":"caramujo-turbo","categoria":"marinho","nome_comum":"Caramujo-turbo","nome_cientifico":"Turbo fluctuosus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário sem algas, quedas frequentes, cobre","sinais_estresse":"Permanecer virado, pouca locomoção, mortalidade","notas":null,"foto_url":"","slug":"caramujo-turbo"},{"id":"caramujo-trochus","categoria":"marinho","nome_comum":"Caramujo-trochus","nome_cientifico":"Trochus niloticus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":40.0,"tamanho_adulto":7.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Deficiência de cálcio, pouca oferta de biofilme","sinais_estresse":"Casca desgastada, pouca atividade, retração prolongada","notas":null,"foto_url":"","slug":"caramujo-trochus"},{"id":"estrela-do-mar-linckia","categoria":"marinho","nome_comum":"Estrela-do-mar-linckia","nome_cientifico":"Linckia laevigata","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":30.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário imaturo, aclimatação rápida, pouca microfauna","sinais_estresse":"Braços necrosando, perda de tecido, pouca movimentação","notas":null,"foto_url":"/images/especies/Estrela-do-mar-linckia.png","slug":"estrela-do-mar-linckia"},{"id":"ourico-diadema","categoria":"marinho","nome_comum":"Ourico-diadema","nome_cientifico":"Diadema setosum","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":20.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Baixa alcalinidade, deficiência de cálcio, aquário pequeno","sinais_estresse":"Queda de espinhos, pouca movimentação, perda da coloração","notas":null,"foto_url":"","slug":"ourico-diadema"},{"id":"pepino-do-mar","categoria":"marinho","nome_comum":"Pepino-do-mar","nome_cientifico":"Holothuria edulis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":30.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário jovem, substrato pobre, manipulação excessiva","sinais_estresse":"Permanecer contraído, deixar de se alimentar, liberação de muco","notas":null,"foto_url":"/images/especies/Pepino-do-mar.png","slug":"pepino-do-mar"},{"id":"anemona-bolha","categoria":"marinho","nome_comum":"Anemona-bolha","nome_cientifico":"Entacmaea quadricolor","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":30.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Iluminação insuficiente, fluxo inadequado, parâmetros instáveis","sinais_estresse":"Deslocamento constante, boca aberta, retração dos tentáculos","notas":null,"foto_url":"/images/especies/Anemona-bolha.png","slug":"anemona-bolha"},{"id":"anemona-carpete","categoria":"marinho","nome_comum":"Anemona-carpete","nome_cientifico":"Stichodactyla haddoni","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":50.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Substrato inadequado, iluminação insuficiente","sinais_estresse":"Disco oral retraído, boca aberta, perda de aderência","notas":null,"foto_url":"","slug":"anemona-carpete"},{"id":"anemona-magnifica","categoria":"marinho","nome_comum":"Anemona-magnifica","nome_cientifico":"Heteractis magnifica","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":60.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário imaturo, iluminação fraca, pouca circulação","sinais_estresse":"Migração contínua, perda da expansão, coloração desbotada","notas":null,"foto_url":"","slug":"anemona-magnifica"},{"id":"polvo-anao","categoria":"marinho","nome_comum":"Polvo-anao","nome_cientifico":"Octopus joubini","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":10.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Aquário sem tampa, poucos esconderijos, companheiros inadequados","sinais_estresse":"Tentativas de fuga, perda do apetite, coloração escura constante","notas":null,"foto_url":"","slug":"polvo-anao"},{"id":"estrela-quebra-braco","categoria":"marinho","nome_comum":"Estrela-quebra-braco","nome_cientifico":"Ophiarachna incrassata","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Falta de alimento, aquário pequeno","sinais_estresse":"Permanecer escondida, perda de braços, pouca atividade","notas":null,"foto_url":"","slug":"estrela-quebra-braco"},{"id":"caranguejo-emerald","categoria":"marinho","nome_comum":"Caranguejo-emerald","nome_cientifico":"Mithraculus sculptus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Pouca oferta de algas, aquário pequeno","sinais_estresse":"Mordiscar corais, pouca atividade, emagrecimento","notas":null,"foto_url":"","slug":"caranguejo-emerald"},{"id":"caranguejo-porcelana","categoria":"marinho","nome_comum":"Caranguejo-porcelana","nome_cientifico":"Neopetrolisthes maculatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":3.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Correnteza insuficiente, ausência de anêmona hospedeira","sinais_estresse":"Permanecer escondido, pouca alimentação, perda de atividade","notas":null,"foto_url":"","slug":"caranguejo-porcelana"},{"id":"lagosta-arlequim","categoria":"marinho","nome_comum":"Lagosta-arlequim","nome_cientifico":"Panulirus versicolor","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, poucas cavernas, alimentação insuficiente","sinais_estresse":"Falhas na muda, agressividade, perda de apetite","notas":null,"foto_url":"","slug":"lagosta-arlequim"},{"id":"vieira-flame","categoria":"marinho","nome_comum":"Vieira-flame","nome_cientifico":"Ctenoides ales","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pobre em fitoplâncton, baixa circulação","sinais_estresse":"Fechamento prolongado da concha, pouca resposta ao estímulo","notas":null,"foto_url":"","slug":"vieira-flame"},{"id":"ostra-tridacna","categoria":"marinho","nome_comum":"Ostra-tridacna","nome_cientifico":"Tridacna maxima","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":200.0,"tamanho_adulto":20.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Iluminação insuficiente, cálcio baixo, pouca estabilidade","sinais_estresse":"Manto retraído, perda de coloração, fechamento frequente","notas":null,"foto_url":"","slug":"ostra-tridacna"},{"id":"tridacna-derasa","categoria":"marinho","nome_comum":"Tridacna-derasa","nome_cientifico":"Tridacna derasa","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":40.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Oscilações de alcalinidade, baixa iluminação","sinais_estresse":"Manto pouco expandido, crescimento reduzido","notas":null,"foto_url":"/images/especies/Tridacna-derasa.jpg","slug":"tridacna-derasa"},{"id":"feather-duster","categoria":"marinho","nome_comum":"Feather-duster","nome_cientifico":"Sabellastarte spectabilis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":10.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Correnteza intensa, falta de alimento particulado","sinais_estresse":"Permanecer recolhido, perda da coroa filtradora","notas":null,"foto_url":"","slug":"feather-duster"},{"id":"peixe-esquilo","categoria":"marinho","nome_comum":"Peixe-esquilo","nome_cientifico":"Sargocentron diadema","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":17.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Iluminação intensa, poucos esconderijos","sinais_estresse":"Permanecer escondido durante todo o dia, perda da coloração","notas":null,"foto_url":"","slug":"peixe-esquilo"},{"id":"peixe-cardeal-listrado","categoria":"marinho","nome_comum":"Peixe-cardeal-listrado","nome_cientifico":"Apogon cyanosoma","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":8.0,"temperamento":"pacifico","cardume_min":3.0,"erros_comuns":"Poucos esconderijos, grupo incompatível","sinais_estresse":"Isolamento, pouca alimentação, respiração acelerada","notas":null,"foto_url":"","slug":"peixe-cardeal-listrado"},{"id":"peixe-donzela-talbot","categoria":"marinho","nome_comum":"Peixe-donzela-talbot","nome_cientifico":"Chrysiptera talboti","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":100.0,"tamanho_adulto":6.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, pouca estrutura rochosa","sinais_estresse":"Territorialismo excessivo, perda das cores","notas":null,"foto_url":"","slug":"peixe-donzela-talbot"},{"id":"peixe-sargento","categoria":"marinho","nome_comum":"Peixe-sargento","nome_cientifico":"Abudefduf saxatilis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":300.0,"tamanho_adulto":15.0,"temperamento":"agressivo","cardume_min":1.0,"erros_comuns":"Espaço reduzido, superlotação","sinais_estresse":"Agressividade, perseguições constantes","notas":null,"foto_url":"/images/especies/Peixe-sargento.png","slug":"peixe-sargento"},{"id":"peixe-frade","categoria":"marinho","nome_comum":"Peixe-frade","nome_cientifico":"Holacanthus ciliaris","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":800.0,"tamanho_adulto":45.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, dieta pobre em esponjas","sinais_estresse":"Emagrecimento, perda das cores, pouca atividade","notas":null,"foto_url":"","slug":"peixe-frade"},{"id":"peixe-borboleta-bandeira","categoria":"marinho","nome_comum":"Peixe-borboleta-bandeira","nome_cientifico":"Heniochus acuminatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":25.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Aquário imaturo, alimentação insuficiente","sinais_estresse":"Abdômen retraído, perda da coloração, isolamento","notas":null,"foto_url":"","slug":"peixe-borboleta-bandeira"},{"id":"peixe-gobi-yasha","categoria":"marinho","nome_comum":"Peixe-gobi-yasha","nome_cientifico":"Stonogobiops yasha","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":80.0,"tamanho_adulto":5.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Falta de camarão-pistola, poucos esconderijos","sinais_estresse":"Permanecer escondido, perda do apetite","notas":null,"foto_url":"","slug":"peixe-gobi-yasha"},{"id":"peixe-gobi-esponja","categoria":"marinho","nome_comum":"Peixe-gobi-esponja","nome_cientifico":"Gobiodon okinawae","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":60.0,"tamanho_adulto":3.5,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Ausência de corais ramificados, peixes agressivos","sinais_estresse":"Isolamento, pouca atividade, coloração opaca","notas":null,"foto_url":"","slug":"peixe-gobi-esponja"},{"id":"peixe-vermelho-bigeye","categoria":"marinho","nome_comum":"Peixe-vermelho-bigeye","nome_cientifico":"Priacanthus hamrur","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":600.0,"tamanho_adulto":40.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Iluminação intensa, poucos refúgios","sinais_estresse":"Permanecer escondido, olhos opacos, pouca alimentação","notas":null,"foto_url":"","slug":"peixe-vermelho-bigeye"},{"id":"peixe-morcego","categoria":"marinho","nome_comum":"Peixe-morcego","nome_cientifico":"Platax orbicularis","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":1000.0,"tamanho_adulto":50.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação insuficiente","sinais_estresse":"Emagrecimento, coloração apagada, respiração acelerada","notas":null,"foto_url":"","slug":"peixe-morcego"},{"id":"peixe-lima","categoria":"marinho","nome_comum":"Peixe-lima","nome_cientifico":"Oxymonacanthus longirostris","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":150.0,"tamanho_adulto":10.0,"temperamento":"pacifico","cardume_min":2.0,"erros_comuns":"Ausência de corais SPS, dieta inadequada","sinais_estresse":"Recusa alimentar, emagrecimento rápido","notas":null,"foto_url":"","slug":"peixe-lima"},{"id":"peixe-cofre","categoria":"marinho","nome_comum":"Peixe-cofre","nome_cientifico":"Lactoria cornuta","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":46.0,"temperamento":"pacifico","cardume_min":1.0,"erros_comuns":"Estresse intenso, captura inadequada, aquário pequeno","sinais_estresse":"Escurecimento, pouca atividade, perda do apetite","notas":null,"foto_url":"/images/especies/Peixe-cofre.png","slug":"peixe-cofre"},{"id":"peixe-pedra-sinuca","categoria":"marinho","nome_comum":"Peixe-pedra-sinuca","nome_cientifico":"Choerodon fasciatus","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"kh_min":null,"kh_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"luz":null,"fluxo":null,"cuidado":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"volume_min":400.0,"tamanho_adulto":25.0,"temperamento":"semi_agressivo","cardume_min":1.0,"erros_comuns":"Aquário pequeno, alimentação insuficiente","sinais_estresse":"Escurecimento, agressividade, emagrecimento","notas":null,"foto_url":"","slug":"peixe-pedra-sinuca"},{"id":"zoanthus","categoria":"coral","nome_comum":"Zoanthus","nome_cientifico":"Zoanthus sp.","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Atenção à presença de algas entre os pólipos. Evite manipular sem luvas devido à possível presença de palitoxina. Fluxo moderado e iluminação média favorecem boa expansão.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Zoanthus.png","slug":"zoanthus"},{"id":"palythoa","categoria":"coral","nome_comum":"Palythoa","nome_cientifico":"Palythoa sp.","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Produz grandes quantidades de palitoxina. Nunca cortar ou remover fora d'água. Crescimento rápido pode sufocar outros corais.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Palythoa.png","slug":"palythoa"},{"id":"coral-cogumelo","categoria":"coral","nome_comum":"Coral-cogumelo","nome_cientifico":"Discosoma sp.","tipo_coral":"mole","luz":"baixa","fluxo":"baixo","kh_min":7.0,"kh_max":11.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Pode multiplicar-se rapidamente. Não gosta de iluminação muito intensa. Evite colocá-lo próximo de SPS.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-cogumelo"},{"id":"ricordea-florida","categoria":"coral","nome_comum":"Ricordea-florida","nome_cientifico":"Ricordea florida","tipo_coral":"mole","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Fluxo suave a moderado. Evite iluminação muito forte nas primeiras semanas. Alimentação ocasional acelera o crescimento.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Ricordea-florida.png","slug":"ricordea-florida"},{"id":"ricordea-yuma","categoria":"coral","nome_comum":"Ricordea-yuma","nome_cientifico":"Ricordea yuma","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"avancado","notas":"Mais sensível que a Florida. Mudanças bruscas de iluminação frequentemente levam ao derretimento (\"melting\").","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"ricordea-yuma"},{"id":"coral-couro","categoria":"coral","nome_comum":"Coral-couro","nome_cientifico":"Sarcophyton sp.","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":7.0,"kh_max":11.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Passa por períodos naturais de fechamento durante a troca da camada externa. Fluxo moderado ajuda na remoção da mucosa.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-couro"},{"id":"coral-dedo","categoria":"coral","nome_comum":"Coral-dedo","nome_cientifico":"Sinularia sp.","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":7.0,"kh_max":11.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Libera compostos químicos (guerra química). Utilizar carvão ativado ajuda em aquários mistos.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-dedo"},{"id":"xenia-pulsante","categoria":"coral","nome_comum":"Xenia-pulsante","nome_cientifico":"Xenia sp.","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":7.0,"kh_max":10.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Muito sensível a oscilações de alcalinidade e iodo. Pode crescer rapidamente e tornar-se invasiva.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Xenia-pulsante.png","slug":"xenia-pulsante"},{"id":"coral-estrela","categoria":"coral","nome_comum":"Coral-estrela","nome_cientifico":"Pachyclavularia violacea","tipo_coral":"mole","luz":"media","fluxo":"medio","kh_min":7.0,"kh_max":11.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Crescimento extremamente rápido. Isolar em ilhas de rocha evita que cubra outros corais.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-estrela"},{"id":"kenya-tree","categoria":"coral","nome_comum":"Kenya-tree","nome_cientifico":"Capnella sp.","tipo_coral":"mole","luz":"baixa","fluxo":"baixo","kh_min":7.0,"kh_max":11.0,"calcio_min":380.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"iniciante","notas":"Propaga-se facilmente por fragmentação natural. Remover mudas evita invasão do layout.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Kenya-tree.png","slug":"kenya-tree"},{"id":"coral-sol","categoria":"coral","nome_comum":"Coral-sol","nome_cientifico":"Tubastraea sp.","tipo_coral":"LPS-nao-foto","luz":"baixa","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1250.0,"magnesio_max":1350.0,"no3_max":15.0,"fosfato_max":0.15,"cuidado":"avancado","notas":"Não depende de luz, mas exige alimentação manual frequente (3–5 vezes por semana). Não indicado para iniciantes.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-sol"},{"id":"euphyllia-martelo","categoria":"coral","nome_comum":"Euphyllia-martelo","nome_cientifico":"Euphyllia ancora","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":8.0,"fosfato_max":0.08,"cuidado":"intermediario","notas":"Tentáculos urticantes longos. Manter distância mínima de 15–20 cm de outros corais. Fluxo indireto.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Euphyllia-martelo.png","slug":"euphyllia-martelo"},{"id":"euphyllia-tocha","categoria":"coral","nome_comum":"Euphyllia-tocha","nome_cientifico":"Euphyllia glabrescens","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":8.0,"fosfato_max":0.08,"cuidado":"intermediario","notas":"Possui alguns dos tentáculos de ataque mais longos entre os LPS. Evite contato com SPS e outros LPS.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"euphyllia-tocha"},{"id":"euphyllia-frogspawn","categoria":"coral","nome_comum":"Euphyllia-frogspawn","nome_cientifico":"Euphyllia divisa","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":8.0,"fosfato_max":0.08,"cuidado":"intermediario","notas":"Pode conviver com outras Euphyllias da mesma linhagem. Fluxo excessivo causa retração dos pólipos.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"euphyllia-frogspawn"},{"id":"coral-cerebro","categoria":"coral","nome_comum":"Coral-cerebro","nome_cientifico":"Trachyphyllia geoffroyi","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Deve permanecer sobre areia, nunca apoiado em rochas afiadas. Alimentação noturna favorece crescimento.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Coral-cerebro.png","slug":"coral-cerebro"},{"id":"coral-cerebro-lobo","categoria":"coral","nome_comum":"Coral-cerebro-lobo","nome_cientifico":"Lobophyllia hemprichii","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Expande tentáculos alimentares à noite. Necessita espaço devido aos tentáculos urticantes.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"coral-cerebro-lobo"},{"id":"favia","categoria":"coral","nome_comum":"Favia","nome_cientifico":"Favia sp.","tipo_coral":"LPS","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Produz tentáculos varredores (\"sweeper tentacles\") que podem ultrapassar 10 cm durante a noite.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Favia.png","slug":"favia"},{"id":"acanthastrea","categoria":"coral","nome_comum":"Acanthastrea","nome_cientifico":"Acanthastrea lordhowensis","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Alimentação direcionada melhora muito o crescimento. Evitar iluminação excessiva.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Acanthastrea.png","slug":"acanthastrea"},{"id":"duncanopsammia","categoria":"coral","nome_comum":"Duncanopsammia","nome_cientifico":"Duncanopsammia axifuga","tipo_coral":"LPS","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Coral resistente e excelente para iniciantes. Aceita alimentação direta com facilidade.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"duncanopsammia"},{"id":"blastomussa","categoria":"coral","nome_comum":"Blastomussa","nome_cientifico":"Blastomussa wellsi","tipo_coral":"LPS","luz":"baixa","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Fluxo suave. Evite luz intensa. Muito sensível à sedimentação.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Blastomussa.png","slug":"blastomussa"},{"id":"fungia","categoria":"coral","nome_comum":"Fungia","nome_cientifico":"Fungia sp.","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Coral livre sobre areia. Nunca fixar na rocha. Pode mover-se lentamente em busca de melhor posição.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"fungia"},{"id":"plerogyra-bolha","categoria":"coral","nome_comum":"Plerogyra-bolha","nome_cientifico":"Plerogyra sinuosa","tipo_coral":"LPS","luz":"baixa","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"intermediario","notas":"Bolhas são extremamente delicadas. Fluxo forte pode romper os tecidos.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"plerogyra-bolha"},{"id":"catalaphyllia","categoria":"coral","nome_comum":"Catalaphyllia","nome_cientifico":"Catalaphyllia jardinei","tipo_coral":"LPS","luz":"media","fluxo":"baixo","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":8.0,"fosfato_max":0.08,"cuidado":"avancado","notas":"Muito sensível ao transporte. Deve permanecer sobre areia. Evitar contato com outros corais.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"catalaphyllia"},{"id":"goniopora","categoria":"coral","nome_comum":"Goniopora","nome_cientifico":"Goniopora sp.","tipo_coral":"LPS","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"avancado","notas":"Espécie exigente. Necessita nutrientes disponíveis, alimentação complementar e parâmetros extremamente estáveis.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Goniopora.png","slug":"goniopora"},{"id":"alveopora","categoria":"coral","nome_comum":"Alveopora","nome_cientifico":"Alveopora sp.","tipo_coral":"LPS","luz":"media","fluxo":"medio","kh_min":8.0,"kh_max":11.0,"calcio_min":400.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":10.0,"fosfato_max":0.1,"cuidado":"avancado","notas":"Mais resistente que Goniopora, porém também aprecia alimentação particulada e fluxo moderado.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Alveopora.png","slug":"alveopora"},{"id":"acropora","categoria":"coral","nome_comum":"Acropora","nome_cientifico":"Acropora sp.","tipo_coral":"SPS","luz":"alta","fluxo":"forte","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"especialista","notas":"Exige iluminação intensa, fluxo forte e parâmetros extremamente estáveis. Muito sensível à queda de alcalinidade e temperatura.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Gramma-royal.png","slug":"acropora"},{"id":"montipora-digitata","categoria":"coral","nome_comum":"Montipora-digitata","nome_cientifico":"Montipora digitata","tipo_coral":"SPS","luz":"alta","fluxo":"forte","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"avancado","notas":"SPS relativamente resistente. Crescimento rápido em sistemas estáveis. Atenção ao ataque de nudibrânquios.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Acropora.png","slug":"montipora-digitata"},{"id":"montipora-capricornis","categoria":"coral","nome_comum":"Montipora-capricornis","nome_cientifico":"Montipora capricornis","tipo_coral":"SPS","luz":"alta","fluxo":"medio","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"avancado","notas":"Crescimento em placas pode sombrear outros corais. Fluxo moderado a forte.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"montipora-capricornis"},{"id":"stylophora","categoria":"coral","nome_comum":"Stylophora","nome_cientifico":"Stylophora pistillata","tipo_coral":"SPS","luz":"alta","fluxo":"forte","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"avancado","notas":"Boa opção para iniciar em SPS. Necessita estabilidade de cálcio, magnésio e alcalinidade.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"stylophora"},{"id":"pocillopora","categoria":"coral","nome_comum":"Pocillopora","nome_cientifico":"Pocillopora damicornis","tipo_coral":"SPS","luz":"alta","fluxo":"forte","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"avancado","notas":"Pode liberar pequenas colônias espontaneamente (\"planulação\"). Atenção ao sombreamento.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"pocillopora"},{"id":"seriatopora","categoria":"coral","nome_comum":"Seriatopora","nome_cientifico":"Seriatopora hystrix","tipo_coral":"SPS","luz":"alta","fluxo":"forte","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"especialista","notas":"Muito sensível a oscilações de KH. Fluxo turbulento favorece crescimento uniforme.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"","slug":"seriatopora"},{"id":"porites","categoria":"coral","nome_comum":"Porites","nome_cientifico":"Porites sp.","tipo_coral":"SPS","luz":"alta","fluxo":"medio","kh_min":8.0,"kh_max":9.5,"calcio_min":420.0,"calcio_max":450.0,"magnesio_min":1300.0,"magnesio_max":1400.0,"no3_max":5.0,"fosfato_max":0.06,"cuidado":"especialista","notas":"Crescimento lento. Excelente indicador da estabilidade de longo prazo do aquário.","temp_min":24.0,"temp_max":27.0,"ph_min":8.1,"ph_max":8.4,"salinidade_min":1.023,"salinidade_max":1.026,"gh_min":null,"gh_max":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"posicao_planta":null,"co2":null,"dificuldade":null,"ambiente":null,"foto_url":"/images/especies/Porites.png","slug":"porites"},{"id":"anubias-barteri","categoria":"planta","nome_comum":"Anubias-barteri","nome_cientifico":"Anubias barteri","posicao_planta":"meio","luz":"baixa","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Nunca enterrar o rizoma. Fixar em troncos ou rochas. Crescimento lento favorece o aparecimento de algas nas folhas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"anubias-barteri"},{"id":"anubias-nana","categoria":"planta","nome_comum":"Anubias-nana","nome_cientifico":"Anubias barteri var. nana","posicao_planta":"frente","luz":"baixa","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Ideal para primeiro plano. Evitar iluminação excessiva para reduzir algas. Não enterrar o rizoma.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Anubias-nana.png","slug":"anubias-nana"},{"id":"anubias-coffeefolia","categoria":"planta","nome_comum":"Anubias-coffeefolia","nome_cientifico":"Anubias barteri var. coffeefolia","posicao_planta":"meio","luz":"baixa","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Crescimento lento. Aprecia boa circulação de água. Folhas enrugadas acumulam detritos facilmente.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"anubias-coffeefolia"},{"id":"java-fern","categoria":"planta","nome_comum":"Java-fern","nome_cientifico":"Microsorum pteropus","posicao_planta":"meio","luz":"baixa","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Fixar em troncos ou pedras. Rizoma nunca deve ser enterrado. Multiplica-se pelas folhas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"java-fern"},{"id":"java-fern-windelov","categoria":"planta","nome_comum":"Java-fern-windelov","nome_cientifico":"Microsorum pteropus 'Windelov'","posicao_planta":"meio","luz":"baixa","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Mesmos cuidados da Java Fern comum. As pontas finas acumulam sujeira facilmente.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"java-fern-windelov"},{"id":"musgo-de-java","categoria":"planta","nome_comum":"Musgo-de-java","nome_cientifico":"Taxiphyllum barbieri","posicao_planta":"frente","luz":"baixa","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":5.5,"ph_max":8.0,"gh_min":3.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"aquario","notas":"Cresce rapidamente. Necessita podas frequentes para evitar acúmulo de matéria orgânica.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Musgo-de-java.png","slug":"musgo-de-java"},{"id":"musgo-christmas","categoria":"planta","nome_comum":"Musgo-christmas","nome_cientifico":"Vesicularia montagnei","posicao_planta":"frente","luz":"baixa","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Fluxo moderado favorece o formato triangular. Evitar excesso de sedimentos.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"musgo-christmas"},{"id":"bucephalandra","categoria":"planta","nome_comum":"Bucephalandra","nome_cientifico":"Bucephalandra sp.","posicao_planta":"frente","luz":"baixa","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"facil","ambiente":"aquario","notas":"Crescimento lento. Muito sensível a mudanças bruscas de iluminação e parâmetros. Não enterrar o rizoma.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Bucephalandra.png","slug":"bucephalandra"},{"id":"cryptocoryne-wendtii","categoria":"planta","nome_comum":"Cryptocoryne-wendtii","nome_cientifico":"Cryptocoryne wendtii","posicao_planta":"meio","luz":"baixa","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Pode sofrer \"Crypt Melt\" após mudanças no aquário. Normalmente rebrota se as raízes permanecerem saudáveis.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Cryptocoryne-wendtii.png","slug":"cryptocoryne-wendtii"},{"id":"cryptocoryne-parva","categoria":"planta","nome_comum":"Cryptocoryne-parva","nome_cientifico":"Cryptocoryne parva","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"medio","ambiente":"aquario","notas":"Crescimento extremamente lento. Ideal para aquários estáveis.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"cryptocoryne-parva"},{"id":"cryptocoryne-balansae","categoria":"planta","nome_comum":"Cryptocoryne-balansae","nome_cientifico":"Cryptocoryne crispatula","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"dificuldade":"medio","ambiente":"aquario","notas":"Necessita substrato fértil. Folhas longas podem sombrear outras plantas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"cryptocoryne-balansae"},{"id":"vallisneria-spiralis","categoria":"planta","nome_comum":"Vallisneria-spiralis","nome_cientifico":"Vallisneria spiralis","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"ambos","notas":"Propaga-se rapidamente por estolões. Evitar fertilização líquida rica em glutaraldeído.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Vallisneria-spiralis.png","slug":"vallisneria-spiralis"},{"id":"vallisneria-gigantea","categoria":"planta","nome_comum":"Vallisneria-gigantea","nome_cientifico":"Vallisneria americana","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":6.5,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"ambos","notas":"Crescimento muito rápido. Requer podas frequentes para evitar excesso de sombreamento.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Vallisneria-gigantea.png","slug":"vallisneria-gigantea"},{"id":"echinodorus-amazonicus","categoria":"planta","nome_comum":"Echinodorus-amazonicus","nome_cientifico":"Echinodorus amazonicus","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Planta de raiz forte. Necessita substrato nutritivo e pastilhas fertilizantes.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Echinodorus-amazonicus.png","slug":"echinodorus-amazonicus"},{"id":"echinodorus-bleheri","categoria":"planta","nome_comum":"Echinodorus-bleheri","nome_cientifico":"Echinodorus bleheri","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Grande consumidora de nutrientes. Remove rapidamente nitratos do aquário.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"echinodorus-bleheri"},{"id":"echinodorus-rubin","categoria":"planta","nome_comum":"Echinodorus-rubin","nome_cientifico":"Echinodorus 'Rubin'","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"medio","ambiente":"aquario","notas":"Para manter coloração avermelhada necessita iluminação intensa e micronutrientes adequados.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"echinodorus-rubin"},{"id":"elodea","categoria":"planta","nome_comum":"Elodea","nome_cientifico":"Egeria densa","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":15.0,"temp_max":26.0,"ph_min":6.5,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"ambos","notas":"Crescimento rápido. Excelente para absorção de nitratos. Podas frequentes são necessárias.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Elodea.png","slug":"elodea"},{"id":"cabomba","categoria":"planta","nome_comum":"Cabomba","nome_cientifico":"Cabomba caroliniana","posicao_planta":"fundo","luz":"alta","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Muito sensível à falta de CO₂ e iluminação fraca. Acumula algas facilmente.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"cabomba"},{"id":"hornwort","categoria":"planta","nome_comum":"Hornwort","nome_cientifico":"Ceratophyllum demersum","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":15.0,"temp_max":28.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"ambos","notas":"Não necessita substrato. Excelente para consumir nutrientes e combater algas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"hornwort"},{"id":"ludwigia-repens","categoria":"planta","nome_comum":"Ludwigia-repens","nome_cientifico":"Ludwigia repens","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Quanto maior a luz, mais intensa a coloração vermelha. Poda frequente estimula brotações.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"ludwigia-repens"},{"id":"ludwigia-rubin","categoria":"planta","nome_comum":"Ludwigia-rubin","nome_cientifico":"Ludwigia palustris 'Rubin'","posicao_planta":"fundo","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Exige boa fertilização e CO₂ para manter coloração intensa.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"ludwigia-rubin"},{"id":"rotala-rotundifolia","categoria":"planta","nome_comum":"Rotala-rotundifolia","nome_cientifico":"Rotala rotundifolia","posicao_planta":"fundo","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.5,"gh_min":2.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Crescimento rápido. Poda constante gera moitas densas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"rotala-rotundifolia"},{"id":"rotala-macrandra","categoria":"planta","nome_comum":"Rotala-macrandra","nome_cientifico":"Rotala macrandra","posicao_planta":"fundo","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"dificuldade":"dificil","ambiente":"aquario","notas":"Uma das plantas mais exigentes. Necessita CO₂, iluminação intensa e fertilização completa.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"rotala-macrandra"},{"id":"hygrophila-polysperma","categoria":"planta","nome_comum":"Hygrophila-polysperma","nome_cientifico":"Hygrophila polysperma","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.8,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Crescimento extremamente rápido. Excelente para aquários novos.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Hygrophila-polysperma.png","slug":"hygrophila-polysperma"},{"id":"hygrophila-difformis","categoria":"planta","nome_comum":"Hygrophila-difformis","nome_cientifico":"Hygrophila difformis","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Muito resistente. Excelente consumidora de nutrientes.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"hygrophila-difformis"},{"id":"hygrophila-corymbosa","categoria":"planta","nome_comum":"Hygrophila-corymbosa","nome_cientifico":"Hygrophila corymbosa","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Necessita podas frequentes devido ao crescimento vigoroso.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"hygrophila-corymbosa"},{"id":"bacopa-caroliniana","categoria":"planta","nome_comum":"Bacopa-caroliniana","nome_cientifico":"Bacopa caroliniana","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"aquario","notas":"Crescimento moderado. Folhas tornam-se avermelhadas sob iluminação intensa.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"/images/especies/Bacopa-caroliniana.png","slug":"bacopa-caroliniana"},{"id":"bacopa-monnieri","categoria":"planta","nome_comum":"Bacopa-monnieri","nome_cientifico":"Bacopa monnieri","posicao_planta":"meio","luz":"media","co2":"nao","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.8,"gh_min":4.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"ambos","notas":"Pouco exigente. Excelente para iniciantes.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"bacopa-monnieri"},{"id":"alternanthera-reineckii","categoria":"planta","nome_comum":"Alternanthera-reineckii","nome_cientifico":"Alternanthera reineckii","posicao_planta":"meio","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":28.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Necessita CO₂ e iluminação intensa para manter coloração vermelha intensa.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"alternanthera-reineckii"},{"id":"limnophila-sessiliflora","categoria":"planta","nome_comum":"Limnophila-sessiliflora","nome_cientifico":"Limnophila sessiliflora","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"facil","ambiente":"aquario","notas":"Crescimento muito rápido. Excelente para competir contra algas.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"limnophila-sessiliflora"},{"id":"hemianthus-callitrichoides","categoria":"planta","nome_comum":"Hemianthus-callitrichoides","nome_cientifico":"Hemianthus callitrichoides 'Cuba'","posicao_planta":"frente","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":26.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"dificuldade":"dificil","ambiente":"aquario","notas":"Exige CO₂, iluminação intensa e manutenção frequente. Sensível ao acúmulo de detritos.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"hemianthus-callitrichoides"},{"id":"glossostigma","categoria":"planta","nome_comum":"Glossostigma","nome_cientifico":"Glossostigma elatinoides","posicao_planta":"frente","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":26.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"dificuldade":"dificil","ambiente":"aquario","notas":"Precisa de muita luz e CO₂. Sem luz suficiente cresce para cima em vez de formar carpete.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"glossostigma"},{"id":"eleocharis-parvula","categoria":"planta","nome_comum":"Eleocharis-parvula","nome_cientifico":"Eleocharis parvula","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Forma carpete lentamente. Requer podas ocasionais e boa circulação.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"eleocharis-parvula"},{"id":"eleocharis-acicularis","categoria":"planta","nome_comum":"Eleocharis-acicularis","nome_cientifico":"Eleocharis acicularis","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Necessita iluminação média a forte para formar gramado uniforme.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"eleocharis-acicularis"},{"id":"marsilea-hirsuta","categoria":"planta","nome_comum":"Marsilea-hirsuta","nome_cientifico":"Marsilea hirsuta","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Carpete resistente. Crescimento mais lento que HC Cuba.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"marsilea-hirsuta"},{"id":"micranthemum-monte-carlo","categoria":"planta","nome_comum":"Micranthemum-monte-carlo","nome_cientifico":"Micranthemum tweediei","posicao_planta":"frente","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":26.0,"ph_min":5.5,"ph_max":7.0,"gh_min":2.0,"gh_max":10.0,"dificuldade":"medio","ambiente":"aquario","notas":"Excelente planta para carpete. Menos exigente que HC Cuba.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"micranthemum-monte-carlo"},{"id":"staurogyne-repens","categoria":"planta","nome_comum":"Staurogyne-repens","nome_cientifico":"Staurogyne repens","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Crescimento compacto. Necessita podas para manter formato baixo.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"staurogyne-repens"},{"id":"lilaeopsis","categoria":"planta","nome_comum":"Lilaeopsis","nome_cientifico":"Lilaeopsis brasiliensis","posicao_planta":"frente","luz":"media","co2":"opcional","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Crescimento lento. Requer boa iluminação para formar tapete.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"lilaeopsis"},{"id":"sagittaria-subulata","categoria":"planta","nome_comum":"Sagittaria-subulata","nome_cientifico":"Sagittaria subulata","posicao_planta":"frente","luz":"media","co2":"nao","temp_min":20.0,"temp_max":26.0,"ph_min":6.5,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"ambos","notas":"Propaga-se rapidamente por estolões. Pode crescer muito em pouca luz.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"sagittaria-subulata"},{"id":"pogostemon-helferi","categoria":"planta","nome_comum":"Pogostemon-helferi","nome_cientifico":"Pogostemon helferi","posicao_planta":"frente","luz":"alta","co2":"sim","temp_min":22.0,"temp_max":27.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"dificil","ambiente":"aquario","notas":"Muito sensível a deficiência de potássio. Necessita boa circulação.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"pogostemon-helferi"},{"id":"riccia-fluitans","categoria":"planta","nome_comum":"Riccia-fluitans","nome_cientifico":"Riccia fluitans","posicao_planta":"frente","luz":"alta","co2":"sim","temp_min":20.0,"temp_max":26.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":12.0,"dificuldade":"medio","ambiente":"aquario","notas":"Quando fixada em pedras necessita podas constantes para evitar desprendimento.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"riccia-fluitans"},{"id":"salvinia","categoria":"planta","nome_comum":"Salvinia","nome_cientifico":"Salvinia auriculata","posicao_planta":"flutuante","luz":"media","co2":"nao","temp_min":20.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"ambos","notas":"Planta flutuante que reduz nitratos. Evitar movimentação intensa na superfície.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"salvinia"},{"id":"pistia","categoria":"planta","nome_comum":"Pistia","nome_cientifico":"Pistia stratiotes","posicao_planta":"flutuante","luz":"media","co2":"nao","temp_min":20.0,"temp_max":30.0,"ph_min":6.5,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"dificuldade":"facil","ambiente":"ambos","notas":"Necessita boa iluminação e baixa movimentação superficial. Raízes longas servem de abrigo para alevinos.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"pistia"},{"id":"aguape","categoria":"planta","nome_comum":"Aguape","nome_cientifico":"Eichhornia crassipes","posicao_planta":"flutuante","luz":"alta","co2":"nao","temp_min":18.0,"temp_max":30.0,"ph_min":6.0,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"lago","notas":"Crescimento extremamente rápido. Excelente para lagos. Necessita controle para evitar sombreamento excessivo.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"aguape"},{"id":"lentilha-dagua","categoria":"planta","nome_comum":"Lentilha-dagua","nome_cientifico":"Lemna minor","posicao_planta":"flutuante","luz":"media","co2":"nao","temp_min":15.0,"temp_max":30.0,"ph_min":6.0,"ph_max":8.0,"gh_min":4.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"ambos","notas":"Multiplica-se rapidamente. Pode bloquear completamente a luz do aquário ou lago.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"lentilha-dagua"},{"id":"nymphaea-lotus","categoria":"planta","nome_comum":"Nymphaea-lotus","nome_cientifico":"Nymphaea lotus","posicao_planta":"fundo","luz":"media","co2":"opcional","temp_min":22.0,"temp_max":28.0,"ph_min":6.0,"ph_max":7.5,"gh_min":3.0,"gh_max":15.0,"dificuldade":"medio","ambiente":"ambos","notas":"Pode emitir folhas flutuantes rapidamente. Podas controlam o sombreamento.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"nymphaea-lotus"},{"id":"vitoria-regia","categoria":"planta","nome_comum":"Vitoria-regia","nome_cientifico":"Victoria amazonica","posicao_planta":"flutuante","luz":"alta","co2":"nao","temp_min":24.0,"temp_max":32.0,"ph_min":6.0,"ph_max":7.5,"gh_min":4.0,"gh_max":15.0,"dificuldade":"dificil","ambiente":"lago","notas":"Exclusiva para lagos grandes. Necessita sol pleno e muito espaço.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"vitoria-regia"},{"id":"ninfeia","categoria":"planta","nome_comum":"Ninfeia","nome_cientifico":"Nymphaea sp.","posicao_planta":"fundo","luz":"alta","co2":"nao","temp_min":15.0,"temp_max":28.0,"ph_min":6.5,"ph_max":7.5,"gh_min":5.0,"gh_max":18.0,"dificuldade":"facil","ambiente":"lago","notas":"Excelente para lagos. Retirar folhas velhas reduz matéria orgânica.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"ninfeia"},{"id":"papiro","categoria":"planta","nome_comum":"Papiro","nome_cientifico":"Cyperus papyrus","posicao_planta":"marginal","luz":"alta","co2":"nao","temp_min":18.0,"temp_max":30.0,"ph_min":6.5,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"lago","notas":"Planta marginal. Não deve permanecer totalmente submersa. Excelente para filtragem biológica em lagos.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"papiro"},{"id":"elodea-densa-lago","categoria":"planta","nome_comum":"Elodea-densa-lago","nome_cientifico":"Egeria najas","posicao_planta":"fundo","luz":"media","co2":"nao","temp_min":15.0,"temp_max":26.0,"ph_min":6.5,"ph_max":8.0,"gh_min":5.0,"gh_max":20.0,"dificuldade":"facil","ambiente":"lago","notas":"Oxigenadora natural. Crescimento rápido. Excelente para lagos ornamentais.","kh_min":null,"kh_max":null,"salinidade_min":null,"salinidade_max":null,"calcio_min":null,"calcio_max":null,"magnesio_min":null,"magnesio_max":null,"no3_max":null,"fosfato_max":null,"tipo_coral":null,"fluxo":null,"cuidado":null,"volume_min":null,"tamanho_adulto":null,"temperamento":null,"cardume_min":null,"erros_comuns":null,"sinais_estresse":null,"foto_url":"","slug":"elodea-densa-lago"}];
const _INCOMPATS = [{"especie_a":"Betta","especie_b":"Barbo-sumatra","gravidade":"critico","motivo":"O Barbo-sumatra belisca nadadeiras longas. O Betta, lento e de nadadeira ampla, é alvo fácil — acaba mutilado."},{"especie_a":"Neon-cardinal","especie_b":"Acara-bandeira","gravidade":"alerta","motivo":"O Acará-bandeira adulto come Neons. Convivem enquanto o bandeira é jovem — e um dia o cardume some."},{"especie_a":"Betta","especie_b":"Guppy","gravidade":"alerta","motivo":"O Betta ataca o Guppy macho, confundindo a cauda colorida com outro Betta."},{"especie_a":"Camarao-red-cherry","especie_b":"Acara-bandeira","gravidade":"alerta","motivo":"Qualquer ciclídeo médio come camarão. É alimento, não companheiro."},{"especie_a":"Kinguio","especie_b":"Acara-disco","gravidade":"critico","motivo":"Água fria x água quente. Um dos dois vive fora da faixa — os dois sofrem."},{"especie_a":"Cirurgiao-amarelo","especie_b":"Cirurgiao-amarelo","gravidade":"alerta","motivo":"Dois cirurgiões da mesma espécie brigam por território até um morrer, salvo em aquário muito grande."},{"especie_a":"Peixe-leao","especie_b":"Camarao-limpador","gravidade":"critico","motivo":"O peixe-leão come qualquer coisa que caiba na boca. O camarão cabe."},{"especie_a":"Anjo-imperador","especie_b":"Acropora","gravidade":"alerta","motivo":"Anjos grandes beliscam corais. Num reef, é questão de tempo."},{"especie_a":"Betta","especie_b":"Barbo-sumatra","gravidade":"critico","motivo":"O Barbo-sumatra belisca nadadeiras longas. O Betta acaba mutilado e sob estresse constante."},{"especie_a":"Betta","especie_b":"Acará-bandeira","gravidade":"alerta","motivo":"Ambos possuem nadadeiras longas e podem disputar território, resultando em agressões mútuas."},{"especie_a":"Betta","especie_b":"Gurami-azul","gravidade":"alerta","motivo":"São peixes territoriais e reconhecem um ao outro como rivais. As disputas são frequentes."},{"especie_a":"Neon-cardinal","especie_b":"Oscar","gravidade":"critico","motivo":"O Oscar enxerga o Neon apenas como alimento. Predação inevitável."},{"especie_a":"Neon-cardinal","especie_b":"Jack Dempsey","gravidade":"critico","motivo":"Grande diferença de porte. Os tetras são rapidamente predados."},{"especie_a":"Ramirezi","especie_b":"Ciclídeos Africanos (Mbunas)","gravidade":"critico","motivo":"Exigem parâmetros de água completamente diferentes (água ácida vs. alcalina). Além disso, os Mbunas intimidam e atacam os Ramirezis."},{"especie_a":"Acará-disco","especie_b":"Ciclídeo Yellow","gravidade":"critico","motivo":"Além da diferença de parâmetros, o Yellow é muito mais agressivo e competitivo."},{"especie_a":"Acará-disco","especie_b":"Oscar","gravidade":"critico","motivo":"O Oscar domina o ambiente e estressa constantemente os Discos."},{"especie_a":"Coridoras","especie_b":"Botia-palhaço","gravidade":"atencao","motivo":"Competem pelo mesmo espaço e alimento no fundo. Em aquários pequenos pode haver estresse."},{"especie_a":"Otocinclus","especie_b":"Oscar","gravidade":"alerta","motivo":"O Oscar pode atacar ou engolir os Otocinclus durante a noite."},{"especie_a":"Ancistrus","especie_b":"Acará-disco","gravidade":"atencao","motivo":"Em situações de fome, o Ancistrus pode aderir ao muco dos Discos, causando lesões."},{"especie_a":"Camarão Red Cherry","especie_b":"Barbo-sumatra","gravidade":"critico","motivo":"Os camarões tornam-se alimento rapidamente."},{"especie_a":"Camarão Amano","especie_b":"Oscar","gravidade":"critico","motivo":"Predação praticamente garantida."},{"especie_a":"Caramujo Neritina","especie_b":"Baiacu Valentini","gravidade":"critico","motivo":"Baiacus desgastam os dentes consumindo moluscos. A Neritina dificilmente sobrevive."},{"especie_a":"Ampulária","especie_b":"Botia-palhaço","gravidade":"critico","motivo":"Botias quebram facilmente a concha para consumir o molusco."},{"especie_a":"Camarão Crystal Red","especie_b":"Barbo-sumatra","gravidade":"critico","motivo":"Os camarões são caçados continuamente."},{"especie_a":"Acropora","especie_b":"Euphyllia Tocha","gravidade":"alerta","motivo":"Os tentáculos urticantes da Euphyllia queimam os tecidos da Acropora."},{"especie_a":"Favia","especie_b":"Zoanthus","gravidade":"atencao","motivo":"Durante a noite, os tentáculos varredores da Favia queimam os Zoanthus próximos."},{"especie_a":"Palythoa","especie_b":"Acropora","gravidade":"atencao","motivo":"Crescimento invasivo e competição química reduzem o crescimento da Acropora."},{"especie_a":"Sarcophyton","especie_b":"SPS (Acropora, Montipora, Stylophora)","gravidade":"alerta","motivo":"Liberação de compostos alelopáticos prejudica a expansão e crescimento dos SPS."},{"especie_a":"Xenia","especie_b":"Zoanthus","gravidade":"atencao","motivo":"A Xenia cresce rapidamente e pode cobrir completamente os Zoanthus."},{"especie_a":"Coral-estrela (GSP)","especie_b":"Montipora","gravidade":"atencao","motivo":"O GSP invade a base da Montipora e impede seu crescimento."},{"especie_a":"Peixe-palhaço Maroon","especie_b":"Firefish","gravidade":"alerta","motivo":"O Maroon é extremamente territorial e frequentemente mata Firefish em aquários pequenos."},{"especie_a":"Donzela Azul","especie_b":"Gobi Neon","gravidade":"alerta","motivo":"A Donzela domina o território e impede o Goby de se alimentar."},{"especie_a":"Cirurgião Branco","especie_b":"Cirurgião Amarelo","gravidade":"alerta","motivo":"Dois cirurgiões territoriais disputam espaço e alimento, especialmente em aquários menores que 600 L."},{"especie_a":"Foxface","especie_b":"Coral LPS pequeno (Acanthastrea, Blastomussa)","gravidade":"atencao","motivo":"Em deficiência alimentar, pode mordiscar pólipos de corais."},{"especie_a":"Camarão Limpador","especie_b":"Peixe-leão","gravidade":"critico","motivo":"O camarão torna-se presa do Peixe-leão."},{"especie_a":"Camarão Arlequim","especie_b":"Estrela-do-mar Linckia","gravidade":"critico","motivo":"O Camarão Arlequim alimenta-se exclusivamente de estrelas-do-mar, consumindo a Linckia."},{"especie_a":"Camarão Pistola","especie_b":"Camarão Red Cherry","gravidade":"atencao","motivo":"Em espaços reduzidos, o Pistola pode capturar pequenos camarões ornamentais."},{"especie_a":"Moreia Floco-de-Neve","especie_b":"Cardinal Banggai","gravidade":"critico","motivo":"Durante a noite, a Moreia pode capturar peixes pequenos que dormem próximos ao substrato."}];
console.log("[dados] " + _ESPECIES.length + " espécies | " + _INCOMPATS.length + " incompatibilidades");

// CORS — permitir domínio próprio (com e sem www) e Railway
app.use((req, res, next) => {
  const allowed = [
    "https://aqualifeaquarismo.com",
    "https://www.aqualifeaquarismo.com",
    "https://app.aqualifeaquarismo.com",
    "http://aqualifeaquarismo.com",
    "http://www.aqualifeaquarismo.com",
    "https://aqualife-os-production.up.railway.app",
  ];
  const origin = req.headers.origin;
  if (!origin || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../public")));



// ============================================================
// ENCICLOPÉDIA — ESPÉCIES (público, sem login)
// ============================================================
// Dados embutidos directamente — sem dependência de ficheiros externos

app.get("/api/especies", (req, res) => {
  const { cat, q, limit } = req.query;
  let lista = _ESPECIES;
  if (cat)   lista = lista.filter(e => e.categoria === cat);
  if (q)     lista = lista.filter(e =>
    e.nome_comum?.toLowerCase().includes(q.toLowerCase()) ||
    e.nome_cientifico?.toLowerCase().includes(q.toLowerCase())
  );
  const lim = parseInt(limit) || 300;
  res.json(lista.slice(0, lim).map(e => ({
    id: e.id, categoria: e.categoria,
    nome_comum: e.nome_comum, nome_cientifico: e.nome_cientifico,
    temperamento: e.temperamento, volume_min: e.volume_min,
    tamanho_adulto: e.tamanho_adulto,
    temp_min: e.temp_min, temp_max: e.temp_max,
    ph_min: e.ph_min, ph_max: e.ph_max,
    dificuldade: e.dificuldade,
    foto_url: e.foto_url || "",
    slug: e.slug || e.id,
  })));
});

app.get("/api/especies/:id", (req, res) => {
  const e = _ESPECIES.find(x => x.id === req.params.id);
  if (!e) return res.status(404).json({ erro: "Espécie não encontrada." });
  const incompats = _INCOMPATS.filter(i =>
    i.especie_a?.toLowerCase() === e.nome_comum?.toLowerCase() ||
    i.especie_b?.toLowerCase() === e.nome_comum?.toLowerCase()
  );
  res.json({ ...e, incompatibilidades: incompats });
});


app.get("/api/especies/slug/:slug", (req, res) => {
  const e = _ESPECIES.find(x => x.slug === req.params.slug);
  if (!e) return res.status(404).json({ erro: "Espécie não encontrada." });
  const incompats = _INCOMPATS.filter(i =>
    i.especie_a?.toLowerCase() === e.nome_comum?.toLowerCase() ||
    i.especie_b?.toLowerCase() === e.nome_comum?.toLowerCase()
  );
  res.json({ ...e, incompatibilidades: incompats });
});

app.get("/api/incompatibilidades", (req, res) => {
  res.json(_INCOMPATS);
});

// ============================================================
// REDIRECT www → sem www
// ============================================================
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (host.startsWith("www.")) {
    return res.redirect(301, `https://aqualifeaquarismo.com${req.url}`);
  }
  next();
});

// ============================================================
// SAÚDE
// ============================================================
app.get("/api/saude", (_, res) =>
  res.json({ ok: true, ruleset: RULESET_VERSION, ia: Boolean(IA_KEY), db: "railway-pg" })
);

// ============================================================
// LOGIN
// ============================================================
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "e-mail e senha obrigatórios" });

  try {
    const r = await query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.senha_hash,
              o.name as org_nome
       FROM app_user u
       JOIN organization o ON o.id = u.organization_id
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase().trim()]
    );
    const u = r.rows[0];
    if (!u) return res.status(401).json({ erro: "e-mail ou senha incorretos" });

    const ok = await verificarSenha(senha, u.senha_hash);
    if (!ok) return res.status(401).json({ erro: "e-mail ou senha incorretos" });

    const token = gerarToken({ id: u.id, role: u.role, org: u.organization_id });
    res.json({
      token,
      usuario: {
        id: u.id, name: u.name, email: u.email, role: u.role,
        organization_id: u.organization_id,
        organization: { name: u.org_nome },
      },
    });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.get("/api/eu", exigeLogin, async (req, res) => {
  const r = await query(
    `SELECT u.id, u.name, u.email, u.role, u.organization_id, o.name as org_nome
     FROM app_user u JOIN organization o ON o.id=u.organization_id WHERE u.id=$1`,
    [req.usuario.id]
  );
  const u = r.rows[0];
  res.json({ ...u, organization: { name: u.org_nome } });
});

// ============================================================
// TÉCNICO — lista aquários que pode atender
// ============================================================
app.get("/api/tecnico/aquarios", exigeLogin, async (req, res) => {
  if (!["tecnico", "admin", "gestor", "aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  try {
    // Admin/gestor vê tudo; técnico vê pelos clientes da sua organização
    const r = await query(
      `SELECT a.id, a.label, a.water_type, a.volume_liters,
              o.name as org_nome, l.city
       FROM asset a
       JOIN organization o ON o.id = a.organization_id
       LEFT JOIN location l ON l.id = a.location_id
       ORDER BY o.name, a.label`,
      []
    );
    res.json(r.rows.map(row => ({
      id: row.id, label: row.label, water_type: row.water_type,
      volume_liters: row.volume_liters,
      organization: { name: row.org_nome },
      city: row.city,
    })));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// TÉCNICO — registrar visita (★ MOTOR RECALCULA NO SERVIDOR)
// ============================================================
app.post("/api/visita", exigeLogin, async (req, res) => {
  if (!["tecnico", "admin", "gestor", "aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  const { asset_id, valores, observacao, client_id, service_order_id } = req.body;
  if (!asset_id || !valores)
    return res.status(400).json({ erro: "asset_id e valores são obrigatórios" });

  try {
    const aRes = await query(
      "SELECT id, water_type, organization_id, label FROM asset WHERE id=$1",
      [asset_id]
    );
    const asset = aRes.rows[0];
    if (!asset) return res.status(404).json({ erro: "aquário não encontrado" });

    // ★ o servidor decide — ignora qualquer nota que viesse do app
    let diag;
    try {
      diag = diagnosticar(valores, asset.water_type);
    } catch (e) {
      return res.status(400).json({ erro: "medição inválida: " + e.message });
    }

    // client_id é UUID do cliente para evitar duplicata offline
    const r = await query(
      `INSERT INTO reading
         (asset_id, organization_id, service_order_id, technician_id,
          source, values, health_score, urgency, confidence, diagnostico,
          ruleset_version, client_id, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        asset_id, asset.organization_id, service_order_id || null,
        req.usuario.id,
        req.usuario.role === "aquarista" ? "aquarista" : "tecnico",
        JSON.stringify(valores),
        diag.nota, diag.urgencia, diag.confianca,
        JSON.stringify({ alertas: diag.alertas, acoes: diag.acoes, parametros: diag.parametros }),
        diag.ruleset_version,
        // client_id pode vir como "visita-UUID" do frontend — guardar só o UUID
        client_id ? client_id.replace(/^visita-/, '') : null,
        observacao || null,
      ]
    );

    if (!r.rows[0])
      return res.json({ ok: true, duplicado: true, mensagem: "visita já registrada" });

    res.json({ ok: true, laudo: r.rows[0], diagnostico: diag });
  } catch (err) {
    console.error("[visita]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// CLIENTE — painel
// ============================================================
app.get("/api/cliente/painel", exigeLogin, async (req, res) => {
  try {
    // Encontra a org do cliente via app_user
    const orgId = req.usuario.organization_id;

    const assetsRes = await query(
      "SELECT id, label, water_type, volume_liters FROM asset WHERE organization_id=$1 ORDER BY label",
      [orgId]
    );

    const assets = assetsRes.rows;
    for (const a of assets) {
      const lRes = await query(
        `SELECT id, values, health_score, urgency, confidence, diagnostico, created_at, ruleset_version
         FROM reading WHERE asset_id=$1 ORDER BY created_at DESC LIMIT 8`,
        [a.id]
      );
      a.serie  = (lRes.rows || []).map(l => ({ d: l.created_at, nota: l.health_score, urg: l.urgency }));
      a.ultimo = lRes.rows[0] || null;
    }

    res.json({ ambientes: assets });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// CLIENTE — laudo (texto simples, IA opcional)
// ============================================================
app.get("/api/laudo/:id/cliente", exigeLogin, async (req, res) => {
  try {
    const r = await query(
      `SELECT rd.*, a.label as asset_label, a.water_type
       FROM reading rd JOIN asset a ON a.id = rd.asset_id
       WHERE rd.id=$1`,
      [req.params.id]
    );
    const l = r.rows[0];
    if (!l) return res.status(404).json({ erro: "laudo não encontrado" });

    // isolamento: cliente só vê o próprio
    if (req.usuario.role === "cliente") {
      const check = await query(
        "SELECT 1 FROM asset WHERE id=$1 AND organization_id=$2",
        [l.asset_id, req.usuario.organization_id]
      );
      if (!check.rows[0]) return res.status(403).json({ erro: "acesso negado" });
    }

    const diag  = l.diagnostico || {};
    const acoes = diag.acoes || [];

    if (!IA_KEY) {
      const texto = acoes.map(a => (a.hobby && a.hobby !== "—" ? a.hobby : a.tecnico))
                         .filter(Boolean).join(" ");
      return res.json({
        nota: l.health_score, urgencia: l.urgency,
        texto: texto || "Está tudo dentro do esperado. Seguimos a rotina.",
        fonte: "planilha",
      });
    }

    // Com IA — ela só redige, não decide
    try {
      const contexto = {
        nota: l.health_score, urgencia: l.urgency,
        aquario: l.asset_label,
        problemas: (diag.alertas || []).map(a => a.explicacao),
        acoes_tecnicas: acoes.map(a => a.tecnico).filter(Boolean),
      };
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": IA_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          system:
            "Você escreve o laudo do aquário para o CLIENTE leigo. Não decida nada: " +
            "use SOMENTE a nota, os problemas e as ações que já foram calculados. " +
            "Explique em português simples, acolhedor, sem jargão. 2 a 4 frases. " +
            "Não invente números nem parâmetros que não estão no contexto.",
          messages: [{ role: "user", content: "Contexto:\n" + JSON.stringify(contexto, null, 2) }],
        }),
      });
      const j    = await resp.json();
      const texto = j?.content?.map(c => c.text).filter(Boolean).join(" ").trim();
      res.json({ nota: l.health_score, urgencia: l.urgency, texto, fonte: "ia" });
    } catch {
      const texto = acoes.map(a => a.hobby || a.tecnico).filter(Boolean).join(" ");
      res.json({ nota: l.health_score, urgencia: l.urgency, texto, fonte: "planilha-fallback" });
    }
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// RELATÓRIOS — histórico completo de parâmetros (gráficos de evolução)
// ============================================================
app.get("/api/aquarios/:id/historico", exigeLogin, async (req, res) => {
  try {
    const check = await query("SELECT id, label FROM asset WHERE id=$1 AND organization_id=$2",
      [req.params.id, req.usuario.organization_id]);
    if (!check.rows[0]) return res.status(404).json({ erro: "aquário não encontrado" });

    const r = await query(
      `SELECT id, values, health_score, urgency, observacao, created_at
       FROM reading WHERE asset_id=$1 ORDER BY created_at ASC LIMIT 30`,
      [req.params.id]
    );
    res.json({ aquario: check.rows[0].label, historico: r.rows });
  } catch (err) {
    console.error("[aquarios:historico]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// ESCLARECIMENTO
// ============================================================
app.post("/api/esclarecimento", exigeLogin, async (req, res) => {
  const { reading_id, pergunta } = req.body;
  if (!pergunta?.trim()) return res.status(400).json({ erro: "escreva sua dúvida" });

  try {
    const r = await query(
      `INSERT INTO esclarecimento (reading_id, organization_id, autor_id, pergunta, mensagem)
       VALUES ($1,$2,$3,$4,$4) RETURNING *`,
      [reading_id || null, req.usuario.organization_id, req.usuario.id, pergunta.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ADMIN — pessoas
// ============================================================
app.get("/api/admin/pessoas", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.ativo,
            o.name as org_nome
     FROM app_user u JOIN organization o ON o.id=u.organization_id
     ORDER BY u.name`,
    []
  );
  res.json(r.rows.map(u => ({ ...u, organization: { name: u.org_nome } })));
});

app.post("/api/admin/pessoas", exigeLogin, exigeAdmin, async (req, res) => {
  const { nome, email, senha, papel, organization_id } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: "nome, e-mail e senha são obrigatórios" });
  if (senha.length < 8) return res.status(400).json({ erro: "senha precisa de ao menos 8 caracteres" });
  if (!["admin","gestor","tecnico","cliente","aquarista"].includes(papel))
    return res.status(400).json({ erro: "papel inválido" });

  const hash = await hashSenha(senha);
  const orgId = organization_id || req.usuario.organization_id;

  try {
    const r = await query(
      `INSERT INTO app_user (name, email, senha_hash, role, organization_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, organization_id`,
      [nome, email.toLowerCase().trim(), hash, papel, orgId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ erro: "e-mail já cadastrado" });
    res.status(500).json({ erro: err.message });
  }
});

app.delete("/api/admin/pessoas/:id", exigeLogin, exigeAdmin, async (req, res) => {
  if (req.params.id === req.usuario.id)
    return res.status(400).json({ erro: "você não pode excluir a si mesmo" });
  await query("UPDATE app_user SET ativo=false WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ============================================================
// ADMIN — clientes (organizações)
// ============================================================
app.get("/api/admin/clientes", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    "SELECT id, name, type, country FROM organization WHERE type != 'provider' ORDER BY name",
    []
  );
  const orgs = r.rows;
  for (const o of orgs) {
    const a = await query(
      "SELECT id, label, water_type, volume_liters FROM asset WHERE organization_id=$1",
      [o.id]
    );
    o.aquarios = a.rows;
  }
  res.json(orgs);
});


app.delete("/api/admin/clientes/:id", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    // Apaga em cascata: assets, readings, users, location, organization
    await query("DELETE FROM reading WHERE organization_id=$1", [req.params.id]);
    await query("DELETE FROM asset WHERE organization_id=$1", [req.params.id]);
    await query("DELETE FROM location WHERE organization_id=$1", [req.params.id]);
    await query("DELETE FROM app_user WHERE organization_id=$1 AND role NOT IN ('admin','gestor')", [req.params.id]);
    await query("DELETE FROM organization WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/admin/clientes", exigeLogin, exigeAdmin, async (req, res) => {
  const { nome, tipo, pais, cidade, aquario } = req.body;
  if (!nome) return res.status(400).json({ erro: "nome do cliente é obrigatório" });

  try {
    const orgR = await query(
      "INSERT INTO organization (name, type, country) VALUES ($1,$2,$3) RETURNING *",
      [nome, tipo || "residential", pais || "BR"]
    );
    const org = orgR.rows[0];

    const locR = await query(
      "INSERT INTO location (organization_id, label, city) VALUES ($1,$2,$3) RETURNING id",
      [org.id, nome, cidade || null]
    );
    const locId = locR.rows[0].id;

    if (aquario?.water_type && aquario?.volume_liters) {
      await query(
        "INSERT INTO asset (organization_id, location_id, label, water_type, volume_liters) VALUES ($1,$2,$3,$4,$5)",
        [org.id, locId, aquario.label || "Aquário", aquario.water_type, aquario.volume_liters]
      );
    }
    res.json(org);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/admin/aquario", exigeLogin, exigeAdmin, async (req, res) => {
  const { organization_id, label, water_type, volume_liters } = req.body;
  if (!organization_id || !water_type)
    return res.status(400).json({ erro: "cliente e tipo de água são obrigatórios" });

  try {
    const r = await query(
      "INSERT INTO asset (organization_id, label, water_type, volume_liters) VALUES ($1,$2,$3,$4) RETURNING *",
      [organization_id, label || "Aquário", water_type, volume_liters || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/admin/laudos", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT rd.id, rd.health_score, rd.urgency, rd.created_at, rd.ruleset_version,
            a.label as asset_label, a.water_type, o.name as org_nome
     FROM reading rd
     JOIN asset a ON a.id = rd.asset_id
     JOIN organization o ON o.id = rd.organization_id
     ORDER BY rd.created_at DESC LIMIT 100`,
    []
  );
  res.json(r.rows.map(rd => ({
    id: rd.id, health_score: rd.health_score, urgency: rd.urgency,
    created_at: rd.created_at, ruleset_version: rd.ruleset_version,
    asset: { label: rd.asset_label, water_type: rd.water_type, organization: { name: rd.org_nome } },
  })));
});

app.get("/api/admin/esclarecimentos", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT e.*, u.name as autor_nome, u.email as autor_email
     FROM esclarecimento e JOIN app_user u ON u.id=e.autor_id
     ORDER BY e.created_at DESC`,
    []
  );
  res.json(r.rows);
});

app.patch("/api/admin/esclarecimentos/:id", exigeLogin, exigeAdmin, async (req, res) => {
  const { resposta } = req.body;
  await query(
    "UPDATE esclarecimento SET resposta=$1, respondido=true, respondido_em=NOW() WHERE id=$2",
    [resposta, req.params.id]
  );
  res.json({ ok: true });
});



// ============================================================
// AGENDAMENTO PÚBLICO (sem login)
// ============================================================
app.post("/api/agendamento", async (req, res) => {
  const {
    nome, email, telefone, pais, cidade, cep, water_type,
    volume_litros, plano, forma_pagamento,
    data_opcao1, data_opcao2,
    valor_visita, moeda, regiao, pricing_version
  } = req.body;

  if (!nome || !email || !telefone)
    return res.status(400).json({ erro: "nome, email e telefone são obrigatórios" });

  try {
    const r = await query(
      `INSERT INTO solicitacao
        (nome, email, telefone, pais, cidade, cep, water_type, volume_litros,
         plano, forma_pagamento, data_opcao1, data_opcao2,
         valor_visita, moeda, regiao, pricing_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [nome, email, telefone, pais||"BR", cidade||null, cep||null,
       water_type||"freshwater", volume_litros||null,
       plano||"avulsa", forma_pagamento||"pix",
       data_opcao1||null, data_opcao2||null,
       valor_visita||null, moeda||"BRL",
       regiao||"outro", pricing_version||"p2.0"]
    );
    res.json({ id: r.rows[0]?.id, ok: true });
  } catch (err) {
    // Se a tabela não existir ainda, não quebrar o servidor
    console.error("[agendamento]", err.message);
    res.json({ ok: true, aviso: "agendamento recebido" });
  }
});

// Cotação pública (para o site mostrar o preço já validado pelo servidor, se quiser)
app.get("/api/agendamento/cotar", (req, res) => {
  const { water_type, volume, cep, cidade, plano, pagamento } = req.query;
  const q = orcarPreco(cep || "", cidade || "", water_type || "freshwater",
    parseFloat(volume) || 0, plano || "avulsa", pagamento || null);
  res.json(q);
});

// Checkout do agendamento: valida o preço no servidor e cria a cobrança no Mercado Pago
app.post("/api/agendamento/checkout", async (req, res) => {
  const { nome, email, telefone, cidade, cep, water_type, volume_litros,
          plano, forma_pagamento, data_opcao1, data_opcao2 } = req.body;
  if (!nome || !email || !telefone)
    return res.status(400).json({ erro: "nome, e-mail e telefone são obrigatórios" });

  // 1) Recalcula o preço no servidor (nunca confia no cliente)
  const q = orcarPreco(cep || "", cidade || "", water_type || "freshwater",
    parseFloat(volume_litros) || 0, plano || "avulsa", forma_pagamento || null);

  if (!q.atende) return res.status(400).json({ erro: "Ainda não atendemos essa região online. Fale conosco pelo WhatsApp." });
  if (q.sob_consulta) return res.status(400).json({ erro: "Esse porte é sob consulta. Fale conosco pelo WhatsApp para um orçamento sob medida." });
  if (q.pais !== "BR") return res.status(400).json({ erro: "Pagamento online disponível apenas no Brasil. Em Portugal, agende pelo WhatsApp." });

  const planoInfo = PRICING_PLANOS[plano] || PRICING_PLANOS.avulsa;
  // valor que o MP efetivamente cobra: mensal = mensalidade recorrente; demais = total do período
  const cobradoCents = Math.round((planoInfo.recorrente ? q.valor_mensal : q.valor_total) * 100);
  const totalCents = Math.round(q.valor_total * 100);
  const extRef = `AG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 2) Grava a solicitação (com dados de pagamento)
    const sol = await query(
      `INSERT INTO solicitacao
         (nome, email, telefone, pais, cidade, cep, water_type, volume_litros,
          plano, forma_pagamento, data_opcao1, data_opcao2, valor_visita, moeda, regiao,
          pricing_version, valor_total_cents, valor_cobrado_cents, external_reference, status_pagamento, status)
       VALUES ($1,$2,$3,'BR',$4,$5,$6,$7,$8,$9,$10,$11,$12,'BRL',$13,'p2.0',$14,$15,$16,'pendente','aguardando_pagamento')
       RETURNING id`,
      [nome, email, telefone, cidade || null, cep || null, water_type || "freshwater",
       parseFloat(volume_litros) || null, plano || "avulsa", forma_pagamento || "pix",
       data_opcao1 || null, data_opcao2 || null, q.valor_visita, q.regiao,
       totalCents, cobradoCents, extRef]
    );
    const solId = sol.rows[0].id;

    const titulo = `Aqualife — ${PRICING_TNOME[water_type] || "Aquário"} · ${planoInfo.nome}`;
    const backUrls = {
      success: `${BASE_URL}/site.html?ag=ok`,
      failure: `${BASE_URL}/site.html?ag=falha`,
      pending: `${BASE_URL}/site.html?ag=pendente`,
    };
    const notificationUrl = `${BASE_URL}/api/webhooks/mercadopago`;

    let initPoint;
    if (planoInfo.recorrente) {
      // Mensal / Mensal·2 → assinatura recorrente
      const pre = await criarPreapproval({
        valorCents: cobradoCents, payerEmail: email, externalReference: extRef,
        backUrl: backUrls.success, motivo: titulo,
      });
      initPoint = pre.init_point;
      await query("UPDATE solicitacao SET mp_preapproval_id=$1, mp_init_point=$2 WHERE id=$3",
        [pre.id, initPoint, solId]);
    } else {
      // Avulso / Trimestral / Semestral / Anual → pagamento único parcelado
      const pref = await criarPreference({
        titulo, valorCents: cobradoCents, payerEmail: email, externalReference: extRef,
        backUrls, notificationUrl, parcelasMax: planoInfo.parcelas || 1,
      });
      initPoint = pref.init_point;
      await query("UPDATE solicitacao SET mp_preference_id=$1, mp_init_point=$2 WHERE id=$3",
        [pref.id, initPoint, solId]);
    }

    res.json({ init_point: initPoint, valor_cobrado_cents: cobradoCents, recorrente: Boolean(planoInfo.recorrente) });
  } catch (err) {
    console.error("[agendamento/checkout]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/admin/agendamentos", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await query(
      "SELECT * FROM solicitacao ORDER BY created_at DESC LIMIT 100", []
    );
    res.json(r.rows);
  } catch {
    res.json([]);
  }
});

app.patch("/api/admin/agendamentos/:id/status", exigeLogin, exigeAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    await query("UPDATE solicitacao SET status=$1 WHERE id=$2", [status, req.params.id]);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// PAINEL FINANCEIRO — agendamentos + assinaturas Care + pagamentos
// ============================================================
const MESES_CICLO = { mensal: 1, mensal_2x: 1, trimestral: 3, semestral: 6, anual: 12 };
app.get("/api/admin/financeiro", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    // taxa estimada (%) para quando o valor real do MP ainda não chegou
    let taxaPct = 4.99;
    try { const r = await getConfig("mp_taxa_percent"); if (r) taxaPct = parseFloat(r) || taxaPct; } catch {}
    const pago = s => s === "pago" || s === "approved" || s === "aprovado";
    // preenche taxa/líquido: usa o real; se faltar e estiver pago, estima pelo %
    const comTaxa = (row, brutoCents, statusPagto) => {
      let taxa = row.taxa_cents, liquido = row.liquido_cents, estimado = false;
      if ((taxa == null || liquido == null) && pago(statusPagto)) {
        taxa = Math.round((brutoCents || 0) * taxaPct / 100);
        liquido = (brutoCents || 0) - taxa;
        estimado = true;
      }
      return { ...row, taxa_cents: taxa, liquido_cents: liquido, taxa_estimada: estimado };
    };

    // 1) Agendamentos de manutenção (solicitacao)
    let agendamentos = [];
    try {
      agendamentos = (await query(
        `SELECT id, nome, email, telefone, cidade, regiao, water_type, volume_litros,
                plano, forma_pagamento, moeda, valor_cobrado_cents, valor_total_cents,
                status, status_pagamento, data_opcao1, data_opcao2, taxa_cents, liquido_cents,
                mp_preference_id, mp_preapproval_id, external_reference, created_at
         FROM solicitacao ORDER BY created_at DESC LIMIT 300`, []
      )).rows.map(a => comTaxa(a, a.valor_cobrado_cents, a.status_pagamento));
    } catch { agendamentos = []; }

    // 2) Assinaturas do Aqualife Care (subscription + dono)
    let assinaturas = [];
    try {
      assinaturas = (await query(
        `SELECT s.id, s.plano, s.billing_cycle, s.price_cents, s.status, s.founding_member,
                s.metodo, s.current_period_end, s.mercadopago_subscription_id,
                s.external_reference, s.created_at,
                u.name AS cliente_nome, u.email AS cliente_email
         FROM subscription s
         LEFT JOIN app_user u ON u.id = s.user_id
         ORDER BY s.created_at DESC LIMIT 300`, []
      )).rows;
    } catch { assinaturas = []; }

    // 3) Histórico de pagamentos confirmados (pagamento)
    let pagamentos = [];
    try {
      pagamentos = (await query(
        `SELECT p.id, p.subscription_id, p.mercadopago_payment_id, p.valor_cents, p.moeda,
                p.status, p.metodo, p.external_reference, p.created_at, p.taxa_cents, p.liquido_cents,
                u.name AS cliente_nome, u.email AS cliente_email
         FROM pagamento p
         LEFT JOIN app_user u ON u.id = p.user_id
         ORDER BY p.created_at DESC LIMIT 300`, []
      )).rows.map(p => comTaxa(p, p.valor_cents, p.status));
    } catch { pagamentos = []; }

    // 4) KPIs
    const agPagos = agendamentos.filter(a => pago(a.status_pagamento));
    const pgPagos = pagamentos.filter(p => pago(p.status));
    const receitaAgend = agPagos.reduce((s, a) => s + (a.valor_cobrado_cents || 0), 0);
    const receitaAssin = pgPagos.reduce((s, p) => s + (p.valor_cents || 0), 0);
    const taxasAgend = agPagos.reduce((s, a) => s + (a.taxa_cents || 0), 0);
    const taxasAssin = pgPagos.reduce((s, p) => s + (p.taxa_cents || 0), 0);
    const liquidoTotal = agPagos.reduce((s, a) => s + (a.liquido_cents ?? a.valor_cobrado_cents ?? 0), 0)
                       + pgPagos.reduce((s, p) => s + (p.liquido_cents ?? p.valor_cents ?? 0), 0);

    const ativas = assinaturas.filter(s => s.status === "ativa");
    const mrrCents = ativas.reduce((s, a) =>
      s + Math.round((a.price_cents || 0) / (MESES_CICLO[a.billing_cycle] || 1)), 0);

    const agora = Date.now(), em30 = agora + 30 * 864e5;
    const dNow = new Date(); const mesAtual = `${dNow.getFullYear()}-${String(dNow.getMonth()+1).padStart(2,"0")}`;
    const renov30 = ativas.filter(a => a.current_period_end &&
      new Date(a.current_period_end).getTime() >= agora &&
      new Date(a.current_period_end).getTime() <= em30);

    // taxas do mês corrente
    const noMes = (d) => d && `${new Date(d).getFullYear()}-${String(new Date(d).getMonth()+1).padStart(2,"0")}` === mesAtual;
    const taxasMes = agPagos.filter(a => noMes(a.created_at)).reduce((s,a)=>s+(a.taxa_cents||0),0)
                   + pgPagos.filter(p => noMes(p.created_at)).reduce((s,p)=>s+(p.taxa_cents||0),0);

    // Série mensal (últimos 6 meses) para os gráficos
    const chave = d => `${new Date(d).getFullYear()}-${String(new Date(d).getMonth()+1).padStart(2,"0")}`;
    const meses = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(dNow.getFullYear(), dNow.getMonth()-i, 1); meses.push(chave(d)); }
    const serie = meses.map(m => {
      const ag = agPagos.filter(a => chave(a.created_at) === m);
      const pgg = pgPagos.filter(p => chave(p.created_at) === m);
      const bruto = ag.reduce((s,a)=>s+(a.valor_cobrado_cents||0),0) + pgg.reduce((s,p)=>s+(p.valor_cents||0),0);
      const taxa = ag.reduce((s,a)=>s+(a.taxa_cents||0),0) + pgg.reduce((s,p)=>s+(p.taxa_cents||0),0);
      const liq = ag.reduce((s,a)=>s+(a.liquido_cents??a.valor_cobrado_cents??0),0) + pgg.reduce((s,p)=>s+(p.liquido_cents??p.valor_cents??0),0);
      return { mes: m, bruto_cents: bruto, taxa_cents: taxa, liquido_cents: liq,
               agendamentos_cents: ag.reduce((s,a)=>s+(a.valor_cobrado_cents||0),0),
               assinaturas_cents: pgg.reduce((s,p)=>s+(p.valor_cents||0),0) };
    });

    // Distribuição de status dos agendamentos (para o gráfico de rosca)
    const dist = { pago:0, pendente:0, falhou:0 };
    agendamentos.forEach(a => {
      if (pago(a.status_pagamento)) dist.pago++;
      else if (a.status_pagamento === "falhou") dist.falhou++;
      else dist.pendente++;
    });

    const kpis = {
      receita_total_cents: receitaAgend + receitaAssin,
      receita_liquida_cents: liquidoTotal,
      taxas_total_cents: taxasAgend + taxasAssin,
      taxas_mes_cents: taxasMes,
      receita_agendamentos_cents: receitaAgend,
      receita_assinaturas_cents: receitaAssin,
      agendamentos_pagos: agPagos.length,
      agendamentos_pendentes: agendamentos.filter(a => !pago(a.status_pagamento) && a.status_pagamento !== "falhou").length,
      assinaturas_ativas: ativas.length,
      assinaturas_pendentes: assinaturas.filter(s => s.status === "pendente").length,
      assinaturas_canceladas: assinaturas.filter(s => s.status === "cancelada").length,
      mrr_cents: mrrCents,
      renovacoes_30d: renov30.length,
      taxa_percent: taxaPct,
    };

    res.json({ kpis, agendamentos, assinaturas, pagamentos, serie, dist });
  } catch (err) {
    console.error("[financeiro]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// AQUALIFE ANALYTICS
// ============================================================
// Ingestão pública de eventos (assíncrona; responde 204 rápido)
app.post("/api/analytics/collect", async (req, res) => {
  res.sendStatus(204); // não bloqueia o cliente
  try {
    // Respeita opt-out (LGPD): cliente sinaliza dnt=1 no corpo
    if (req.body?.dnt) return;
    const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ip = fwd || req.socket?.remoteAddress || null;
    const meta = { ip, ua: req.headers["user-agent"] || "", country: paisDosHeaders(req.headers) };
    await coletarEventos(meta, req.body?.events || []);
  } catch (err) {
    console.error("[analytics/collect]", err.message);
  }
});

// Visão geral (admin)
app.get("/api/admin/analytics/overview", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    res.json(await visaoGeral(req.query.range || "7d"));
  } catch (err) {
    console.error("[analytics/overview]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Funil de conversão (admin)
app.get("/api/admin/analytics/funnel", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    res.json(await funil(req.query.range || "30d"));
  } catch (err) {
    console.error("[analytics/funnel]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Analytics por página / seção (admin)
app.get("/api/admin/analytics/sections", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    res.json(await secoes(req.query.range || "30d"));
  } catch (err) {
    console.error("[analytics/sections]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// UPLOAD DE FOTOS POR VISITA
// ============================================================
app.post("/api/visita/:id/fotos", exigeLogin, upload.array("fotos", 10), async (req, res) => {
  if (!["tecnico","admin","gestor","aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  const arquivos = (req.files || []).map(f => `/uploads/${f.filename}`);
  if (!arquivos.length) return res.status(400).json({ erro: "nenhuma imagem enviada" });

  try {
    // Guardar URLs das fotos no JSON do reading
    await query(
      `UPDATE reading SET diagnostico = jsonb_set(
        COALESCE(diagnostico, '{}'),
        '{fotos}',
        $1::jsonb
      ) WHERE id = $2`,
      [JSON.stringify(arquivos), req.params.id]
    );
    res.json({ ok: true, fotos: arquivos });
  } catch (err) {
    console.error("[fotos]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ÁREA DO USUÁRIO — trocar senha (logado)
// ============================================================
app.put("/api/eu/senha", exigeLogin, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) return res.status(400).json({ erro: "senha atual e nova senha obrigatórias" });
  if (novaSenha.length < 8) return res.status(400).json({ erro: "a nova senha deve ter pelo menos 8 caracteres" });
  try {
    const r = await query("SELECT senha_hash FROM app_user WHERE id=$1", [req.usuario.id]);
    const ok = await verificarSenha(senhaAtual, r.rows[0].senha_hash);
    if (!ok) return res.status(401).json({ erro: "senha atual incorreta" });
    const hash = await hashSenha(novaSenha);
    await query("UPDATE app_user SET senha_hash=$1 WHERE id=$2", [hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[eu/senha]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// ÁREA DO USUÁRIO — assinatura + histórico de pagamentos
// ============================================================
app.get("/api/eu/assinatura", exigeLogin, async (req, res) => {
  try {
    const sub = await query(
      `SELECT * FROM subscription WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.usuario.id]
    );
    const pagamentos = await query(
      `SELECT id, valor_cents, moeda, status, metodo, created_at FROM pagamento
       WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.usuario.id]
    );
    res.json({ assinatura: sub.rows[0] || null, pagamentos: pagamentos.rows });
  } catch (err) {
    console.error("[eu/assinatura]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================
app.post("/api/auth/esqueci-senha", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "e-mail obrigatório" });
  try {
    const r = await solicitarRecuperacaoSenha(email.toLowerCase().trim());
    if (r.token) {
      const link = `${BASE_URL}/redefinir-senha.html?token=${r.token}`;
      const tpl = emailRecuperacaoSenha(link);
      const envio = await enviarEmail({ para: email.trim(), assunto: tpl.assunto, html: tpl.html });
      // Fallback: se o SMTP ainda não estiver configurado, registamos o link no log
      // para não travar o teste do fluxo em ambientes sem e-mail.
      if (!envio.ok) console.log(`[reset-senha] (SMTP ${envio.motivo}) link para ${email}: ${link}`);
    }
    res.json({ ok: true, mensagem: "Se o e-mail existir, enviaremos as instruções de recuperação." });
  } catch (err) {
    console.error("[esqueci-senha]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/auth/redefinir-senha", async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) return res.status(400).json({ erro: "token e nova senha obrigatórios" });
  if (novaSenha.length < 8) return res.status(400).json({ erro: "a senha deve ter pelo menos 8 caracteres" });
  try {
    const r = await redefinirSenha(token, novaSenha);
    if (!r.ok) return res.status(400).json({ erro: r.erro });
    res.json({ ok: true });
  } catch (err) {
    console.error("[redefinir-senha]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// DASHBOARD — resumo do usuário logado
// ============================================================
app.get("/api/dashboard", exigeLogin, async (req, res) => {
  try {
    const uid = req.usuario.id;
    const orgId = req.usuario.organization_id;

    const aquarios = await query(
      `SELECT id, name, label, water_type, volume_liters, foto_url, data_montagem
       FROM asset WHERE organization_id=$1 AND ativo=true
       ORDER BY criado_em DESC`,
      [orgId]
    );

    const relatorios = await query(
      `SELECT r.id, r.asset_id, a.name as aquario_nome, r.health_score, r.urgency, r.created_at
       FROM reading r JOIN asset a ON a.id = r.asset_id
       WHERE r.organization_id=$1
       ORDER BY r.created_at DESC LIMIT 5`,
      [orgId]
    );

    const avisos = await query(
      `SELECT id, titulo, mensagem, tipo, lida, created_at FROM notificacao
       WHERE (user_id=$1 OR (user_id IS NULL AND organization_id=$2)) AND lida=false
       ORDER BY created_at DESC LIMIT 10`,
      [uid, orgId]
    );

    res.json({
      saudacao: `Olá, ${req.usuario.name?.split(" ")[0] || ""}!`,
      resumo_aquarios: { total: aquarios.rows.length, lista: aquarios.rows },
      ultimos_relatorios: relatorios.rows,
      avisos: avisos.rows,
      atalhos: { aquabook: "/aquabook.html", academy: "/academy.html" },
    });
  } catch (err) {
    console.error("[dashboard]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// MEUS AQUÁRIOS — CRUD
// ============================================================
app.get("/api/aquarios", exigeLogin, async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM asset WHERE organization_id=$1 AND ativo=true ORDER BY criado_em DESC`,
      [req.usuario.organization_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/aquarios", exigeLogin, async (req, res) => {
  const { name, water_type, volume_liters, sistema_filtragem, fauna, flora,
          data_montagem, observacoes, foto_url } = req.body;
  if (!name) return res.status(400).json({ erro: "nome do aquário é obrigatório" });
  try {
    const r = await query(
      `INSERT INTO asset (organization_id, owner_user_id, name, label, water_type, volume_liters,
                           sistema_filtragem, fauna, flora, data_montagem, observacoes, foto_url)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.usuario.organization_id, req.usuario.id, name, water_type || "freshwater",
       volume_liters || null, sistema_filtragem || null, JSON.stringify(fauna || []),
       JSON.stringify(flora || []), data_montagem || null, observacoes || null, foto_url || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[aquarios:post]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/aquarios/:id", exigeLogin, async (req, res) => {
  const { name, water_type, volume_liters, sistema_filtragem, fauna, flora,
          data_montagem, observacoes, foto_url } = req.body;
  try {
    const r = await query(
      `UPDATE asset SET name=COALESCE($1,name), water_type=COALESCE($2,water_type),
              volume_liters=COALESCE($3,volume_liters), sistema_filtragem=COALESCE($4,sistema_filtragem),
              fauna=COALESCE($5,fauna), flora=COALESCE($6,flora),
              data_montagem=COALESCE($7,data_montagem), observacoes=COALESCE($8,observacoes),
              foto_url=COALESCE($9,foto_url)
       WHERE id=$10 AND organization_id=$11 RETURNING *`,
      [name, water_type, volume_liters, sistema_filtragem,
       fauna ? JSON.stringify(fauna) : null, flora ? JSON.stringify(flora) : null,
       data_montagem, observacoes, foto_url, req.params.id, req.usuario.organization_id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: "aquário não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[aquarios:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/aquarios/:id/foto", exigeLogin, upload.single("foto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "envie um arquivo de foto" });
  try {
    const foto_url = `/uploads/${req.file.filename}`;
    const r = await query(
      `UPDATE asset SET foto_url=$1 WHERE id=$2 AND organization_id=$3 RETURNING *`,
      [foto_url, req.params.id, req.usuario.organization_id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: "aquário não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[aquarios:foto]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.delete("/api/aquarios/:id", exigeLogin, async (req, res) => {
  try {
    await query(`UPDATE asset SET ativo=false WHERE id=$1 AND organization_id=$2`,
      [req.params.id, req.usuario.organization_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// SUPORTE — tickets
// ============================================================
app.get("/api/tickets", exigeLogin, async (req, res) => {
  try {
    const r = await query(`SELECT * FROM ticket WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.usuario.id]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/tickets", exigeLogin, async (req, res) => {
  const { assunto, mensagem, anexos } = req.body;
  if (!assunto || !mensagem) return res.status(400).json({ erro: "assunto e mensagem obrigatórios" });
  try {
    const r = await query(
      `INSERT INTO ticket (organization_id, user_id, assunto, mensagem, anexos)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.usuario.organization_id, req.usuario.id, assunto, mensagem, JSON.stringify(anexos || [])]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[tickets:post]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/tickets/:id/anexos", exigeLogin, upload.array("arquivos", 10), async (req, res) => {
  try {
    const arquivos = req.files.map(f => `/uploads/${f.filename}`);
    await query(
      `UPDATE ticket SET anexos = anexos || $1::jsonb WHERE id=$2 AND user_id=$3`,
      [JSON.stringify(arquivos), req.params.id, req.usuario.id]
    );
    res.json({ ok: true, anexos: arquivos });
  } catch (err) {
    console.error("[tickets:anexos]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/admin/tickets", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await query(
      `SELECT t.*, u.name as usuario_nome, u.email as usuario_email
       FROM ticket t JOIN app_user u ON u.id = t.user_id
       ORDER BY (t.status = 'aberto') DESC, t.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.patch("/api/admin/tickets/:id", exigeLogin, exigeAdmin, async (req, res) => {
  const { resposta, status } = req.body;
  try {
    const r = await query(
      `UPDATE ticket SET resposta=COALESCE($1,resposta), status=COALESCE($2,status),
              respondido_por=$3, respondido_em=NOW()
       WHERE id=$4 RETURNING *`,
      [resposta || null, status || null, req.usuario.id, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: "ticket não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[admin/tickets:patch]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// AQUABOOK — sugerir nova espécie
// ============================================================
app.post("/api/especies/sugestao", exigeLogin, async (req, res) => {
  const { nome_comum, nome_cientifico, categoria, descricao, foto_url } = req.body;
  if (!nome_comum) return res.status(400).json({ erro: "nome comum é obrigatório" });
  try {
    const r = await query(
      `INSERT INTO especie_sugestao (user_id, nome_comum, nome_cientifico, categoria, descricao, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.usuario.id, nome_comum, nome_cientifico || null, categoria || null,
       descricao || null, foto_url || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[especies:sugestao]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.get("/api/admin/especies/sugestoes", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await query(
      `SELECT s.*, u.name as usuario_nome FROM especie_sugestao s
       LEFT JOIN app_user u ON u.id = s.user_id
       ORDER BY (s.status = 'em_moderacao') DESC, s.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.patch("/api/admin/especies/sugestoes/:id", exigeLogin, exigeAdmin, async (req, res) => {
  const { status } = req.body; // aprovada | rejeitada
  if (!["aprovada", "rejeitada"].includes(status))
    return res.status(400).json({ erro: "status inválido" });
  try {
    const r = await query(
      `UPDATE especie_sugestao SET status=$1, moderado_por=$2, moderado_em=NOW()
       WHERE id=$3 RETURNING *`,
      [status, req.usuario.id, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: "sugestão não encontrada" });
    res.json(r.rows[0]);
    // NOTA: a publicação efetiva no Aquabook (inserir em _ESPECIES / especies.json)
    // é feita manualmente por enquanto, pois os dados de espécies estão embutidos
    // no server.js. Fica preparado para automatizar quando migrarmos para tabela.
  } catch (err) {
    console.error("[admin/especies/sugestoes:patch]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// FOUNDING MEMBERS — status público + configuração admin
// ============================================================
app.get("/api/founding-members/status", async (req, res) => {
  try {
    const r = await query(`SELECT * FROM founding_member_config WHERE id=1`);
    const c = r.rows[0];
    const vagasRestantes = Math.max(0, c.max_slots - c.slots_used);
    const prazoExpirado = c.deadline ? new Date(c.deadline) < new Date() : false;
    const ofertaAtiva = c.ativo && vagasRestantes > 0 && !prazoExpirado;
    res.json({
      oferta_ativa: ofertaAtiva,
      vagas_totais: c.max_slots,
      vagas_usadas: c.slots_used,
      vagas_restantes: vagasRestantes,
      prazo: c.deadline,
      // preços (centavos)
      preco_mensal_cents: c.price_mensal_cents ?? 3490,
      preco_anual_12x_cents: c.price_anual_12x_cents ?? 21480,
      preco_anual_pix_cents: c.price_anual_pix_cents ?? 18900,
      preco_fundador_cents: c.price_cents, // compat (equivalente mensal do fundador)
      preco_oficial_cents: c.price_mensal_cents ?? 3490,
    });
  } catch (err) {
    console.error("[founding-members:status]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.get("/api/admin/founding-members", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await query(`SELECT * FROM founding_member_config WHERE id=1`);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/admin/founding-members", exigeLogin, exigeAdmin, async (req, res) => {
  const { max_slots, deadline, ativo,
          price_mensal_cents, price_anual_12x_cents, price_anual_pix_cents } = req.body;
  try {
    const r = await query(
      `UPDATE founding_member_config SET
         max_slots=COALESCE($1,max_slots), deadline=COALESCE($2,deadline),
         ativo=COALESCE($3,ativo),
         price_mensal_cents=COALESCE($4,price_mensal_cents),
         price_anual_12x_cents=COALESCE($5,price_anual_12x_cents),
         price_anual_pix_cents=COALESCE($6,price_anual_pix_cents)
       WHERE id=1 RETURNING *`,
      [max_slots || null, deadline || null, ativo === undefined ? null : ativo,
       price_mensal_cents || null, price_anual_12x_cents || null, price_anual_pix_cents || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[admin/founding-members:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// MERCADO PAGO — credenciais (admin) · nunca fixas no código
// ============================================================
function mascarar(v) {
  if (!v) return null;
  if (v.length <= 8) return "••••";
  return v.slice(0, 4) + "••••" + v.slice(-4);
}

app.get("/api/admin/integracoes/mercadopago", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const access = await getConfig("mercadopago_access_token");
    const pub     = await getConfig("mercadopago_public_key");
    const secret  = await getConfig("mercadopago_webhook_secret");
    res.json({
      configurado: Boolean(access),
      access_token_mascarado: mascarar(access),
      public_key: pub || null,
      webhook_secret_mascarado: mascarar(secret),
    });
  } catch (err) {
    console.error("[admin/mp:get]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/admin/integracoes/mercadopago", exigeLogin, exigeAdmin, async (req, res) => {
  const { access_token, public_key, webhook_secret } = req.body;
  try {
    // Só grava o que veio preenchido (permite atualizar um campo de cada vez).
    if (access_token !== undefined && access_token !== "") await setConfig("mercadopago_access_token", access_token.trim());
    if (public_key !== undefined && public_key !== "")       await setConfig("mercadopago_public_key", public_key.trim());
    if (webhook_secret !== undefined && webhook_secret !== "") await setConfig("mercadopago_webhook_secret", webhook_secret.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/mp:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// META CONVERSIONS API (CAPI) — configuração (admin)
// ============================================================
app.get("/api/admin/integracoes/meta", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const token = await getConfig("meta_capi_token");
    res.json({
      pixel_id: (await getConfig("meta_pixel_id")) || null,
      capi_configurada: Boolean(token),
      capi_token_mascarado: mascarar(token),
      test_event_code: (await getConfig("meta_test_event_code")) || null,
    });
  } catch (err) {
    console.error("[admin/meta:get]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/admin/integracoes/meta", exigeLogin, exigeAdmin, async (req, res) => {
  const { pixel_id, capi_token, test_event_code } = req.body;
  try {
    if (pixel_id !== undefined) await setConfig("meta_pixel_id", (pixel_id || "").trim());
    if (test_event_code !== undefined) await setConfig("meta_test_event_code", (test_event_code || "").trim());
    if (capi_token !== undefined && capi_token !== "") await setConfig("meta_capi_token", capi_token.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/meta:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// Envia um evento de teste (Purchase R$1) para validar a CAPI
app.post("/api/admin/integracoes/meta/teste", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await enviarPurchaseCAPI({
      eventId: `TESTE-${Date.now()}`, valueCents: 100,
      email: req.usuario.email, eventSourceUrl: `${BASE_URL}/site.html`,
    });
    if (!r.ok) {
      const msg = r.motivo === "capi_nao_configurada"
        ? "CAPI ainda não configurada — informe o Access Token."
        : `Falha: ${r.motivo}`;
      return res.status(400).json({ erro: msg });
    }
    res.json({ ok: true, mensagem: "Evento de teste enviado à Meta. Confira em 'Testar Eventos' no Gerenciador." });
  } catch (err) {
    console.error("[admin/meta:teste]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// SMTP / E-MAIL — configuração (admin) · nunca fixa no código
// ============================================================
app.get("/api/admin/integracoes/email", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const host = await getConfig("smtp_host");
    const user = await getConfig("smtp_user");
    const pass = await getConfig("smtp_pass");
    const resendKey = await getConfig("resend_api_key");
    const smtpOk = Boolean(host && user && pass);
    res.json({
      // provedor ativo: Resend tem prioridade
      provedor: resendKey ? "resend" : (smtpOk ? "smtp" : "nenhum"),
      configurado: Boolean(resendKey) || smtpOk,
      // Resend
      resend_definido: Boolean(resendKey),
      resend_api_key_mascarada: mascarar(resendKey),
      // remetente / reply-to (comuns aos dois)
      email_from: (await getConfig("smtp_from")) || null,
      email_reply_to: (await getConfig("email_reply_to")) || null,
      // SMTP
      smtp_host: host || null,
      smtp_port: (await getConfig("smtp_port")) || "587",
      smtp_secure: (await getConfig("smtp_secure")) || "false",
      smtp_user: user || null,
      senha_definida: Boolean(pass),
    });
  } catch (err) {
    console.error("[admin/email:get]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/admin/integracoes/email", exigeLogin, exigeAdmin, async (req, res) => {
  const { resend_api_key, email_from, email_reply_to,
          smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass } = req.body;
  try {
    // Resend
    if (resend_api_key !== undefined && resend_api_key !== "") await setConfig("resend_api_key", resend_api_key.trim());
    // Remetente e reply-to (comuns) — smtp_from é o campo do remetente
    if (email_from     !== undefined) await setConfig("smtp_from", (email_from || "").trim());
    if (email_reply_to !== undefined) await setConfig("email_reply_to", (email_reply_to || "").trim());
    // SMTP (fallback)
    if (smtp_host   !== undefined) await setConfig("smtp_host", (smtp_host || "").trim());
    if (smtp_port   !== undefined) await setConfig("smtp_port", String(smtp_port || "587").trim());
    if (smtp_secure !== undefined) await setConfig("smtp_secure", String(smtp_secure) === "true" ? "true" : "false");
    if (smtp_user   !== undefined) await setConfig("smtp_user", (smtp_user || "").trim());
    if (smtp_pass !== undefined && smtp_pass !== "") await setConfig("smtp_pass", smtp_pass);
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/email:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// Apaga a chave do Resend (volta a usar SMTP, se configurado)
app.delete("/api/admin/integracoes/email/resend", exigeLogin, exigeAdmin, async (req, res) => {
  try { await setConfig("resend_api_key", null); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: "erro interno" }); }
});

app.post("/api/admin/integracoes/email/teste", exigeLogin, exigeAdmin, async (req, res) => {
  const para = (req.body?.para || req.usuario.email || "").trim();
  if (!para) return res.status(400).json({ erro: "informe um e-mail de destino" });
  try {
    const tpl = emailTeste();
    const envio = await enviarEmail({ para, assunto: tpl.assunto, html: tpl.html });
    if (!envio.ok) {
      const msg = envio.motivo === "email_nao_configurado"
        ? "E-mail ainda não configurado — preencha a chave do Resend (recomendado) ou os dados SMTP."
        : `Falha no envio: ${envio.motivo}`;
      return res.status(400).json({ erro: msg });
    }
    res.json({ ok: true, mensagem: `E-mail de teste enviado para ${para}.` });
  } catch (err) {
    console.error("[admin/email:teste]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// CHECKOUT — cria a cobrança no Mercado Pago
// ============================================================
const BASE_URL = (process.env.APP_BASE_URL || "https://app.aqualifeaquarismo.com").replace(/\/$/, "");

// Lê a config de preços/oferta uma vez por requisição
async function lerOferta() {
  const r = await query("SELECT * FROM founding_member_config WHERE id=1");
  const c = r.rows[0];
  const vagasRestantes = Math.max(0, c.max_slots - c.slots_used);
  const prazoExpirado = c.deadline ? new Date(c.deadline) < new Date() : false;
  const ofertaAtiva = c.ativo && vagasRestantes > 0 && !prazoExpirado;
  return { c, ofertaAtiva, vagasRestantes };
}

// Cria uma linha de subscription "pendente" e devolve a referência externa
async function criarAssinaturaPendente({ userId, orgId, metodo, billing, valorCents, founding }) {
  const extRef = `AQ-${userId.slice(0, 8)}-${Date.now()}`;
  const r = await query(
    `INSERT INTO subscription
       (user_id, organization_id, plano, founding_member, billing_cycle, price_cents,
        status, metodo, external_reference)
     VALUES ($1,$2,'aqualife_care_standard',$3,$4,$5,'pendente',$6,$7) RETURNING *`,
    [userId, orgId, founding, billing, valorCents, metodo, extRef]
  );
  return r.rows[0];
}

// --- Anual no Pix (fundador) ---
app.post("/api/checkout/anual-pix", exigeLogin, async (req, res) => {
  try {
    const { c, ofertaAtiva } = await lerOferta();
    if (!ofertaAtiva) return res.status(409).json({ erro: "A oferta de fundador não está mais disponível." });
    const valorCents = c.price_anual_pix_cents;
    const sub = await criarAssinaturaPendente({
      userId: req.usuario.id, orgId: req.usuario.organization_id,
      metodo: "anual_pix", billing: "anual", valorCents, founding: true,
    });
    const pref = await criarPreference({
      titulo: "Aqualife Care — Fundador (anual · Pix)",
      valorCents, payerEmail: req.usuario.email, externalReference: sub.external_reference,
      backUrls: { success: `${BASE_URL}/conta.html?pg=ok`, failure: `${BASE_URL}/planos.html?pg=falha`, pending: `${BASE_URL}/conta.html?pg=pendente` },
      notificationUrl: `${BASE_URL}/api/webhooks/mercadopago`,
      apenasPix: true,
    });
    await query("UPDATE subscription SET mp_preference_id=$1, mp_init_point=$2 WHERE id=$3",
      [pref.id, pref.init_point, sub.id]);
    res.json({ init_point: pref.init_point });
  } catch (err) {
    console.error("[checkout/anual-pix]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// --- Anual em 12x no cartão (fundador) ---
app.post("/api/checkout/anual-12x", exigeLogin, async (req, res) => {
  try {
    const { c, ofertaAtiva } = await lerOferta();
    if (!ofertaAtiva) return res.status(409).json({ erro: "A oferta de fundador não está mais disponível." });
    const valorCents = c.price_anual_12x_cents;
    const sub = await criarAssinaturaPendente({
      userId: req.usuario.id, orgId: req.usuario.organization_id,
      metodo: "anual_12x", billing: "anual", valorCents, founding: true,
    });
    const pref = await criarPreference({
      titulo: "Aqualife Care — Fundador (anual · 12x)",
      valorCents, payerEmail: req.usuario.email, externalReference: sub.external_reference,
      backUrls: { success: `${BASE_URL}/conta.html?pg=ok`, failure: `${BASE_URL}/planos.html?pg=falha`, pending: `${BASE_URL}/conta.html?pg=pendente` },
      notificationUrl: `${BASE_URL}/api/webhooks/mercadopago`,
      parcelasMax: 12,
    });
    await query("UPDATE subscription SET mp_preference_id=$1, mp_init_point=$2 WHERE id=$3",
      [pref.id, pref.init_point, sub.id]);
    res.json({ init_point: pref.init_point });
  } catch (err) {
    console.error("[checkout/anual-12x]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// --- Mensal recorrente (preço oficial) ---
app.post("/api/checkout/mensal", exigeLogin, async (req, res) => {
  try {
    const { c } = await lerOferta();
    const valorCents = c.price_mensal_cents;
    const sub = await criarAssinaturaPendente({
      userId: req.usuario.id, orgId: req.usuario.organization_id,
      metodo: "mensal_cartao", billing: "mensal", valorCents, founding: false,
    });
    const pre = await criarPreapproval({
      valorCents, payerEmail: req.usuario.email, externalReference: sub.external_reference,
      backUrl: `${BASE_URL}/conta.html?pg=ok`,
      motivo: "Aqualife Care Standard (mensal)",
    });
    await query("UPDATE subscription SET mercadopago_subscription_id=$1, mp_init_point=$2 WHERE id=$3",
      [pre.id, pre.init_point, sub.id]);
    res.json({ init_point: pre.init_point });
  } catch (err) {
    console.error("[checkout/mensal]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// WEBHOOK — Mercado Pago notifica pagamentos e assinaturas
// ============================================================
async function ativarAssinatura(sub, { periodEnd, metodoPagamento } = {}) {
  // Idempotência: se já estava ativa, não reprocessa vagas nem reenvia e-mails
  if (sub.status === "ativa") return;

  await query(
    "UPDATE subscription SET status='ativa', current_period_end=$1 WHERE id=$2",
    [periodEnd || null, sub.id]
  );

  // Se é fundador, ocupa uma vaga (com trava para não passar do limite)
  if (sub.founding_member) {
    await query(
      `UPDATE founding_member_config
         SET slots_used = LEAST(slots_used + 1, max_slots)
       WHERE id=1`
    );
  }

  // Notificações ao cliente: e-mail(s) + aviso no painel
  try {
    const u = (await query("SELECT name, email FROM app_user WHERE id=$1", [sub.user_id])).rows[0];
    if (u?.email) {
      const conf = emailConfirmacaoPagamento({
        nome: u.name, plano: "Aqualife Care Standard",
        valorCents: sub.price_cents, validade: periodEnd,
      });
      await enviarEmail({ para: u.email, assunto: conf.assunto, html: conf.html });
      if (sub.founding_member) {
        const bv = emailBoasVindasFundador({ nome: u.name });
        await enviarEmail({ para: u.email, assunto: bv.assunto, html: bv.html });
      }
      // Purchase server-side (CAPI) da assinatura Care
      await enviarPurchaseCAPI({
        eventId: sub.external_reference, valueCents: sub.price_cents,
        email: u.email, eventSourceUrl: `${BASE_URL}/planos.html`,
      });
    }
    // Aviso in-app no dashboard
    await query(
      `INSERT INTO notificacao (user_id, organization_id, titulo, mensagem, tipo)
       VALUES ($1,$2,$3,$4,'novidade')`,
      [sub.user_id, sub.organization_id, "Assinatura ativada 🎉",
       sub.founding_member
         ? "Bem-vindo(a), Membro Fundador! Seu acesso ao Aqualife Care está liberado."
         : "Seu Aqualife Care está ativo. Bom proveito!"]
    );
  } catch (err) {
    console.error("[ativarAssinatura:notificacoes]", err.message);
  }
}

// Extrai bruto/taxa/líquido REAIS de um pagamento do Mercado Pago.
// Usa net_received_amount quando disponível; senão soma fee_details.
function extrairTaxaMP(pg) {
  const bruto = Math.round((pg.transaction_amount || 0) * 100);
  let liquido = null;
  const net = pg.transaction_details?.net_received_amount;
  if (net != null) {
    liquido = Math.round(net * 100);
  } else if (Array.isArray(pg.fee_details) && pg.fee_details.length) {
    const taxas = pg.fee_details.reduce((s, f) => s + (f.amount || 0), 0);
    liquido = bruto - Math.round(taxas * 100);
  }
  const taxa = liquido == null ? null : Math.max(0, bruto - liquido);
  return { bruto, taxa, liquido };
}

app.post("/api/webhooks/mercadopago", async (req, res) => {
  // Responde 200 rápido para o MP não reenviar; processa em seguida.
  res.sendStatus(200);
  try {
    const tipo = req.body?.type || req.query?.type || req.query?.topic;
    const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
    if (!dataId) return;

    if (tipo === "payment") {
      const pg = await getPagamento(dataId);
      const extRef = pg.external_reference;
      if (!extRef) return;

      // Pagamento de AGENDAMENTO (visita/plano) — referência "AG-"
      if (extRef.startsWith("AG-")) {
        const solR = await query("SELECT * FROM solicitacao WHERE external_reference=$1", [extRef]);
        const sol = solR.rows[0];
        if (!sol) return;
        if (pg.status === "approved") {
          const t = extrairTaxaMP(pg);
          await query("UPDATE solicitacao SET status_pagamento='pago', status='pago', taxa_cents=$2, liquido_cents=$3 WHERE id=$1",
            [sol.id, t.taxa, t.liquido]);
          // e-mail de confirmação ao cliente
          const conf = emailConfirmacaoPagamento({
            nome: sol.nome, plano: `Visita ${sol.plano}`,
            valorCents: sol.valor_cobrado_cents, validade: null,
          });
          await enviarEmail({ para: sol.email, assunto: conf.assunto, html: conf.html });
          // Purchase server-side (CAPI) — event_id = external_reference (dedup com o navegador)
          await enviarPurchaseCAPI({
            eventId: sol.external_reference, valueCents: sol.valor_cobrado_cents,
            email: sol.email, phone: sol.telefone,
            eventSourceUrl: `${BASE_URL}/site.html#/agendar`,
          });
        } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pg.status)) {
          await query("UPDATE solicitacao SET status_pagamento='falhou' WHERE id=$1 AND status_pagamento<>'pago'", [sol.id]);
        }
        return;
      }

      const subR = await query("SELECT * FROM subscription WHERE external_reference=$1", [extRef]);
      const sub = subR.rows[0];
      if (!sub) return;

      // Registra/atualiza o pagamento (com taxa/líquido reais do MP)
      const tp = extrairTaxaMP(pg);
      await query(
        `INSERT INTO pagamento (subscription_id, user_id, mercadopago_payment_id, valor_cents,
                                moeda, status, metodo, raw_payload, external_reference, taxa_cents, liquido_cents)
         VALUES ($1,$2,$3,$4,'BRL',$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [sub.id, sub.user_id, String(pg.id), tp.bruto,
         pg.status, pg.payment_type_id || null, JSON.stringify(pg), extRef, tp.taxa, tp.liquido]
      );

      if (pg.status === "approved") {
        // anual: +12 meses; mensal avulso: +1 mês
        const meses = sub.billing_cycle === "anual" ? 12 : 1;
        const fim = new Date(); fim.setMonth(fim.getMonth() + meses);
        await ativarAssinatura(sub, { periodEnd: fim.toISOString(), metodoPagamento: pg.payment_type_id });
      } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pg.status)) {
        await query("UPDATE subscription SET status='cancelada' WHERE id=$1 AND status<>'ativa'", [sub.id]);
      }
    }

    else if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      const pre = await getPreapproval(dataId);
      const extRef = pre.external_reference;
      if (!extRef) return;

      // Assinatura de AGENDAMENTO mensal (visita recorrente) — referência "AG-"
      if (extRef.startsWith("AG-")) {
        const solR = await query("SELECT * FROM solicitacao WHERE external_reference=$1", [extRef]);
        const sol = solR.rows[0];
        if (!sol) return;
        if (pre.status === "authorized") {
          await query("UPDATE solicitacao SET status_pagamento='pago', status='pago' WHERE id=$1", [sol.id]);
        } else if (["cancelled", "paused"].includes(pre.status)) {
          await query("UPDATE solicitacao SET status_pagamento='falhou' WHERE id=$1 AND status_pagamento<>'pago'", [sol.id]);
        }
        return;
      }

      const subR = await query("SELECT * FROM subscription WHERE external_reference=$1", [extRef]);
      const sub = subR.rows[0];
      if (!sub) return;

      if (pre.status === "authorized") {
        // próxima cobrança define o fim do período; por ora +1 mês
        const fim = new Date(); fim.setMonth(fim.getMonth() + 1);
        await ativarAssinatura(sub, { periodEnd: fim.toISOString() });
      } else if (["cancelled", "paused"].includes(pre.status)) {
        await query("UPDATE subscription SET status='cancelada' WHERE id=$1", [sub.id]);
      }
    }
  } catch (err) {
    console.error("[webhook/mp]", err.message);
  }
});

// ============================================================
// MIDDLEWARE — exige assinatura Care ativa (bloqueio por inadimplência)
// Uso: aplicar em rotas premium do hobbysta. Admin/gestor/tecnico passam.
// ============================================================
export async function exigeAssinatura(req, res, next) {
  if (["admin", "gestor", "tecnico"].includes(req.usuario?.role)) return next();
  try {
    const r = await query(
      `SELECT status, current_period_end FROM subscription
       WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.usuario.id]
    );
    const sub = r.rows[0];
    const ativa = sub && sub.status === "ativa" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!ativa) return res.status(402).json({ erro: "assinatura inativa", assinatura_necessaria: true });
    next();
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
}

// ============================================================
// AQUALIFE ACADEMY — ALUNO (requer assinatura Care; técnicos/admin passam)
// ============================================================

// Lista cursos publicados + progresso do usuário
app.get("/api/academy/cursos", exigeLogin, exigeAssinatura, async (req, res) => {
  try {
    const r = await query(
      `SELECT c.id, c.titulo, c.resumo, c.nivel, c.categoria, c.duracao_min, c.capa_url, c.ordem,
              (SELECT COUNT(*) FROM aula a WHERE a.curso_id=c.id) AS total_aulas,
              p.percentual, p.concluido, p.quiz_melhor
       FROM curso c
       LEFT JOIN curso_progresso p ON p.curso_id=c.id AND p.user_id=$1
       WHERE c.publicado=true
       ORDER BY c.ordem, c.created_at`,
      [req.usuario.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("[academy/cursos]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// Detalhe do curso: aulas + quiz (SEM revelar a resposta correta)
app.get("/api/academy/cursos/:id", exigeLogin, exigeAssinatura, async (req, res) => {
  try {
    const cR = await query("SELECT * FROM curso WHERE id=$1 AND publicado=true", [req.params.id]);
    const curso = cR.rows[0];
    if (!curso) return res.status(404).json({ erro: "curso não encontrado" });

    const aulas = (await query(
      "SELECT id, titulo, conteudo, video_url, ordem FROM aula WHERE curso_id=$1 ORDER BY ordem", [curso.id]
    )).rows;

    // Perguntas sem o índice correto (validação é no servidor)
    const perguntas = (await query(
      "SELECT id, pergunta, opcoes, ordem FROM quiz_pergunta WHERE curso_id=$1 ORDER BY ordem", [curso.id]
    )).rows;

    const prog = (await query(
      "SELECT aulas_concluidas, percentual, concluido, quiz_melhor FROM curso_progresso WHERE curso_id=$1 AND user_id=$2",
      [curso.id, req.usuario.id]
    )).rows[0] || { aulas_concluidas: [], percentual: 0, concluido: false, quiz_melhor: null };

    res.json({ curso, aulas, perguntas, progresso: prog });
  } catch (err) {
    console.error("[academy/curso:get]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// Marca uma aula como concluída e recalcula o progresso
app.post("/api/academy/cursos/:id/aula/:aulaId/concluir", exigeLogin, exigeAssinatura, async (req, res) => {
  try {
    const totalAulas = parseInt((await query(
      "SELECT COUNT(*) c FROM aula WHERE curso_id=$1", [req.params.id])).rows[0].c) || 0;

    const progR = await query(
      "SELECT aulas_concluidas FROM curso_progresso WHERE curso_id=$1 AND user_id=$2",
      [req.params.id, req.usuario.id]
    );
    let concluidas = progR.rows[0]?.aulas_concluidas || [];
    if (!concluidas.includes(req.params.aulaId)) concluidas.push(req.params.aulaId);

    const percentual = totalAulas ? Math.round((concluidas.length / totalAulas) * 100) : 0;

    await query(
      `INSERT INTO curso_progresso (user_id, curso_id, aulas_concluidas, percentual, atualizado_em)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id, curso_id)
       DO UPDATE SET aulas_concluidas=$3, percentual=$4, atualizado_em=NOW()`,
      [req.usuario.id, req.params.id, JSON.stringify(concluidas), percentual]
    );
    res.json({ ok: true, percentual, aulas_concluidas: concluidas });
  } catch (err) {
    console.error("[academy/aula:concluir]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// Envia respostas do quiz; o servidor corrige e devolve o gabarito
app.post("/api/academy/cursos/:id/quiz", exigeLogin, exigeAssinatura, async (req, res) => {
  const { respostas } = req.body; // { perguntaId: indiceEscolhido }
  if (!respostas || typeof respostas !== "object")
    return res.status(400).json({ erro: "envie as respostas" });
  try {
    const perguntas = (await query(
      "SELECT id, correta, explicacao FROM quiz_pergunta WHERE curso_id=$1", [req.params.id]
    )).rows;
    if (!perguntas.length) return res.status(400).json({ erro: "este curso não tem quiz" });

    let acertos = 0;
    const gabarito = perguntas.map(p => {
      const escolhida = respostas[p.id];
      const certo = Number(escolhida) === p.correta;
      if (certo) acertos++;
      return { id: p.id, correta: p.correta, escolhida: escolhida ?? null, certo, explicacao: p.explicacao };
    });
    const total = perguntas.length;
    const percentual = Math.round((acertos / total) * 100);

    await query(
      "INSERT INTO quiz_resultado (user_id, curso_id, acertos, total, percentual) VALUES ($1,$2,$3,$4,$5)",
      [req.usuario.id, req.params.id, acertos, total, percentual]
    );

    // Atualiza melhor pontuação e marca curso como concluído se aulas + quiz ok
    const totalAulas = parseInt((await query(
      "SELECT COUNT(*) c FROM aula WHERE curso_id=$1", [req.params.id])).rows[0].c) || 0;
    const prog = (await query(
      "SELECT aulas_concluidas, quiz_melhor FROM curso_progresso WHERE curso_id=$1 AND user_id=$2",
      [req.params.id, req.usuario.id]
    )).rows[0] || { aulas_concluidas: [], quiz_melhor: null };
    const melhor = Math.max(percentual, prog.quiz_melhor || 0);
    const todasAulas = (prog.aulas_concluidas || []).length >= totalAulas && totalAulas > 0;
    const concluido = todasAulas && melhor >= 60;

    await query(
      `INSERT INTO curso_progresso (user_id, curso_id, quiz_melhor, concluido, atualizado_em)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id, curso_id)
       DO UPDATE SET quiz_melhor=$3, concluido=curso_progresso.concluido OR $4, atualizado_em=NOW()`,
      [req.usuario.id, req.params.id, melhor, concluido]
    );

    res.json({ acertos, total, percentual, aprovado: percentual >= 60, gabarito });
  } catch (err) {
    console.error("[academy/quiz]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

// ============================================================
// AQUALIFE ACADEMY — ADMIN (gestão de conteúdo)
// ============================================================
app.get("/api/admin/academy/cursos", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const r = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM aula a WHERE a.curso_id=c.id) AS total_aulas,
              (SELECT COUNT(*) FROM quiz_pergunta q WHERE q.curso_id=c.id) AS total_perguntas
       FROM curso c ORDER BY c.ordem, c.created_at`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.get("/api/admin/academy/cursos/:id", exigeLogin, exigeAdmin, async (req, res) => {
  try {
    const curso = (await query("SELECT * FROM curso WHERE id=$1", [req.params.id])).rows[0];
    if (!curso) return res.status(404).json({ erro: "curso não encontrado" });
    const aulas = (await query("SELECT * FROM aula WHERE curso_id=$1 ORDER BY ordem", [req.params.id])).rows;
    const perguntas = (await query("SELECT * FROM quiz_pergunta WHERE curso_id=$1 ORDER BY ordem", [req.params.id])).rows;
    res.json({ curso, aulas, perguntas });
  } catch (err) {
    res.status(500).json({ erro: "erro interno" });
  }
});

app.post("/api/admin/academy/cursos", exigeLogin, exigeAdmin, async (req, res) => {
  const { titulo, resumo, descricao, nivel, categoria, duracao_min, ordem, publicado } = req.body;
  if (!titulo) return res.status(400).json({ erro: "título obrigatório" });
  try {
    const r = await query(
      `INSERT INTO curso (titulo, resumo, descricao, nivel, categoria, duracao_min, ordem, publicado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [titulo, resumo || null, descricao || null, nivel || "iniciante", categoria || null,
       duracao_min || null, ordem || 0, publicado ?? false]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[admin/academy/curso:post]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.put("/api/admin/academy/cursos/:id", exigeLogin, exigeAdmin, async (req, res) => {
  const { titulo, resumo, descricao, nivel, categoria, duracao_min, ordem, publicado } = req.body;
  try {
    const r = await query(
      `UPDATE curso SET titulo=COALESCE($1,titulo), resumo=COALESCE($2,resumo),
              descricao=COALESCE($3,descricao), nivel=COALESCE($4,nivel), categoria=COALESCE($5,categoria),
              duracao_min=COALESCE($6,duracao_min), ordem=COALESCE($7,ordem),
              publicado=COALESCE($8,publicado)
       WHERE id=$9 RETURNING *`,
      [titulo, resumo, descricao, nivel, categoria, duracao_min, ordem,
       publicado === undefined ? null : publicado, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: "curso não encontrado" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[admin/academy/curso:put]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.delete("/api/admin/academy/cursos/:id", exigeLogin, exigeAdmin, async (req, res) => {
  try { await query("DELETE FROM curso WHERE id=$1", [req.params.id]); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: "erro interno" }); }
});

app.post("/api/admin/academy/cursos/:id/aulas", exigeLogin, exigeAdmin, async (req, res) => {
  const { titulo, conteudo, video_url, ordem } = req.body;
  if (!titulo) return res.status(400).json({ erro: "título da aula obrigatório" });
  try {
    const r = await query(
      "INSERT INTO aula (curso_id, titulo, conteudo, video_url, ordem) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [req.params.id, titulo, conteudo || null, video_url || null, ordem || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[admin/academy/aula:post]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.delete("/api/admin/academy/aulas/:id", exigeLogin, exigeAdmin, async (req, res) => {
  try { await query("DELETE FROM aula WHERE id=$1", [req.params.id]); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: "erro interno" }); }
});

app.post("/api/admin/academy/cursos/:id/perguntas", exigeLogin, exigeAdmin, async (req, res) => {
  const { pergunta, opcoes, correta, explicacao, ordem } = req.body;
  if (!pergunta || !Array.isArray(opcoes) || opcoes.length < 2)
    return res.status(400).json({ erro: "pergunta e ao menos 2 opções são obrigatórias" });
  try {
    const r = await query(
      "INSERT INTO quiz_pergunta (curso_id, pergunta, opcoes, correta, explicacao, ordem) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [req.params.id, pergunta, JSON.stringify(opcoes), Number(correta) || 0, explicacao || null, ordem || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error("[admin/academy/pergunta:post]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.delete("/api/admin/academy/perguntas/:id", exigeLogin, exigeAdmin, async (req, res) => {
  try { await query("DELETE FROM quiz_pergunta WHERE id=$1", [req.params.id]); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: "erro interno" }); }
});

// ============================================================
// FALLBACK SPA
// ============================================================
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ erro: "rota não encontrada" });
  res.sendFile(path.join(__dirname, "../public/entrar.html"));
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3000;

async function start() {
  const ok = await testarConexao();
  if (!ok) {
    console.error("[FATAL] sem conexão com o banco. Verifique DATABASE_URL.");
    process.exit(1);
  }
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`🌊 Aqualife OS — Railway — porta ${PORT} — IA: ${Boolean(IA_KEY)}`)
  );
}

start();
