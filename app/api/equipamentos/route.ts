import {autenticar,banco,resposta,lerJSON,colunas} from '../../../lib/servidor';
import {validarLinha,chaveCodigo,saldo,numeroValido} from '../../../lib/estoque';
export const dynamic='force-dynamic';
export async function GET(){
 const auth=await autenticar();if(auth.erro)return auth.erro;
 try{const {results}=await banco().prepare(`SELECT ${colunas} FROM equipamentos WHERE dono=? AND excluido_em IS NULL ORDER BY nome COLLATE NOCASE`).bind(auth.usuario!.userId).all();return resposta(results);}
 catch{return resposta({error:'Não foi possível carregar os equipamentos. Tente novamente.'},500);}
}
export async function POST(request:Request){
 const auth=await autenticar(request);if(auth.erro)return auth.erro;
 let p;try{p=await lerJSON(request);}catch(e){return resposta({error:String((e as Error).message)},400);}
 const dono=auth.usuario!.userId;
 try{
  if(p?.acao==='editar'){
   if(typeof p.id!=='string'||!Number.isSafeInteger(p.versao))throw Error('Selecione um item atualizado.');
   if(typeof p.nome!=='string'||!p.nome.trim()||p.nome.trim().length>200)throw Error('Informe o nome (até 200 caracteres).');
   if(p.codigo!==null&&(typeof p.codigo!=='string'||!p.codigo.trim()||p.codigo.length>80))throw Error('Código inválido.');
   if(p.tipo!==null&&(typeof p.tipo!=='string'||!p.tipo.trim()||p.tipo.length>80))throw Error('Tipo inválido.');
   if(p.minimo!==null&&!numeroValido(p.minimo))throw Error('Estoque mínimo inválido.');
   const result=await banco().prepare(`UPDATE equipamentos SET nome=?,codigo=?,chave=?,tipo=?,minimo=?,versao=versao+1 WHERE id=? AND dono=? AND versao=? AND excluido_em IS NULL RETURNING id`).bind(p.nome.trim(),p.codigo?.trim()??null,p.codigo?chaveCodigo(p.codigo):'legado:'+p.id,p.tipo?.trim()??null,p.minimo,p.id,dono,p.versao).all();
   if(!result.results.length)return resposta({error:'O item foi alterado em outra sessão. Atualize e tente novamente.'},409);
  }else if(p?.acao==='adicionar'){
   validarLinha({...p,entradas:0,saidas:0});
   await banco().prepare(`INSERT INTO equipamentos(id,dono,nome,chave,quantidade,codigo,tipo,minimo,inicial,entradas,saidas,origem,versao) VALUES(?,?,?,?,?,?,?,?,?,0,0,'Cadastro manual',0)`).bind(crypto.randomUUID(),dono,p.nome.trim(),chaveCodigo(p.codigo),p.inicial,p.codigo.trim(),p.tipo.trim(),p.minimo,p.inicial).run();
  }else throw Error('Ação inválida.');
  return resposta({ok:true});
 }catch(e){const mensagem=String((e as Error).message);if(/unique/i.test(mensagem+String((e as {cause?:unknown}).cause)))return resposta({error:'Esse código já está cadastrado. Use Entrada ou Saída para movimentar o item.'},409);return resposta({error:/D1_|SQLITE|database/i.test(mensagem)?'Não foi possível salvar o cadastro. Tente novamente.':mensagem},400);}
}
export async function DELETE(request:Request){
 const auth=await autenticar(request);if(auth.erro)return auth.erro;
 let p;try{p=await lerJSON(request);}catch{return resposta({error:'Dados inválidos.'},400);}
 if(!p||typeof p.id!=='string'||p.confirmado!==true)return resposta({error:'Confirme a remoção de um equipamento válido.'},400);
 try{const r=await banco().prepare(`UPDATE equipamentos SET excluido_em=?,chave='excluido:'||id,versao=versao+1 WHERE id=? AND dono=? AND excluido_em IS NULL RETURNING id`).bind(new Date().toISOString(),p.id,auth.usuario!.userId).all();if(!r.results.length)return resposta({error:'Item não encontrado. Atualize a lista.'},404);return resposta({ok:true});}
 catch{return resposta({error:'Não foi possível remover o item. Tente novamente.'},500);}
}
