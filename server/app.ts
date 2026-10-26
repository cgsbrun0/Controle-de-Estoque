import express,{type Request as ExpressRequest,type Response as ExpressResponse} from 'express';
import {createHash,randomBytes} from 'node:crypto';
import {sqlite} from '../lib/database';
import {verificarSenha,hashSenha} from '../lib/senhas';
import {contexto,type Usuario} from '../lib/servidor';
import * as itens from '../app/api/equipamentos/route';
import * as movimentos from '../app/api/movimentos/route';
import * as importar from '../app/api/importar/route';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const dummy=hashSenha(randomBytes(32).toString('hex'));
export function criarApp({production=false,url}: {production?:boolean;url?:string}={}){
 const app=express(),origem=url?new URL(url).origin:null;
 if(production&&!origem)throw Error('Configure APP_URL com o endereço completo da publicação.');
 if(production&&origem&&!origem.startsWith('https://')&&!['localhost','127.0.0.1'].includes(new URL(origem).hostname))throw Error('APP_URL deve usar HTTPS em produção.');
 app.disable('x-powered-by');
 const proxies=Number(process.env.TRUST_PROXY||0);if(Number.isInteger(proxies)&&proxies>0)app.set('trust proxy',proxies);
 app.use(express.json({limit:'3mb'}));
 app.use('/api',(req,res,next)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
   if(!req.is('application/json')){res.status(415).json({error:'Envie dados em JSON.'});return}
   if(req.headers.origin&&req.headers.origin!==(origem??`${req.protocol}://${req.get('host')}`)){res.status(403).json({error:'Origem inválida.'});return}
  }
  next();
 });
 const cookie=(req:ExpressRequest)=>{const valor=(req.headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('estoque_session='));return valor?.slice('estoque_session='.length)??''};
 const usuario=(req:ExpressRequest):Usuario|null=>{
  const token=cookie(req);if(!/^[a-f0-9]{64}$/.test(token))return null;
  const s=sqlite.prepare(`SELECT u.id,u.username,u.estoque_id FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>?`).get(hash(token),Date.now()) as {id:string;username:string;estoque_id:string}|undefined;
  return s?{userId:s.estoque_id,actorId:s.id,username:s.username}:null;
 };
 const configCookie={httpOnly:true,sameSite:'strict' as const,secure:origem?.startsWith('https://')??false,path:'/'};
 const tentativas=new Map<string,{quantidade:number;ate:number}>();
 app.post('/api/auth/login',async(req,res)=>{
  const {username,password}=req.body??{};
  if(typeof username!=='string'||typeof password!=='string'||username.length>80||password.length>256){res.status(400).json({error:'Informe usuário e senha.'});return}
  const chave=String(req.ip),agora=Date.now();let t=tentativas.get(chave);
  if(t&&t.ate<=agora){tentativas.delete(chave);t=undefined}
  if(t&&t.quantidade>=10){res.setHeader('Retry-After',String(Math.ceil((t.ate-agora)/1000)));res.status(429).json({error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'});return}
  if(tentativas.size>10000)tentativas.clear();
  tentativas.set(chave,{quantidade:(t?.quantidade??0)+1,ate:t?.ate??agora+15*60*1000});
  const u=sqlite.prepare('SELECT id,username,senha_hash,estoque_id FROM usuarios WHERE username=? COLLATE NOCASE').get(username.trim()) as {id:string;username:string;senha_hash:string;estoque_id:string}|undefined;
  const correto=await verificarSenha(password,u?.senha_hash??await dummy);
  if(!u||!correto){res.status(401).json({error:'Usuário ou senha incorretos.'});return}
  tentativas.delete(chave);sqlite.prepare('DELETE FROM sessoes WHERE expira_em<=?').run(agora);
  const token=randomBytes(32).toString('hex'),expira=7*24*60*60*1000;
  sqlite.prepare('INSERT INTO sessoes VALUES(?,?,?)').run(hash(token),u.id,agora+expira);
  res.cookie('estoque_session',token,{...configCookie,maxAge:expira});res.json({username:u.username,estoque:u.estoque_id});
 });
 app.post('/api/auth/logout',(req,res)=>{const token=cookie(req);if(token)sqlite.prepare('DELETE FROM sessoes WHERE token_hash=?').run(hash(token));res.clearCookie('estoque_session',configCookie);res.json({ok:true})});
 app.get('/api/auth/session',(req,res)=>{const u=usuario(req);if(!u){res.status(401).json({error:'Entre para continuar.'});return}res.json({username:u.username,estoque:u.userId})});
 const handler=(fn:(r:Request)=>Promise<Response>|Response)=>async(req:ExpressRequest,res:ExpressResponse)=>{
  const u=usuario(req);if(!u){res.status(401).json({error:'Entre para continuar.'});return}
  const headers=new Headers();if(req.headers.origin)headers.set('origin',req.headers.origin);headers.set('Content-Type','application/json');
  const request=new Request(new URL(req.originalUrl,origem??`${req.protocol}://${req.get('host')}`),{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:JSON.stringify(req.body??{})})});
  try{const resposta=await contexto.run(u,()=>fn(request));res.status(resposta.status);resposta.headers.forEach((v,k)=>res.setHeader(k,v));res.send(await resposta.text())}
  catch{res.status(500).json({error:'Não foi possível concluir a operação. Tente novamente.'})}
 };
 app.get('/api/equipamentos',handler(itens.GET));app.post('/api/equipamentos',handler(itens.POST));app.delete('/api/equipamentos',handler(itens.DELETE));
 app.get('/api/movimentos',handler(movimentos.GET));app.post('/api/movimentos',handler(movimentos.POST));app.post('/api/importar',handler(importar.POST));
 app.get('/health',(_req,res)=>{sqlite.prepare('SELECT 1').get();res.json({ok:true})});
 app.use('/api',(_req,res)=>res.status(404).json({error:'Rota não encontrada.'}));
 app.use((error:unknown,_req:ExpressRequest,res:ExpressResponse,next:express.NextFunction)=>{if(res.headersSent){next(error);return}res.status(400).json({error:'Requisição inválida ou maior que o limite de 3 MB.'})});
 return app;
}
