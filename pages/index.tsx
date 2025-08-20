
import {useEffect,useMemo,useState} from 'react';
import {createWallet,getStored,unlock,clearWallet} from '../lib/keystore';
import usdtAbi from '../lib/abi/usdt.json';
const USDT=process.env.NEXT_PUBLIC_USDT_ADDRESS||process.env.USDT_ADDRESS;
const FORWARDER=process.env.NEXT_PUBLIC_FORWARDER_ADDRESS||process.env.FORWARDER_ADDRESS;
const FLAT_FEE=process.env.NEXT_PUBLIC_FLAT_FEE_USDT||process.env.FLAT_FEE_USDT||'2000000';
const FULLNODE=process.env.NEXT_PUBLIC_TRON_FULLNODE||'';
const SOLNODE=process.env.NEXT_PUBLIC_TRON_SOLIDITYNODE||'';

export default function Home(){
 const [status,setStatus]=useState('Listo.');
 const [address,setAddress]=useState(''); const [locked,setLocked]=useState(true);
 const [to,setTo]=useState(''); const [amount,setAmount]=useState(''); const [allowance,setAllowance]=useState('0');
 const TronWeb=useMemo(()=>{ if(typeof window==='undefined') return null; const TW=require('tronweb'); return TW.default||TW; },[]);
 const [pk,setPk]=useState(''); const tronWeb=useMemo(()=>{ if(!TronWeb||!pk||!FULLNODE||!SOLNODE) return null; return new TronWeb({fullHost:FULLNODE,solidityNode:SOLNODE,privateKey:pk}); },[TronWeb,pk,FULLNODE,SOLNODE]);

 useEffect(()=>{ const stored=getStored(); if(stored){ setAddress(stored.addressBase58); setLocked(true); setStatus('Wallet detectada. Ingresa contraseña para desbloquear.'); } else { setStatus('Crea una wallet local con contraseña.'); } },[]);

 async function createLocalWallet(){ if(!TronWeb) return setStatus('Cargando TronWeb...'); const pass=prompt('Elige una contraseña para cifrar tu wallet:'); if(!pass) return;
  const stored=await createWallet(pass,TronWeb); setAddress(stored.addressBase58); setLocked(false); const pkNow=await unlock(pass); setPk(pkNow); setStatus('Wallet creada y desbloqueada.'); }

 async function unlockWallet(){ const pass=prompt('Contraseña de tu wallet:'); if(!pass) return; try{ const pkNow=await unlock(pass); setPk(pkNow); setLocked(false); setStatus('Wallet desbloqueada.'); }catch{ setStatus('Contraseña incorrecta.'); } }

 function toUSDTUnits(h:string){ const [i,d='']=h.split('.'); const dec=(d+'000000').slice(0,6); return BigInt((i||'0'))*10n**6n+BigInt(dec||'0'); }

 async function readAllowance(){ if(!tronWeb||!USDT||!FORWARDER) return; try{ const usdt=await tronWeb.contract(usdtAbi,USDT); const v=await usdt.allowance(address,FORWARDER).call(); setAllowance(v.toString()); }catch(e:any){ setStatus('Error leyendo allowance: '+(e?.message||e)); } }

 async function activate(){ if(!tronWeb||!USDT||!FORWARDER) return setStatus('Falta configurar USDT/FORWARDER o nodos');
  try{ setStatus('Delegando Energy...'); const r=await fetch('/api/delegate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userBase58:address})}).then(r=>r.json()); if(!r.ok) throw new Error(r.error||'delegate failed');
   setStatus('Firmando approve...'); const usdt=await tronWeb.contract(usdtAbi,USDT); const max='1000000000000000'; const txid=await usdt.approve(FORWARDER,max).send({feeLimit:100_000_000}); setStatus('Approve enviado: '+txid); setTimeout(readAllowance,2000);
  }catch(e:any){ setStatus('Activación falló: '+(e?.message||e)); } }

 async function signAndRelay(){ if(!tronWeb) return setStatus('TronWeb no listo'); if(!to||!amount) return setStatus('Captura destino y monto');
  try{ const fromHex=tronWeb.address.toHex(address); const toHex=tronWeb.address.toHex(to); const amt=toUSDTUnits(amount); const fee=BigInt(FLAT_FEE||'2000000'); const deadline=BigInt(Math.floor(Date.now()/1000)+10*60);
   const encoded=tronWeb.utils.abi.encodeParams(['address','address','uint256','uint256','uint256'],[fromHex,toHex,amt.toString(),fee.toString(),deadline.toString()]); const digest=tronWeb.utils.sha3(encoded);
   const sigHex=await tronWeb.trx.sign(digest,pk); const sig=sigHex.replace(/^0x/i,''); const r='0x'+sig.slice(0,64); const s='0x'+sig.slice(64,128); let v=parseInt(sig.slice(128,130),16); if(v<27) v+=27;
   setStatus('Enviando al relayer...'); const resp=await fetch('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:address,to,amount:amt.toString(),deadline:deadline.toString(),v,r,s})}).then(r=>r.json());
   if(!resp.ok) throw new Error(resp.error||'relay failed'); setStatus('Enviado: '+resp.txid);
  }catch(e:any){ setStatus('Fallo envío: '+(e?.message||e)); } }

 function resetWallet(){ clearWallet(); setAddress(''); setPk(''); setLocked(true); setAllowance('0'); setStatus('Wallet borrada. Crea una nueva.'); }

 return (<div style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'ui-sans-serif, system-ui'}}>
  <h1 style={{fontSize:28,fontWeight:700}}>TRON Wallet Gas-Free — Embedded</h1>
  <p style={{opacity:0.8}}>Sin TronLink: la app genera y guarda tu llave local (cifrada), delega Energy para approve y envía USDT gas-free con un relayer.</p>
  <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
    {!address && <button onClick={createLocalWallet} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Crear Wallet</button>}
    {!!address && locked && <button onClick={unlockWallet} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Desbloquear</button>}
    {!!address && !locked && <button onClick={activate} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Activar (Approve sin TRX)</button>}
    {!!address && !locked && <button onClick={readAllowance} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Ver Allowance</button>}
    {!!address && <button onClick={resetWallet} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Borrar Wallet</button>}
  </div>
  <div style={{marginTop:16,fontSize:14}}>
    <div><b>Wallet:</b> {address||'no creada'}</div>
    <div><b>Estado:</b> {locked ? 'bloqueada' : (address ? 'desbloqueada' : '—')}</div>
    <div><b>Allowance actual:</b> {allowance}</div>
  </div>
  <hr style={{margin:'24px 0'}}/>
  <div style={{display:'grid',gap:12}}>
    <input placeholder="Destino (base58)" value={to} onChange={e=>setTo(e.target.value)} style={{padding:10,borderRadius:10,border:'1px solid #ddd'}}/>
    <input placeholder="Monto USDT (ej. 25.50)" value={amount} onChange={e=>setAmount(e.target.value)} style={{padding:10,borderRadius:10,border:'1px solid #ddd'}}/>
    <button onClick={signAndRelay} disabled={!address||locked} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Enviar USDT (Gas-Free)</button>
  </div>
  <pre style={{background:'#0f172a',color:'#e2e8f0',padding:16,borderRadius:12,marginTop:20,fontSize:12}}>{status}</pre>
  <div style={{marginTop:20,fontSize:12,opacity:0.8}}><p><b>Client Nodes:</b> NEXT_PUBLIC_TRON_FULLNODE / NEXT_PUBLIC_TRON_SOLIDITYNODE deben estar configurados.</p></div>
 </div>);
}
