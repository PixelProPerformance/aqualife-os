// Autorização por loja, independente do papel global admin/gestor.
export const SELLER_ROLES = Object.freeze(['owner','staff']);
export function sellerIdValido(value) {
 return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function criarAutorizacaoSeller(query) {
 if (typeof query !== 'function') throw new TypeError('query obrigatória');
 const temAcesso = async (userId, sellerId, {ownerOnly=false}={}) => {
  if(!sellerIdValido(userId)||!sellerIdValido(sellerId)) return false;
  const r=await query(`SELECT 1 FROM marketplace_seller_user su
     JOIN marketplace_seller s ON s.id=su.seller_id
     WHERE su.user_id=$1 AND su.seller_id=$2 AND su.active=true
     AND s.status='approved' AND ($3::boolean=false OR su.role='owner')
     LIMIT 1`,[userId,sellerId,ownerOnly]);
  return Boolean(r.rows[0]);
 };
 const exigeVendedor = ({ownerOnly=false}={}) => async (req,res,next)=>{
  try {
   if(!req.usuario?.id) return res.status(401).json({erro:'não autenticado'});
   const sellerId=req.params.sellerId;
   if(!sellerIdValido(sellerId)) return res.status(400).json({erro:'identificador inválido'});
   if(!(await temAcesso(req.usuario.id,sellerId,{ownerOnly}))) return res.status(403).json({erro:'acesso restrito à loja'});
   req.marketplaceSellerId=sellerId;
   next();
  } catch(e) {
   console.error('[marketplace/auth] falha de autorização');
   res.status(500).json({erro:'erro interno'});
  }
 };
 return {temAcesso,exigeVendedor};
}
