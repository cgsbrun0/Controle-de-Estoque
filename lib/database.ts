import 'dotenv/config';
import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export const dbPath=path.resolve(root,process.env.DB_PATH||'data/estoque.sqlite');
mkdirSync(path.dirname(dbPath),{recursive:true,mode:0o700});
export const sqlite=new DatabaseSync(dbPath);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations(nome TEXT PRIMARY KEY,aplicado_em TEXT NOT NULL)');
for(const arquivo of readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort()){
 if(sqlite.prepare('SELECT nome FROM _migrations WHERE nome=?').get(arquivo))continue;
 sqlite.exec('BEGIN IMMEDIATE');
 try{sqlite.exec(readFileSync(path.join(root,'migrations',arquivo),'utf8').replaceAll('--> statement-breakpoint',''));sqlite.prepare('INSERT INTO _migrations VALUES(?,?)').run(arquivo,new Date().toISOString());sqlite.exec('COMMIT');}
 catch(e){sqlite.exec('ROLLBACK');throw e;}
}
// Métodos síncronos preservam a mesma conexão durante toda a transação.
class BoundQuery{
 constructor(private query:string,private values:SQLInputValue[]){}
 all<T=Record<string,unknown>>(){return{results:sqlite.prepare(this.query).all(...this.values) as T[]}}
 first<T=Record<string,unknown>>(){return(sqlite.prepare(this.query).get(...this.values) as T|undefined)??null}
 run(){return sqlite.prepare(this.query).run(...this.values)}
}
export const database={prepare:(query:string)=>({bind:(...values:SQLInputValue[])=>new BoundQuery(query,values)}),batch:(queries:BoundQuery[])=>{
 sqlite.exec('BEGIN IMMEDIATE');try{const results=queries.map(q=>q.all());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}
}};
