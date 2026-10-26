import {autenticar,banco,resposta,lerJSON} from '../../../lib/servidor';
import {validarMovimento} from '../../../lib/estoque';
export const dynamic='force-dynamic';
export async function GET(){
 const auth=await autenticar();if(auth.erro)return auth.erro;
 try{const {results}=await banco().prepare(`SELECT id,nome,codigo,tipo,quantidade,saldo_antes AS saldoAntes,saldo_depois AS saldoDepois,observacao,criado_em AS criadoEm,autor FROM movimentos WHERE dono=? ORDER BY criado_em DESC,id DESC LIMIT 100`).bind(auth.usuario!.userId).all();return resposta(results);}
 catch{return resposta({error:'Não foi possível carregar o histórico.'},500);}
}
export async function POST(request:Request){
 const auth=await autenticar(request);if(auth.erro)return auth.erro;
 let p;try{p=await lerJSON(request);validarMovimento(p);}catch(e){return resposta({error:(e as Error).message},400);}
 const db=banco(),dono=auth.usuario!.userId;
 try{
  const anterior=await db.prepare(`SELECT equipamento_id,tipo,quantidade FROM movimentos WHERE id=? AND dono=?`).bind(p.id,dono).first<{equipamento_id:string;tipo:string;quantidade:number}>();
  if(anterior){if(anterior.equipamento_id!==p.equipamentoId||anterior.tipo!==p.tipo||anterior.quantidade!==p.quantidade)return resposta({error:'Identificador de movimentação já utilizado.'},409);return resposta({ok:true,repetido:true});}
  const delta=p.tipo==='entrada'?p.quantidade:-p.quantidade;
  // O adaptador SQLite executa as duas operações na mesma transação. changes() garante
  // que o histórico só seja inserido se o saldo tiver sido atualizado nesta chamada.
  const resultados=await db.batch([
   db.prepare(`UPDATE equipamentos SET inicial=COALESCE(inicial,quantidade),quantidade=ROUND(quantidade+?,3),entradas=ROUND(COALESCE(entradas,0)+?,3),saidas=ROUND(COALESCE(saidas,0)+?,3),versao=versao+1 WHERE id=? AND dono=? AND versao=? AND excluido_em IS NULL AND (?='entrada' OR quantidade>=?) AND NOT EXISTS(SELECT 1 FROM movimentos WHERE id=?) RETURNING id`).bind(delta,p.tipo==='entrada'?p.quantidade:0,p.tipo==='saida'?p.quantidade:0,p.equipamentoId,dono,p.versao,p.tipo,p.quantidade,p.id),
   db.prepare(`INSERT INTO movimentos(id,dono,equipamento_id,nome,codigo,tipo,quantidade,saldo_antes,saldo_depois,observacao,criado_em,autor) SELECT ?,dono,id,nome,codigo,?,?,ROUND(quantidade-?,3),quantidade,?,?,? FROM equipamentos WHERE id=? AND dono=? AND changes()=1`).bind(p.id,p.tipo,p.quantidade,delta,p.observacao.trim(),new Date().toISOString(),auth.usuario!.username,p.equipamentoId,dono)
  ]);
  if(!resultados[0].results.length)return resposta({error:'O saldo mudou, o item foi removido ou não há estoque suficiente. Atualize a lista e confirme novamente.'},409);
  return resposta({ok:true});
 }catch{return resposta({error:'Não foi possível registrar. Se houve falha de conexão, tente novamente com o mesmo lançamento.'},500);}
}
