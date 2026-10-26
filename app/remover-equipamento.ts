type Equipamento = {id:string;nome:string;quantidade:number};
export async function removerEquipamento(
 item:Equipamento,
 confirmar:(mensagem:string)=>boolean,
 enviar:typeof fetch=fetch,
):Promise<boolean>{
 if(!confirmar(`Remover o equipamento “${item.nome}”?\n\nQuantidade registrada: ${item.quantidade.toLocaleString('pt-BR')}.\n\nConfirmação 1 de 2.`)) return false;
 if(!confirmar(`Confirmação final (2 de 2)\n\nExcluir definitivamente “${item.nome}” e todas as suas ${item.quantidade.toLocaleString('pt-BR')} unidades do inventário?\n\nO cadastro será removido da lista; seu histórico será preservado. Toque em Cancelar para manter o item.`)) return false;
 const resposta = await enviar('/api/equipamentos',{
  method:'DELETE',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({id:item.id,confirmado:true}),
 });
 const dados = await resposta.json() as {error?:string};
 if(!resposta.ok) throw Error(dados.error || 'Não foi possível remover o equipamento.');
 return true;
}
