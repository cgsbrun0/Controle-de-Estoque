import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import type {AddressInfo} from 'node:net';
import Excel from 'exceljs';
import {confirmarMovimento,normalizarCodigo,status} from '../lib/estoque';
import {analisarAba} from '../lib/importar-excel';

test('Dupla confirmação e lógica de status',()=>{
 const item={id:'teste',nome:'Item de teste',codigo:'0001',quantidade:5,minimo:5,versao:0,tipo:'Teste',inicial:5,entradas:0,saidas:0};
 assert.equal(status(item),'OK');assert.equal(status({...item,quantidade:4}),'ABAIXO DO MÍNIMO');assert.equal(status({...item,minimo:null}),'MÍNIMO NÃO INFORMADO');
 for(const respostas of [[false],[true,false],[true,true]]){let indice=0;assert.equal(confirmarMovimento(item,'entrada',2,()=>respostas[indice++]),respostas.every(Boolean));assert.equal(indice,respostas.length)}
 assert.throws(()=>confirmarMovimento(item,'saida',6,()=>true));assert.throws(()=>confirmarMovimento(item,'entrada',0,()=>true));assert.equal(normalizarCodigo('0001'),'1');
});

test('Leitura Excel preserva código e acusa campos ausentes',async()=>{
 const w=new Excel.Workbook(),s=w.addWorksheet('ESTOQUE ATUAL');s.addRow(['Código','Nome do produto','TIPO','EST.MIN','ESTOQUE ATUAL','ESTOQUE INICIAL (BASE)','TOTAL ENTRADAS','TOTAL SAÍDAS']);
 s.addRow([1,'Item de teste','Tipo de teste',5,10,10,2,1]);s.getCell('A2').numFmt='0000';
 s.addRow([2,null,'Tipo de teste',1,1,1,0,0]);s.addRow([3,'Incompleto','Tipo',null,0,0,0,0]);
 const a=analisarAba(w,'ESTOQUE ATUAL');assert.equal(a.itens[0].codigo,'0001');assert.equal(a.divergencias.length,1);assert.equal(a.incompletos.length,1);assert.equal(a.erros.length,1);
 if(process.env.XLSX_TEST_PATH){const real=new Excel.Workbook();await real.xlsx.readFile(process.env.XLSX_TEST_PATH);const b=analisarAba(real,'ESTOQUE ATUAL');assert.equal(b.itens.length,187);assert.equal(b.erros.length,0);assert.equal(b.divergencias.length,16);assert.equal(b.negativos.length,1);assert.equal(b.incompletos.length,168)}
});

