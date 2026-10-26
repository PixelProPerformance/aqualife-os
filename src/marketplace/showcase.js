import {textoCampo} from './catalog-validation.js';
import {attributesValid,conditionsValid,rankingPolicy} from './showcase-validation.js';
export function registrarVitrine({app,query,withTransaction,exigeLogin,exigeAdmin,safe,scope,offer,approvedProduct,expected,uuid,audit,limit,pagination}) {
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const read={query},base='/api/marketplace/sellers/:sellerId/catalog';
 const legacyQuery=`SELECT p.id,p.nome,p.marca,p.modelo,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',v.sku,'active',v.ativo) ORDER BY v.id) FROM loja_variacao v WHERE v.produto_id=p.id),'[]') AS variations,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('url',i.url,'cover',i.capa,'order',i.ordem) ORDER BY i.ordem,i.url) FROM loja_imagem i WHERE i.produto_id=p.id),'[]') AS images
  FROM loja_produto p`;
 app.get('/api/admin/marketplace/catalog/legacy',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const rows=(await query(`SELECT legacy.*,r.catalog_product_id AS reconciled_product_id,r.evidence,r.reviewed_at FROM (${legacyQuery}) legacy LEFT JOIN marketplace_legacy_catalog_review r ON r.legacy_product_id=legacy.id ORDER BY legacy.id LIMIT 100 OFFSET $1`,[pagination(req)])).rows;
  res.json({products:rows,policy:'Revisão manual por identificadores, marca, modelo, variações e imagens. Nenhuma união por nome. Loja, URLs, pedidos e estoque antigos permanecem preservados.'});
 }));
 app.post('/api/admin/marketplace/catalog/legacy/:productId/reconcile',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const evidence=textoCampo(req.body?.evidence,2000,{min:20});if(!evidence||req.body?.identifiers_checked!==true||req.body?.variants_checked!==true||req.body?.images_checked!==true)fail(400,'Confira identificadores, variações e imagens e registre a justificativa');
  await withTransaction(async c=>{
   const source=(await c.query(legacyQuery+' WHERE p.id=$1',[uuid(req.params.productId)])).rows[0];if(!source)fail(404,'Produto legado não encontrado');
   if(JSON.stringify(source)!==JSON.stringify(req.body.expected_source))fail(409,'Origem alterada; atualize a conferência');
   const target=(await c.query(`SELECT id FROM marketplace_catalog_product WHERE id=$1 AND moderation_status='approved' AND legacy_product_id IS NULL FOR SHARE`,[uuid(req.body.catalog_product_id)])).rows[0];if(!target)fail(400,'Selecione um produto novo aprovado e confira sua ficha');
   // Records correspondence only. Never rewrites IDs, original products, offers, images or historical items.
   await c.query(`INSERT INTO marketplace_legacy_catalog_review(legacy_product_id,catalog_product_id,source_snapshot,evidence,reviewed_by) VALUES($1,$2,$3::jsonb,$4,$5) ON CONFLICT(legacy_product_id) DO UPDATE SET catalog_product_id=$2,source_snapshot=$3::jsonb,evidence=$4,reviewed_by=$5,reviewed_at=now()`,[source.id,target.id,JSON.stringify(source),evidence,req.usuario.id]);
   await audit(c,null,req.usuario.id,'legacy_catalog_reconciled','catalog_product',target.id,{legacy_product_id:source.id,evidence,source});
  });res.json({ok:true,legacy_data_unchanged:true,commerce_enabled:false});
 }));
 app.get(base+'/public-profile',exigeLogin,safe(async(req,res)=>{
  const s=await scope(read,req);res.json((await query('SELECT biography,city,state,consent,revision FROM marketplace_public_profile WHERE seller_id=$1',[s.id])).rows[0]||{biography:'',city:'',state:'',consent:false,revision:0});
 }));
 app.put(base+'/public-profile',exigeLogin,safe(async(req,res)=>{
  const biography=textoCampo(req.body?.biography,1500),city=textoCampo(req.body?.city,100),state=textoCampo(req.body?.state,2);
  if(biography===null||city===null||state===null||(state&&!/^[A-Z]{2}$/.test(state))||typeof req.body?.consent!=='boolean')fail(400,'Confira apresentação, cidade, UF e autorização pública');
  await withTransaction(async c=>{
   const s=await scope(c,req,true),old=(await c.query('SELECT revision FROM marketplace_public_profile WHERE seller_id=$1 FOR UPDATE',[s.id])).rows[0];
   if((old?.revision||0)!==req.body.revision)fail(409,'Apresentação alterada; atualize a tela');
   await c.query(`INSERT INTO marketplace_public_profile(seller_id,biography,city,state,consent) VALUES($1,$2,$3,$4,$5) ON CONFLICT(seller_id) DO UPDATE SET biography=$2,city=$3,state=$4,consent=$5,revision=marketplace_public_profile.revision+1,updated_at=now()`,[s.id,biography,city,state,req.body.consent]);
   await c.query(`UPDATE marketplace_offer_presentation SET review_status='draft',revision=revision+1 WHERE seller_id=$1`,[s.id]);
   await audit(c,s.id,req.usuario.id,'public_profile_changed','seller',s.id,{consent:req.body.consent});
  });res.json({ok:true,offers_require_review:true,commerce_enabled:false});
 }));
 app.get(base+'/presentations',exigeLogin,safe(async(req,res)=>{
  const s=await scope(read,req);res.json((await query('SELECT * FROM marketplace_offer_presentation WHERE seller_id=$1 ORDER BY offer_id LIMIT 100 OFFSET $2',[s.id,pagination(req)])).rows);
 }));
 app.put(base+'/offers/:offerId/presentation',exigeLogin,safe(async(req,res)=>{
  limit(req,'presentation');const p=conditionsValid(req.body);if(!p)fail(400,'Informe garantia, condições e prazo de preparo entre 0 e 60 dias');
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),o=await offer(c,s.id,req.params.offerId);expected(o,{revision:req.body.offer_revision});
   const old=(await c.query('SELECT * FROM marketplace_offer_presentation WHERE offer_id=$1 FOR UPDATE',[o.id])).rows[0];
   if((old?.revision||0)!==req.body.revision)fail(409,'Condições alteradas; atualize a tela');
   if(o.status==='active'||o.status==='suspended')fail(409,'Oferta indisponível para apresentação');
   const r=(await c.query(`INSERT INTO marketplace_offer_presentation(offer_id,seller_id,warranty,handling_days,conditions) VALUES($1,$2,$3,$4,$5) ON CONFLICT(offer_id) DO UPDATE SET warranty=$3,handling_days=$4,conditions=$5,review_status='draft',revision=marketplace_offer_presentation.revision+1,review_note='',reviewed_by=NULL,reviewed_at=NULL RETURNING *`,[o.id,s.id,p.warranty,p.handling_days,p.conditions])).rows[0];
   await audit(c,s.id,req.usuario.id,'offer_conditions_changed','offer',o.id);return r;
  });res.json(result);
 }));
 app.post(base+'/offers/:offerId/review',exigeLogin,safe(async(req,res)=>{
  limit(req,'offer_review',30);const r=await withTransaction(async c=>{
   const s=await scope(c,req,true),ref=(await c.query('SELECT catalog_product_id FROM marketplace_offer WHERE id=$1 AND seller_id=$2',[uuid(req.params.offerId),s.id])).rows[0];if(!ref)fail(404,'Oferta não encontrada');await approvedProduct(c,ref.catalog_product_id);
   const o=await offer(c,s.id,req.params.offerId);expected(o,{revision:req.body.offer_revision});
   if(o.status!=='draft')fail(409,'Somente ofertas em rascunho podem ser analisadas');
   if(!(await c.query('SELECT seller_id FROM marketplace_public_profile WHERE seller_id=$1 AND consent=true',[s.id])).rows[0])fail(409,'Autorize e confira a apresentação pública da loja primeiro');
   const p=(await c.query('SELECT * FROM marketplace_offer_presentation WHERE offer_id=$1 FOR UPDATE',[o.id])).rows[0];
   if(!p||p.revision!==req.body.revision||!conditionsValid(p)||!['draft','rejected'].includes(p.review_status))fail(409,'Complete as condições e atualize a revisão');
   const row=(await c.query(`UPDATE marketplace_offer_presentation SET review_status='pending',revision=revision+1 WHERE offer_id=$1 RETURNING *`,[o.id])).rows[0];await audit(c,s.id,req.usuario.id,'offer_preview_submitted','offer',o.id);return row;
  });res.json(r);
 }));
 app.get('/api/admin/marketplace/catalog/offers',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  res.json((await query(`SELECT pr.*,o.seller_sku,o.price_cents,o.status,p.title,p.moderation_status,s.trade_name,s.status AS seller_status,pf.biography,pf.city,pf.state,pf.consent,d.variant_label,i.available_qty FROM marketplace_offer_presentation pr JOIN marketplace_offer o ON o.id=pr.offer_id JOIN marketplace_seller s ON s.id=o.seller_id JOIN marketplace_catalog_product p ON p.id=o.catalog_product_id JOIN marketplace_offer_detail d ON d.offer_id=o.id JOIN marketplace_offer_inventory i ON i.offer_id=o.id LEFT JOIN marketplace_public_profile pf ON pf.seller_id=s.id ORDER BY CASE WHEN pr.review_status='pending' THEN 0 ELSE 1 END,pr.offer_id LIMIT 100 OFFSET $1`,[pagination(req)])).rows);
 }));
 app.patch('/api/admin/marketplace/catalog/offers/:offerId/decision',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const note=textoCampo(req.body?.note,1000,{min:3}),status=req.body?.status;if(!note||!['approved','rejected'].includes(status))fail(400,'Informe decisão e motivo');
  const result=await withTransaction(async c=>{
   const ref=(await c.query('SELECT seller_id,catalog_product_id FROM marketplace_offer WHERE id=$1',[uuid(req.params.offerId)])).rows[0];if(!ref)fail(404,'Oferta não encontrada');
   const s=(await c.query('SELECT * FROM marketplace_seller WHERE id=$1 FOR UPDATE',[ref.seller_id])).rows[0];
   if(status==='approved')await approvedProduct(c,ref.catalog_product_id);
   const o=await offer(c,s.id,req.params.offerId),p=(await c.query('SELECT * FROM marketplace_offer_presentation WHERE offer_id=$1 FOR UPDATE',[o.id])).rows[0];
   if(!p||p.revision!==req.body.revision||!['pending','approved'].includes(p.review_status))fail(409,'Revisão alterada ou oferta fora da fila');
   if(status==='approved'&&(p.review_status!=='pending'||s.status!=='approved'||s.is_platform_owned||o.status!=='draft'||!(await c.query('SELECT seller_id FROM marketplace_public_profile WHERE seller_id=$1 AND consent=true',[s.id])).rows[0]))fail(409,'Loja, apresentação ou oferta não elegível');
   const row=(await c.query('UPDATE marketplace_offer_presentation SET review_status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),revision=revision+1 WHERE offer_id=$1 RETURNING *',[o.id,status,note,req.usuario.id])).rows[0];await audit(c,s.id,req.usuario.id,'offer_preview_reviewed','offer',o.id,{status,note});return row;
  });res.json({...result,commerce_enabled:false});
 }));
 app.patch('/api/admin/marketplace/catalog/products/:productId/classification',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const category=textoCampo(req.body?.category,80,{min:2}),attrs=attributesValid(req.body?.technical_attributes),note=textoCampo(req.body?.note,1000,{min:3});if(!category||!attrs||!note)fail(400,'Informe categoria, atributos e motivo');
  await withTransaction(async c=>{
   const p=(await c.query(`SELECT p.id FROM marketplace_catalog_product p WHERE p.id=$1 AND p.moderation_status='approved' FOR UPDATE`,[uuid(req.params.productId)])).rows[0];if(!p)fail(404,'Produto aprovado não encontrado');
   const d=(await c.query('SELECT * FROM marketplace_catalog_detail WHERE catalog_product_id=$1 FOR UPDATE',[p.id])).rows[0];if(!d||JSON.stringify(d.technical_attributes)!==JSON.stringify(req.body.expected_attributes)||d.category!==req.body.expected_category)fail(409,'Classificação alterada; atualize a tela');
   await c.query('UPDATE marketplace_catalog_detail SET category=$2,technical_attributes=$3::jsonb WHERE catalog_product_id=$1',[p.id,category,JSON.stringify(attrs)]);
   await c.query(`UPDATE marketplace_offer_presentation SET review_status='draft',revision=revision+1 WHERE offer_id IN (SELECT id FROM marketplace_offer WHERE catalog_product_id=$1)`,[p.id]);
   const sellers=(await c.query('SELECT DISTINCT seller_id FROM marketplace_offer WHERE catalog_product_id=$1',[p.id])).rows;for(const s of sellers)await audit(c,s.seller_id,req.usuario.id,'catalog_classification_changed','catalog_product',p.id,{category,note});
  });res.json({ok:true,offers_require_review:true});
 }));
 // Explicit projection: never return CNPJ, address, contact, members, SKU, audit or reservation data.
 const projection=`SELECT p.id AS product_id,p.title,p.brand,p.model,p.gtin,d.description,d.category,d.technical_attributes,
 CASE WHEN a.id IS NOT NULL THEN '/uploads/marketplace/'||a.storage_key END AS image_url,
 o.id AS offer_id,o.price_cents,od.variant_label,pr.warranty,pr.handling_days,pr.conditions,
 (i.available_qty>0) AS in_stock,s.id AS seller_id,s.trade_name AS sold_by,pf.biography,pf.city,pf.state
 FROM marketplace_offer o JOIN marketplace_offer_presentation pr ON pr.offer_id=o.id AND pr.seller_id=o.seller_id
 JOIN marketplace_offer_detail od ON od.offer_id=o.id JOIN marketplace_offer_inventory i ON i.offer_id=o.id
 JOIN marketplace_catalog_product p ON p.id=o.catalog_product_id JOIN marketplace_catalog_detail d ON d.catalog_product_id=p.id
 LEFT JOIN marketplace_catalog_asset a ON a.id=d.image_asset_id
 JOIN marketplace_seller s ON s.id=o.seller_id JOIN marketplace_public_profile pf ON pf.seller_id=s.id
 WHERE p.moderation_status='approved' AND s.status='approved' AND pf.consent=true AND pr.review_status='approved'
 AND o.status='draft' AND o.legacy_variation_id IS NULL AND NOT s.is_platform_owned`;
 app.get('/api/marketplace/showcase',safe(async(req,res)=>{
  if(process.env.MARKETPLACE_CATALOG_PREVIEW_ENABLED!=='true')return res.status(404).json({erro:'Vitrine em preparação',commerce_enabled:false});
  const search=textoCampo(req.query.search||'',100);if(search===null)fail(400,'Busca inválida');
  const product=req.query.product?uuid(req.query.product):null,seller=req.query.seller?uuid(req.query.seller):null;
  const rows=(await query(projection+` AND ($1='' OR p.title ILIKE '%'||$1||'%' OR p.gtin=$1) AND ($2::uuid IS NULL OR p.id=$2) AND ($3::uuid IS NULL OR s.id=$3) ORDER BY (i.available_qty>0) DESC,o.price_cents,pr.handling_days,o.id LIMIT 100 OFFSET $4`,[search,product,seller,pagination(req)])).rows;
  res.json({commerce_enabled:false,ranking_policy:rankingPolicy,offers:rows,offset:pagination(req),limit:100});
 }));
}
