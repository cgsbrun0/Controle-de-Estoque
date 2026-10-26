import {backup} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {sqlite} from '../lib/database';
const pasta=path.resolve(process.env.BACKUP_DIR||'backups');mkdirSync(pasta,{recursive:true,mode:0o700});
const destino=path.join(pasta,`estoque-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
try{await backup(sqlite,destino);chmodSync(destino,0o600);console.log(`Backup concluído: ${destino}`)}finally{sqlite.close()}
