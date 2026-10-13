const { json, cors } = require('../lib/api');
module.exports = async function handler(req,res){
  cors(req,res);
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return json(res,{error:'Method not allowed.'},405);
  const publicKey=String(process.env.VAPID_PUBLIC_KEY||'').trim();
  const privateKey=String(process.env.VAPID_PRIVATE_KEY||'').trim();
  const subject=String(process.env.VAPID_SUBJECT||'').trim();
  return json(res,{configured:Boolean(publicKey&&privateKey&&subject),publicKey:publicKey||null});
};