test('API real: login, equipe, cadastro, importação, transações, histórico e backup',async()=>{
 const pasta=await mkdtemp(path.join(os.tmpdir(),'estoque-test-'));process.env.DB_PATH=path.join(pasta,'teste.sqlite');
 const {sqlite}=await import('../lib/database');const {hashSenha}=await import('../lib/senhas');const {criarApp}=await import('../server/app');
 const senha=randomBytes(24).toString('hex'),hash=await hashSenha(senha);
 for(const [username,estoque]of [['teste_a','equipe'],['teste_b','equipe'],['teste_c','separado']])sqlite.prepare('INSERT INTO usuarios VALUES(?,?,?,?,?)').run(randomUUID(),username,hash,estoque,new Date().toISOString());
 const servidor=criarApp().listen(0,'127.0.0.1');await new Promise<void>(resolve=>servidor.once('listening',()=>resolve()));const base=`http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
 let cookie='';
 async function call(rota:string,body?:unknown,method=body===undefined?'GET':'POST',origin=base){const r=await fetch(base+rota,{method,headers:{'Content-Type':'application/json',origin,...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{r,data:await r.json() as any};}
 async function login(nome:string){const {r}=await call('/api/auth/login',{username:nome,password:senha});assert.equal(r.status,200);cookie=r.headers.get('set-cookie')!.split(';')[0];assert.match(r.headers.get('set-cookie')!,/HttpOnly/);assert.match(r.headers.get('set-cookie')!,/SameSite=Strict/)}
 try{
  assert.equal((await call('/api/equipamentos')).r.status,401);assert.equal((await call('/api/auth/login',{username:'teste_a',password:'incorreta'})).r.status,401);
  await login('teste_a');assert.equal((await call('/api/auth/session')).data.username,'teste_a');
  assert.equal((await call('/api/equipamentos',{acao:'adicionar'},'POST','https://outro.invalid')).r.status,403);
  let r=await call('/api/equipamentos',{acao:'adicionar',codigo:'0001',nome:'Item de teste',tipo:'Teste',minimo:3,inicial:10});assert.equal(r.r.status,200,JSON.stringify(r.data));
  let item=(await call('/api/equipamentos')).data[0];assert.equal(item.quantidade,10);
  const movimento={id:randomUUID(),equipamentoId:item.id,tipo:'entrada',quantidade:2.5,versao:item.versao,confirmado:true,observacao:'Teste automatizado'};
  assert.equal((await call('/api/movimentos',movimento)).r.status,200);assert.equal((await call('/api/movimentos',movimento)).r.status,200);
  item=(await call('/api/equipamentos')).data[0];assert.equal(item.quantidade,12.5);assert.equal((await call('/api/movimentos')).data.length,1);
  assert.equal((await call('/api/movimentos',{...movimento,id:randomUUID()})).r.status,409);
  assert.equal((await call('/api/movimentos',{...movimento,id:randomUUID(),tipo:'saida',versao:item.versao,quantidade:13})).r.status,409);
  assert.equal((await call('/api/movimentos',{...movimento,id:randomUUID(),versao:item.versao,confirmado:false})).r.status,400);
  await login('teste_b');assert.equal((await call('/api/equipamentos')).data.length,1);
  assert.equal((await call('/api/movimentos',{...movimento,id:randomUUID(),tipo:'saida',versao:item.versao,quantidade:3})).r.status,200);
  let historico=(await call('/api/movimentos')).data;assert.equal(historico[0].autor,'teste_b');assert.equal(historico[0].saldoAntes,12.5);assert.equal(historico[0].saldoDepois,9.5);
  await login('teste_c');assert.equal((await call('/api/equipamentos')).data.length,0);assert.equal((await call('/api/movimentos',{...movimento,id:randomUUID(),versao:2})).r.status,409);
  await login('teste_a');item=(await call('/api/equipamentos')).data[0];
  assert.equal((await call('/api/equipamentos',{acao:'editar',id:item.id,versao:item.versao,codigo:'0001',nome:'Item editado',tipo:'Teste',minimo:9})).r.status,200);
  const linha={codigo:'0002',nome:'Importado de teste',tipo:'Teste',minimo:1,inicial:4,entradas:1,saidas:2,linha:2,atualPlanilha:3};
  const importacao={confirmado:true,arquivo:'Arquivo de teste',itens:[linha]};assert.equal((await call('/api/importar',importacao)).data.importados,1);assert.equal((await call('/api/importar',importacao)).data.importados,0);
  // Simula erro de gravação no histórico e verifica rollback do saldo.
  item=(await call('/api/equipamentos')).data.find((i:any)=>i.codigo==='0001');const falha=randomUUID();sqlite.exec(`CREATE TRIGGER falha_teste BEFORE INSERT ON movimentos WHEN NEW.id='${falha}' BEGIN SELECT RAISE(ABORT,'falha simulada'); END`);
  assert.equal((await call('/api/movimentos',{...movimento,id:falha,versao:item.versao})).r.status,500);assert.equal((await call('/api/equipamentos')).data.find((i:any)=>i.codigo==='0001').quantidade,9.5);sqlite.exec('DROP TRIGGER falha_teste');
  assert.equal((await call('/api/equipamentos',{id:item.id,confirmado:true},'DELETE')).r.status,200);assert.equal((await call('/api/movimentos')).data.length,2);
  execFileSync(process.execPath,['--import','tsx','scripts/backup.ts'],{cwd:process.cwd(),env:{...process.env,BACKUP_DIR:path.join(pasta,'backups')},stdio:'pipe'});assert.equal((await readdir(path.join(pasta,'backups'))).length,1);
  assert.equal((await call('/api/auth/logout',{})).r.status,200);assert.equal((await call('/api/equipamentos')).r.status,401);
 }finally{servidor.closeAllConnections();await new Promise<void>((resolve,reject)=>servidor.close(e=>e?reject(e):resolve()));sqlite.close();await rm(pasta,{recursive:true,force:true})}
});
