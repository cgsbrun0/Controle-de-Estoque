import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {criarApp} from './app';
const production=process.argv.includes('--production')||process.env.NODE_ENV==='production';
const root=fileURLToPath(new URL('../',import.meta.url));
const app=criarApp({production,url:process.env.APP_URL});
if(production){app.use(express.static(path.join(root,'dist'),{index:false}));app.get('/{*path}',(_req,res)=>{res.setHeader('Cache-Control','no-cache');res.sendFile(path.join(root,'dist/index.html'))})}
else{const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares)}
const porta=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
app.listen(porta,host,()=>console.log(`Controle de estoque disponível em ${process.env.APP_URL||`http://localhost:${porta}`}`));
