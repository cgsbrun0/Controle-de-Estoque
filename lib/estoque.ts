export type Item={id:string;nome:string;quantidade:number;codigo:string|null;tipo:string|null;minimo:number|null;inicial:number|null;entradas:number|null;saidas:number|null;versao:number;origem?:string|null};
export type LinhaImportada={codigo:string;nome:string;tipo:string;minimo:number;inicial:number;entradas:number;saidas:number;atualPlanilha:number|null;linha:number};
export const arredondar=(n:number)=>Math.round((n+Number.EPSILON)*1000)/1000;
export const normalizarCodigo=(n:string)=>n.trim().toLocaleUpperCase('pt-BR').replace(/^0+(?=\d+$)/,'');
export const chaveCodigo=(codigo:string)=>'codigo:'+normalizarCodigo(codigo);
export const saldo=(i:Pick<LinhaImportada,'inicial'|'entradas'|'saidas'>)=>arredondar(i.inicial+i.entradas-i.saidas);
export const numeroValido=(n:unknown,positivo=false):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=(positivo?0.001:0)&&n<=1e9&&Math.abs(n-arredondar(n))<1e-7;
export const status=(item:Pick<Item,'minimo'|'quantidade'>)=>item.minimo===null?'MÍNIMO NÃO INFORMADO':item.quantidade<item.minimo?'ABAIXO DO MÍNIMO':'OK';
export const formatar=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:3});
export function validarLinha(l:LinhaImportada){
 if(!l || typeof l.codigo!=='string'||!l.codigo.trim()||l.codigo.length>80)throw Error('Código obrigatório (até 80 caracteres).');
 if(typeof l.nome!=='string'||!l.nome.trim()||l.nome.length>200)throw Error('Nome obrigatório (até 200 caracteres).');
 if(typeof l.tipo!=='string'||!l.tipo.trim()||l.tipo.length>80)throw Error('Tipo obrigatório (até 80 caracteres).');
 for(const c of ['minimo','inicial','entradas','saidas'] as const)if(!numeroValido(l[c]))throw Error(`${c}: informe uma quantidade não negativa, com até 3 casas decimais.`);
}
export type SolicitacaoMovimento={id:string;equipamentoId:string;tipo:'entrada'|'saida';quantidade:number;versao:number;confirmado:boolean;observacao:string};
export function validarMovimento(p:SolicitacaoMovimento){
 if(!p||typeof p.id!=='string'||!/^[-a-zA-Z0-9]{10,80}$/.test(p.id)||typeof p.equipamentoId!=='string'||p.equipamentoId.length>100||!p.equipamentoId)throw Error('Movimentação inválida.');
 if(!['entrada','saida'].includes(p.tipo)||!numeroValido(p.quantidade,true)||!Number.isSafeInteger(p.versao)||p.versao<0||p.confirmado!==true)throw Error('Informe a quantidade e confirme a movimentação.');
 if(typeof p.observacao!=='string'||p.observacao.length>500)throw Error('Observação deve ter até 500 caracteres.');
}
export function confirmarMovimento(item:Item,tipo:'entrada'|'saida',quantidade:number,confirmar:(m:string)=>boolean){
 if(!numeroValido(quantidade,true))throw Error('Quantidade deve ser maior que zero, com até 3 casas decimais.');
 if(tipo==='saida'&&quantidade>item.quantidade)throw Error('Saída maior que o saldo disponível.');
 const depois=arredondar(item.quantidade+(tipo==='entrada'?quantidade:-quantidade));
 const resumo=`${tipo==='entrada'?'ENTRADA':'SAÍDA'} — ${item.codigo??'Sem código'} · ${item.nome}\nQuantidade: ${formatar(quantidade)}\nSaldo: ${formatar(item.quantidade)} → ${formatar(depois)}`;
 return confirmar(`Confirmação 1 de 2\n\n${resumo}\n\nOs dados estão corretos?`)&&confirmar(`Confirmação final — 2 de 2\n\n${resumo}\n\nConfirmar o registro desta movimentação?`);
}
