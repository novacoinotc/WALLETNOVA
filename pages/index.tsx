"use client";
import { useEffect, useMemo, useState } from 'react';
import { createWallet, getStored, unlock, clearWallet } from '../lib/keystore';
import usdtAbi from '../lib/abi/usdt.json';

type AppCfg = {
  fullnode: string;
  soliditynode: string;
  usdt: string;
  forwarder: string;
  flatFeeUSDT: number;
  chainId: number;
};

export default function Home() {
  const [cfg, setCfg] = useState<AppCfg | null>(null);
  const [status, setStatus] = useState<string>('Cargando...');
  const [address, setAddress] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(true);
  const [allowance, setAllowance] = useState<string>('0');
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  // Carga inicial: config + wallet + registro
  useEffect(() => {
    (async () => {
      try {
        const cfgResp = await fetch('/api/config').then(r => r.json());
        setCfg(cfgResp);
        setStatus('Configuración lista.');

        const TW = require('tronweb'); // solo cliente
        const TronWeb = TW.default || TW;

        let stored = getStored();
        if (!stored) {
          const pass = prompt('Crea una contraseña para tu wallet (se guarda cifrada en este navegador):') || '';
          if (!pass) { setStatus('Se requiere contraseña para crear la wallet.'); return; }
          stored = await createWallet(pass, TronWeb);
          const pkNow = await unlock(pass);
          setAddress(stored.addressBase58);
          setLocked(false);
          setStatus('Wallet creada y desbloqueada.');
          await fetch('/api/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ addressBase58: stored.addressBase58 }) });
          // Instanciar tronWeb y checar allowance
          const tw = new TronWeb({ fullHost: cfgResp.fullnode, solidityNode: cfgResp.soliditynode, privateKey: pkNow });
          await autoActivateIfNeeded(tw, stored.addressBase58, cfgResp);
        } else {
          setAddress(stored.addressBase58);
          const pass = prompt('Ingresa tu contraseña para desbloquear la wallet:') || '';
          const pkNow = await unlock(pass);
          setLocked(false);
          setStatus('Wallet desbloqueada.');
          await fetch('/api/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ addressBase58: stored.addressBase58 }) });
          const tw = new TronWeb({ fullHost: cfgResp.fullnode, solidityNode: cfgResp.soliditynode, privateKey: pkNow });
          await autoActivateIfNeeded(tw, stored.addressBase58, cfgResp);
        }
      } catch (e:any) {
        setStatus('Error inicializando: ' + (e?.message || e));
      }
    })();
  }, []);

  // Crea tronWeb por sesión cuando haya cfg y pk
  const [pk, setPk] = useState<string>('');
  const TronWeb = useMemo<any>(() => {
    if (typeof window === 'undefined') return null;
    const TW = require('tronweb');
    return TW.default || TW;
  }, []);
  const tronWeb = useMemo<any>(() => {
    if (!TronWeb || !pk || !cfg) return null;
    return new TronWeb({ fullHost: cfg.fullnode, solidityNode: cfg.soliditynode, privateKey: pk });
  }, [TronWeb, pk, cfg]);

  async function autoActivateIfNeeded(tw: any, addr: string, cfg: AppCfg) {
    try {
      const usdt = await tw.contract(usdtAbi, cfg.usdt);
      const current = await usdt.allowance(addr, cfg.forwarder).call();
      setAllowance(current.toString());

      if (BigInt(current.toString()) === 0n) {
        setStatus('Sin allowance: patrocinando Energy y aprobando automáticamente...');
        await fetch('/api/delegate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userBase58: addr }) }).then(r=>r.json());
        const max = '1000000000000000'; // 1e15
        const txid = await usdt.approve(cfg.forwarder, max).send({ feeLimit: 100_000_000 });
        setStatus('Approve enviado: ' + txid);
        setAllowance(max);
      } else {
        setStatus('Allowance OK. Listo para enviar.');
      }
    } catch (e:any) {
      setStatus('No se pudo verificar/activar allowance: ' + (e?.message || e));
    }
  }

  function toUSDTUnits(h: string) {
    const [i, d=''] = h.split('.');
    const dec = (d + '000000').slice(0,6);
    return (BigInt(i || '0') * 10n**6n) + BigInt(dec || '0');
  }

  async function sendGasless() {
    if (!tronWeb || !cfg) return setStatus('No listo.');
    if (!to || !amount) return setStatus('Captura destino y monto');
    try {
      const from = address;
      const toB = to;
      const amountU = toUSDTUnits(amount);
      const fee = BigInt(cfg.flatFeeUSDT);
      const deadline = BigInt(Math.floor(Date.now()/1000) + 10*60);

      // Hash simple con dominio (address(this), chainId) definido también en el contrato
      const fwdHex = tronWeb.address.toHex(cfg.forwarder);
      const encoded = tronWeb.utils.abi.encodeParams(
        ['bytes32','address','uint256','address','address','uint256','uint256','uint256'],
        [tronWeb.utils.sha3('FORWARDER_TX'), fwdHex, cfg.chainId, tronWeb.address.toHex(from), tronWeb.address.toHex(toB), amountU.toString(), fee.toString(), deadline.toString()]
      );
      const digest = tronWeb.utils.sha3(encoded);

      const sigHex = await tronWeb.trx.sign(digest, pk);
      const sig = sigHex.replace(/^0x/i,'');
      const r = '0x' + sig.slice(0,64);
      const s = '0x' + sig.slice(64,128);
      let v = parseInt(sig.slice(128,130), 16); if (v < 27) v += 27;

      setStatus('Enviando al relayer...');
      const resp = await fetch('/api/relay', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ from, to: toB, amount: amountU.toString(), deadline: deadline.toString(), v, r, s })
      }).then(r=>r.json());
      if (!resp.ok) throw new Error(resp.error || 'relay failed');
      setStatus('Enviado: ' + resp.txid);
    } catch (e:any) {
      setStatus('Fallo envío: ' + (e?.message || e));
    }
  }

  async function unlockWallet() {
    if (!cfg) return;
    try {
      const pass = prompt('Contraseña de tu wallet:') || '';
      const pkNow = await unlock(pass);
      setPk(pkNow);
      setLocked(false);
      setStatus('Wallet desbloqueada.');
    } catch {
      setStatus('Contraseña incorrecta.');
    }
  }

  function resetWallet(){
    clearWallet(); setAddress(''); setPk(''); setLocked(true); setAllowance('0'); setStatus('Wallet borrada.');
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>TRON Wallet Gas-Free — Auto</h1>
      <p style={{ opacity: 0.8 }}>Crea wallet, activa y envía USDT sin TRX. Tu servicio paga el gas y cobra comisión fija.</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        {locked && <button onClick={unlockWallet} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>Desbloquear</button>}
        <button onClick={resetWallet} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>Borrar Wallet</button>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <div><b>Wallet:</b> {address || 'no creada'}</div>
        <div><b>Estado:</b> {locked ? 'bloqueada' : (address ? 'desbloqueada' : '—')}</div>
        <div><b>Allowance actual:</b> {allowance}</div>
      </div>

      <hr style={{ margin: '24px 0' }} />

      <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Destino (base58)" value={to} onChange={e=>setTo(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <input placeholder="Monto USDT (ej. 25.50)" value={amount} onChange={e=>setAmount(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <button onClick={sendGasless} disabled={!address || locked || !cfg} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>
          Enviar USDT (Gas-Free)
        </button>
      </div>

      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 12, marginTop: 20, fontSize: 12 }}>
        {status}
      </pre>
    </div>
  );
}
