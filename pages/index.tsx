"use client";
import { useEffect, useMemo, useState } from 'react';
import { createWallet, getStored, unlock, clearWallet } from '../lib/keystore';
import usdtAbi from '../lib/abi/usdt.json';

type AppCfg={fullnode:string;soliditynode:string;usdt:string;forwarder:string;flatFeeUSDT:number;chainId:number;};

export default function Home(){
  const [cfg,setCfg]=useState<AppCfg|null>(null);
  const [msg,setMsg]=useState<string>('Cargando...');
  const [address,setAddress]=useState<string>('');
  const [locked,setLocked]=useState<boolean>(true);
  const [allowance,setAllowance]=useState<string>('0');
  const [to,setTo]=useState<string>(''); const [amount,setAmount]=useState<string>('');

  // Cargar config + wallet
  useEffect(()=>{(async()=>{
    try{
      const c=await fetch('/api/config').then(r=>r.json()); setCfg(c);
      const TW=require('tronweb'); const TronWeb=TW.default||TW;
      let stored=getStored();
      if(!stored){ const p=prompt('Crea una contraseña para tu wallet:')||''; if(!p){setMsg('Necesitas una contraseña.');return;}
        stored=await createWallet(p,TronWeb); const pk=await unlock(p); setAddress(stored.addressBase58); setLocked(false);
        await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({addressBase58:stored.addressBase58})});
        await autoActivateIfNeeded(new TronWeb({fullHost:c.fullnode,solidityNode:c.soliditynode,privateKey:pk}), stored.addressBase58, c);
      } else { setAddress(stored.addressBase58); const p=prompt('Contraseña de tu wallet:')||''; const pk=await unlock(p); setLocked(false);
        await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({addressBase58:stored.addressBase58})});
        await autoActivateIfNeeded(new TronWeb({fullHost:c.fullnode,solidityNode:c.soliditynode,privateKey:pk}), stored.addressBase58, c);
      }
    }catch(e:any){ setMsg('Error: '+(e?.message||e)); }
  })();},[]);

  const [pk,setPk]=useState<string>('');
  const TronWeb=useMemo<any>(()=>{ if(typeof window==='undefined') return null; const TW=require('tronweb'); return TW.default||TW; },[]);
  const tronWeb=useMemo<any>(()=>{ if(!TronWeb||!pk||!cfg) return null; return new TronWeb({fullHost:cfg.fullnode,solidityNode:cfg.soliditynode,privateKey:pk}); },[TronWeb,pk,cfg]);

  async function autoActivateIfNeeded(tw:any, addr:string, c:AppCfg){
    if(!c.forwarder){ setMsg('⚠️ Falta FORWARDER_ADDRESS en Vercel'); return; }
    try{
      const usdt=await tw.contract(usdtAbi, c.usdt);
      const cur=await usdt.allowance(addr, c.forwarder).call(); setAllowance(cur.toString());
      if(BigInt(cur.toString())===0n){
        setMsg('Activando: patrocinio + approve...');
        await fetch('/api/delegate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userBase58:addr})});
        const txid=await usdt.approve(c.forwarder,'1000000000000000').send({feeLimit:100_000_000});
        setMsg('Approve enviado: '+txid); setAllowance('1000000000000000');
      } else { setMsg('Listo para enviar.'); }
    }catch(e:any){ setMsg('No se pudo activar: '+(e?.message||e)); }
  }

  function toUSDT(h:string){ const [i,d='']=h.split('.'); const dec=(d+'000000').slice(0,6); return (BigInt(i||'0')*10n**6n)+BigInt(dec||'0'); }

  async function sendGasless(){
    if(!tronWeb||!cfg) return setMsg('No listo.');
    if(!cfg.forwarder) return setMsg('⚠️ Falta FORWARDER_ADDRESS en Vercel');
    if(!to||!amount) return setMsg('Escribe destino y monto');
    try{
      const from=address; const amt=toUSDT(amount); const fee=BigInt(cfg.flatFeeUSDT); const dl=BigInt(Math.floor(Date.now()/1000)+10*60);
      const fwdHex=tronWeb.address.toHex(cfg.forwarder);
      const encoded=tronWeb.utils.abi.encodeParams(['bytes32','address','uint256','address','address','uint256','uint256','uint256'],
        [tronWeb.utils.sha3('FORWARDER_TX'),fwdHex,cfg.chainId,tronWeb.address.toHex(from),tronWeb.address.toHex(to),amt.toString(),fee.toString(),dl.toString()]);
      const digest=tronWeb.utils.sha3(encoded);
      const sigHex=await tronWeb.trx.sign(digest,pk); const sig=sigHex.replace(/^0x/i,''); const r='0x'+sig.slice(0,64); const s='0x'+sig.slice(64,128); let v=parseInt(sig.slice(128,130),16); if(v<27)v+=27;
      setMsg('Enviando...'); const resp=await fetch('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to,amount:amt.toString(),deadline:dl.toString(),v,r,s})}).then(r=>r.json());
      if(!resp.ok) throw new Error(resp.error||'relay failed'); setMsg('Listo. TXID: '+resp.txid);
    }catch(e:any){ setMsg('Fallo envío: '+(e?.message||e)); }
  }

  async function desbloquear(){
    if(!cfg) return;
    try{ const p=prompt('Contraseña de tu wallet:')||''; const priv=await unlock(p); setPk(priv); setLocked(false); setMsg('Wallet desbloqueada.'); }catch{ setMsg('Contraseña incorrecta'); }
  }
  function borrar(){ clearWallet(); setAddress(''); setPk(''); setLocked(true); setAllowance('0'); setMsg('Wallet borrada.'); }

  return (<div style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'ui-sans-serif, system-ui'}}>
    <h1 style={{fontSize:28,fontWeight:700}}>TRON Wallet Gas-Free — Súper Simple</h1>
    <p style={{opacity:0.8}}>Tus clientes envían USDT sin TRX. Tu sistema paga el gas y cobra comisión fija.</p>

    <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
      {locked && <button onClick={desbloquear} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Desbloquear</button>}
      <button onClick={borrar} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Borrar Wallet</button>
    </div>
  </div> 
);
    <div style={{marginTop:16,fontSize:14}}>
      <div><b>Wallet:</b> {address || 'no creada'}</div>
      <div><b>Estado:</b> {locked ? 'bloqueada' : (address ? 'desbloqueada' : '—')}</div>
      <div><b>Allowance actual:</b> {allowance}</div>
    </div>

    <hr style={{margin:'24px 0'}}/>

    <div style={{display:'grid',gap:12}}>
      <input placeholder="Destino (base58)" value={to} onChange={e=>setTo(e.target.value)} style={{padding:10,borderRadius:10,border:'1px solid #ddd'}}/>
      <input placeholder="Monto USDT (ej. 25.50)" value={amount} onChange={e=>setAmount(e.target.value)} style={{padding:10,borderRadius:10,border:'1px solid #ddd'}}/>
      <button onClick={sendGasless} disabled={!address||locked} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Enviar USDT (Gas-Free)</button>
    <details style={{marginTop:16}}>
  <summary><b>Respaldo de la wallet</b></summary>
  <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
    <button onClick={mostrarPK} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ddd'}}>Mostrar clave privada</button>
    <button onClick={descargarRespaldo} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ddd'}}>Descargar respaldo cifrado (.json)</button>
  </div>
  <p style={{fontSize:12,opacity:0.8,marginTop:8}}>Guárdalo en un lugar seguro. Con la clave privada cualquiera puede mover tus fondos.</p>
</details>


    <pre style={{background:'#0f172a',color:'#e2e8f0',padding:16,borderRadius:12,marginTop:20,fontSize:12}}>{msg}</pre>
  </div>);
}
