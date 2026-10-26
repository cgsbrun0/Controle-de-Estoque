import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derivar=promisify(scrypt);
export async function hashSenha(senha:string){
 if(senha.length<12||senha.length>256)throw Error('Use uma senha entre 12 e 256 caracteres.');
 const sal=randomBytes(16).toString('hex'),hash=await derivar(senha,sal,64) as Buffer;
 return `scrypt:${sal}:${hash.toString('hex')}`;
}
export async function verificarSenha(senha:string,armazenado:string){
 const [tipo,sal,hash]=armazenado.split(':');if(tipo!=='scrypt'||!sal||!hash||senha.length>256)return false;
 const esperado=Buffer.from(hash,'hex'),calculado=await derivar(senha,sal,64) as Buffer;
 return esperado.length===calculado.length&&timingSafeEqual(esperado,calculado);
}
