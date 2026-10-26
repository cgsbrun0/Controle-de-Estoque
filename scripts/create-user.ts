import {stdin,stdout} from 'node:process';
import {createInterface} from 'node:readline/promises';
import {randomUUID} from 'node:crypto';
import {sqlite} from '../lib/database';
import {hashSenha} from '../lib/senhas';
async function perguntarSenha(texto:string){
 if(!stdin.isTTY){const rl=createInterface({input:stdin,crlfDelay:Infinity});const resposta=await rl.question(texto);rl.close();return resposta}
 stdout.write(texto);stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
 return new Promise<string>((resolve,reject)=>{let senha='';const finalizar=()=>{stdin.off('data',ler);stdin.setRawMode(false);stdin.pause();stdout.write('\n')};const ler=(dados:string)=>{for(const c of dados){if(c==='\u0003'){finalizar();reject(Error('Operação cancelada.'));return}if(c==='\r'||c==='\n'){finalizar();resolve(senha);return}if(c==='\u007f'||c==='\b'){senha=Array.from(senha).slice(0,-1).join('')}else if(c>=' '){senha+=c}}};stdin.on('data',ler)});
}
const args=process.argv.slice(2),username=args[0],grupo=args.includes('--estoque')?args[args.indexOf('--estoque')+1]:'principal';
try{
 if(!username||!/^[-a-zA-Z0-9_.]{3,80}$/.test(username)||!grupo||!/^[-a-zA-Z0-9_.]{1,80}$/.test(grupo))throw Error('Uso: npm run usuario:criar -- usuario --estoque equipe\nUsuário: 3–80 letras, números, ponto, hífen ou sublinhado. Estoque padrão: principal.');
 const existente=sqlite.prepare('SELECT id,estoque_id FROM usuarios WHERE username=? COLLATE NOCASE').get(username) as {id:string;estoque_id:string}|undefined;
 if(existente&&!args.includes('--redefinir'))throw Error('Usuário já existe. Para trocar sua senha, use --redefinir.');
 if(existente&&args.includes('--estoque')&&existente.estoque_id!==grupo)throw Error('Não é possível mudar o estoque de um usuário por redefinição de senha.');
 const senha=await perguntarSenha('Senha (mínimo de 12 caracteres; não será exibida): '),confirmacao=await perguntarSenha('Confirme a senha: ');
 if(senha!==confirmacao)throw Error('As senhas não coincidem.');const hash=await hashSenha(senha);
 if(existente){sqlite.exec('BEGIN IMMEDIATE');try{sqlite.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(hash,existente.id);sqlite.prepare('DELETE FROM sessoes WHERE usuario_id=?').run(existente.id);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}
 else sqlite.prepare('INSERT INTO usuarios VALUES(?,?,?,?,?)').run(randomUUID(),username,hash,grupo,new Date().toISOString());
 console.log(existente?`Senha de ${username} redefinida e sessões encerradas.`:`Usuário ${username} criado no estoque ${grupo}.`);
}catch(e){console.error((e as Error).message);process.exitCode=1}finally{sqlite.close()}
