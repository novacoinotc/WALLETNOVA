"use client";
import { useState, useEffect } from 'react';

// Helpers para obtener/guardar config en localStorage
function getCfg(key, def){
  if (typeof window === 'undefined') return def;
  return localStorage.getItem(key) || def;
}
function setCfg(key, val){
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, val);
}

const FULLNODE_LS = getCfg("FULLNODE", process.env.NEXT_PUBLIC_TRON_FULLNODE || "https://api.trongrid.io");
const SOLNODE_LS = getCfg("SOLNODE", process.env.NEXT_PUBLIC_TRON_SOLIDITYNODE || "https://api.trongrid.io");

const USDT   = getCfg("USDT", process.env.NEXT_PUBLIC_USDT_ADDRESS || "");
const FORWARDER = getCfg("FORWARDER", process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "");
const FLAT_FEE = getCfg("FLAT_FEE", process.env.NEXT_PUBLIC_FLAT_FEE_USDT || "2000000");

const FULLNODE = FULLNODE_LS;
const SOLNODE = SOLNODE_LS;

export default function Home(){
  const [wallet, setWallet] = useState("no conectada");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div style={{padding:"20px"}}>
      <h1>TRON Wallet Gas-Free — Embedded</h1>
      <p>Wallet: {wallet}</p>
      <p>FULLNODE: {FULLNODE}</p>
      <p>SOLNODE: {SOLNODE}</p>
      <p>USDT: {USDT}</p>
      <p>FORWARDER: {FORWARDER}</p>
      <p>FLAT_FEE: {FLAT_FEE}</p>
      <input placeholder="Destino" value={dest} onChange={e=>setDest(e.target.value)}/>
      <input placeholder="Monto USDT" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <button onClick={()=>setMsg("Enviar USDT en construcción")}>Enviar USDT</button>
      <p>{msg}</p>
    </div>
  );
}
