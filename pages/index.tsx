"use client";
import { useEffect, useMemo, useState } from 'react';
import { savePrivateKey, getStored, unlock, clearWallet, saveMnemonic, unlockMnemonic } from '../lib/keystore';
import { generateSeedWords, deriveTronPrivateKeyFromSeed } from '../lib/seed';

export default function Home(){
  const [msg,setMsg]=useState('');
  const [address,setAddress]=useState('');
  const [locked,setLocked]=useState(true);
  const [pk,setPk]=useState('');

  useEffect(()=>{(async()=>{
    const TW = require('tronweb'); const TronWeb = TW.default||TW;
    let stored=getStored();
    if(!stored){
      const words = generateSeedWords();
      alert('Guarda tu frase semilla (12 palabras):\n\n'+words);
      const pass = prompt('Crea una contraseña para cifrar tu wallet:')||''; if(!pass) return;
      await saveMnemonic(pass, words);
      const priv = deriveTronPrivateKeyFromSeed(words);
      stored = await savePrivateKey(pass, priv, TronWeb);
      setAddress(stored.addressBase58); setLocked(false); setPk(priv);
      setMsg('Wallet creada.');
    }else{
      const pass = prompt('Contraseña de tu wallet:')||'';
      try{ const priv=await unlock(pass); setPk(priv); setLocked(false); setAddress(stored.addressBase58); setMsg('Wallet desbloqueada.'); }
      catch{ setMsg('Contraseña incorrecta'); }
    }
  })();},[]);

  async function mostrarSeed(){
    try{
      const p=prompt('Contraseña de tu wallet:')||'';
      const words = await unlockMnemonic(p);
      alert('Frase semilla (12 palabras):\n\n'+words);
    }catch(e:any){ setMsg('No se pudo mostrar: '+(e?.message||e)); }
  }
  async function copiarSeed(){
    try{
      const p=prompt('Contraseña de tu wallet:')||'';
      const words = await unlockMnemonic(p);
      await navigator.clipboard.writeText(words);
      setMsg('Semilla copiada.');
    }catch(e:any){ setMsg('No se pudo copiar: '+(e?.message||e)); }
  }
  async function descargarSeed(){
    try{
      const p=prompt('Contraseña de tu wallet:')||'';
      const words = await unlockMnemonic(p);
      const blob = new Blob([words], {type:'text/plain'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='tron-seed.txt'; a.click(); URL.revokeObjectURL(url);
    }catch(e:any){ setMsg('No se pudo descargar: '+(e?.message||e)); }
  }
  function borrar(){ clearWallet(); setAddress(''); setPk(''); setLocked(true); setMsg('Wallet borrada.'); }

  return (<div style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'ui-sans-serif, system-ui'}}>
    <h1>TRON Wallet Gas-Free — Súper Simple (Semilla)</h1>
    <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
      <button onClick={borrar} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Borrar Wallet</button>
      <button onClick={mostrarSeed} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Mostrar frase semilla</button>
      <button onClick={copiarSeed} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Copiar semilla</button>
      <button onClick={descargarSeed} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #ddd'}}>Descargar semilla (.txt)</button>
    </div>
    <div style={{marginTop:12}}><b>Wallet:</b> {address||'—'} — <b>Estado:</b> {locked?'bloqueada':'desbloqueada'}</div>
    <pre style={{background:'#0f172a',color:'#e2e8f0',padding:16,borderRadius:12,marginTop:20,fontSize:12}}>{msg}</pre>
  </div>);
}
