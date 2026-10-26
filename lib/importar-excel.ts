import type {Workbook,Worksheet,Cell} from 'exceljs';
import {validarLinha,chaveCodigo,saldo,arredondar,type LinhaImportada} from './estoque';
const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases:Record<string,string[]>={codigo:['CODIGO'],nome:['NOMEDOPRODUTO','NOMEDOITEM','PRODUTO'],tipo:['TIPO'],minimo:['ESTMIN','ESTOQUEMINIMO','ESTMINIMO'],atualPlanilha:['ESTOQUEATUAL'],inicial:['ESTOQUEINICIALBASE','ESTOQUEINICIAL'],entradas:['TOTALENTRADAS'],saidas:['TOTALSAIDAS']};
function valor(c:Cell):unknown {const v=c.value;if(v&&typeof v==='object'){if('formula'in v||'sharedFormula'in v)return c.result;if('richText'in v)return v.richText.map(t=>t.text).join('');if('text'in v)return v.text;}return v;}
function texto(c:Cell){const v=valor(c);return v===undefined||v===null?'':String(v).trim();}
function codigo(c:Cell){const v=valor(c);if(typeof v==='number'&&/^0+$/.test(c.numFmt??''))return String(v).padStart(c.numFmt.length,'0');return texto(c);}
function numero(c:Cell,campo:string,linha:number){const v=valor(c);if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&/^-?\d+(?:[.,]\d+)?$/.test(v.trim()))return Number(v.replace(',','.'));throw Error(`Linha ${linha}: ${campo} está vazio ou não é um número. Preencha na planilha.`);}
export function localizarCabecalho(sheet:Worksheet){for(let n=1;n<=Math.min(sheet.rowCount,20);n++){const row=sheet.getRow(n),mapa:Record<string,number>={};row.eachCell((cell,col)=>{const k=normalizar(texto(cell));for(const [campo,nomes]of Object.entries(aliases))if(nomes.includes(k))mapa[campo]=col;});if(['codigo','nome','tipo','minimo','inicial','entradas','saidas'].every(k=>mapa[k]))return{linha:n,mapa};}return null;}
export function abasCompativeis(w:Workbook){return w.worksheets.filter(s=>localizarCabecalho(s)).map(s=>s.name);}
export function analisarAba(w:Workbook,nome:string){const sheet=w.getWorksheet(nome);if(!sheet)throw Error('Aba não encontrada.');const cab=localizarCabecalho(sheet);if(!cab)throw Error('A aba precisa conter Código, Nome do produto, Tipo, Est. mín., Estoque inicial, Total entradas e Total saídas.');
 const itens:LinhaImportada[]=[],erros:string[]=[],incompletos:string[]=[],chaves=new Set<string>();const {mapa}=cab;
 for(let n=cab.linha+1;n<=sheet.rowCount;n++){
  const r=sheet.getRow(n);if(!texto(r.getCell(mapa.nome))){if(texto(r.getCell(mapa.codigo)))incompletos.push(`Linha ${n}: código ${codigo(r.getCell(mapa.codigo))} sem nome do produto; não será importado.`);continue;}
  try{const l:LinhaImportada={codigo:codigo(r.getCell(mapa.codigo)),nome:texto(r.getCell(mapa.nome)),tipo:texto(r.getCell(mapa.tipo)),minimo:numero(r.getCell(mapa.minimo),'Est. mín.',n),inicial:numero(r.getCell(mapa.inicial),'Estoque inicial',n),entradas:numero(r.getCell(mapa.entradas),'Total entradas',n),saidas:numero(r.getCell(mapa.saidas),'Total saídas',n),atualPlanilha:null,linha:n};
   if(mapa.atualPlanilha){const v=valor(r.getCell(mapa.atualPlanilha));if(typeof v==='number'&&Number.isFinite(v))l.atualPlanilha=v;}
   validarLinha(l);const chave=chaveCodigo(l.codigo);if(chaves.has(chave))throw Error(`Código duplicado: ${l.codigo}.`);chaves.add(chave);itens.push(l);
  }catch(e){erros.push(`Linha ${n}: ${(e as Error).message.replace(/^Linha \d+: /,'')}`);}
  if(itens.length+erros.length>5000)throw Error('Importe no máximo 5.000 linhas por arquivo.');
 }
 const divergencias=itens.filter(i=>i.atualPlanilha!==null&&Math.abs(arredondar(i.atualPlanilha)-saldo(i))>0.0001),negativos=itens.filter(i=>saldo(i)<0);
 return{itens,erros,incompletos,divergencias,negativos};
}
export type AnaliseExcel=ReturnType<typeof analisarAba>;
