import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Package,LogOut} from 'lucide-react';
import Home from '../app/page';
import '../app/globals.css';
type Sessao={username:string;estoque:string};
function App(){
 const [sessao,setSessao]=useState<Sessao|null>(null),[carregando,setCarregando]=useState(true),[erro,setErro]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[entrando,setEntrando]=useState(false);
 useEffect(()=>{fetch('/api/auth/session').then(async r=>{if(r.ok)setSessao(await r.json() as Sessao);else if(r.status!==401)setErro('Não foi possível verificar sua sessão.')}).catch(()=>setErro('Não foi possível conectar ao servidor.')).finally(()=>setCarregando(false))},[]);
 async function entrar(e:React.FormEvent){e.preventDefault();setEntrando(true);setErro('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const d=await r.json() as Sessao&{error?:string};if(!r.ok)throw Error(d.error??'Falha ao entrar.');setPassword('');setSessao(d)}catch(e){setErro((e as Error).message)}finally{setEntrando(false)}}
 async function sair(){if(!window.confirm('Sair da sua conta? Lançamentos já confirmados continuarão salvos.'))return;try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Falha ao sair.');location.reload()}catch{window.alert('Não foi possível sair. Tente novamente.')}}
 if(carregando)return <div className="login-screen">Carregando…</div>;
 if(sessao)return <><div className="session-bar"><span>{sessao.username} · Estoque: {sessao.estoque}</span><button onClick={()=>void sair()}><LogOut size={14}/>Sair</button></div><Home/></>;
 return <main className="login-screen"><section className="login-card"><span className="logo"><Package size={26}/></span><h1>Controle de estoque<span>.</span></h1><p>Entre para cadastrar itens e registrar movimentações.</p><form className="stock-form" onSubmit={entrar}><label>Usuário<input autoComplete="username" required value={username} maxLength={80} onChange={e=>setUsername(e.target.value)} disabled={entrando}/></label><label>Senha<input type="password" autoComplete="current-password" required value={password} maxLength={256} onChange={e=>setPassword(e.target.value)} disabled={entrando}/></label>{erro&&<div className="error" role="alert">{erro}</div>}<button className="primary" disabled={entrando}>{entrando?'Entrando…':'Entrar'}</button></form><p className="login-help">O administrador cria os usuários pelo comando informado no README.</p></section></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
