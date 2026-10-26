import {autenticar,banco,resposta,lerJSON} from '../../../lib/servidor';
import {validarLinha,chaveCodigo,saldo,type LinhaImportada} from '../../../lib/estoque';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const auth=await autenticar(request);if(auth.erro)return auth.erro;
 let p;try{p=await lerJSON(request);if(!p||p.confirmado!==true||!Array.isArray(p.itens)||!p.itens.length||p.itens.length>5000)throw Error('Confirme uma importação de 1 a 5.000 itens.');
 const chaves=new Set<string>();for(const l of p.itens){validarLinha(l);const c=chaveCodigo(l.codigo);if(chaves.has(c))throw Error(`Código repetido no arquivo: ${l.codigo}. Corrija antes de importar.`);chaves.add(c);}
 }catch(e){return resposta({error:(e as Error).message},400);}
 try{
 const linhas=p.itens.map((l:LinhaImportada)=>({id:crypto.randomUUID(),nome:l.nome.trim(),chave:chaveCodigo(l.codigo),quantidade:saldo(l),codigo:l.codigo.trim(),tipo:l.tipo.trim(),minimo:l.minimo,inicial:l.inicial,entradas:l.entradas,saidas:l.saidas}));
 const r=await banco().prepare(`INSERT INTO equipamentos(id,dono,nome,chave,quantidade,codigo,tipo,minimo,inicial,entradas,saidas,origem,versao) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.nome'),json_extract(value,'$.chave'),json_extract(value,'$.quantidade'),json_extract(value,'$.codigo'),json_extract(value,'$.tipo'),json_extract(value,'$.minimo'),json_extract(value,'$.inicial'),json_extract(value,'$.entradas'),json_extract(value,'$.saidas'),?,0 FROM json_each(?) WHERE true ON CONFLICT(dono,chave) DO NOTHING RETURNING id`).bind(auth.usuario!.userId,typeof p.arquivo==='string'?p.arquivo.slice(0,200):'Planilha Excel',JSON.stringify(linhas)).all();
 return resposta({ok:true,importados:r.results.length,ignorados:linhas.length-r.results.length});
 }catch{return resposta({error:'Não foi possível importar. Nenhum item desta operação foi gravado. Tente novamente.'},500);}
}
