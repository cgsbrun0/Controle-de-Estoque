import {AsyncLocalStorage} from 'node:async_hooks';
import {database} from './database';
export type Usuario={userId:string;actorId:string;username:string};
export const contexto=new AsyncLocalStorage<Usuario>();
export const resposta=(dados:unknown,status=200)=>Response.json(dados,{status,headers:{'Cache-Control':'no-store'}});
export const banco=()=>database;
export async function autenticar(request?:Request){
 const usuario=contexto.getStore();
 if(!usuario)return{erro:resposta({error:'Entre com seu usuário e senha para acessar.'},401)};
 if(request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return{erro:resposta({error:'Origem inválida.'},403)};}
 return{usuario};
}
export async function lerJSON(request:Request){const texto=await request.text();if(texto.length>3_000_000)throw Error('Dados muito grandes. Importe até 5.000 itens por vez.');try{return JSON.parse(texto)}catch{throw Error('Dados inválidos.')}}
export const colunas='id,nome,quantidade,codigo,tipo,minimo,COALESCE(inicial,quantidade) AS inicial,COALESCE(entradas,0) AS entradas,COALESCE(saidas,0) AS saidas,versao,origem';
