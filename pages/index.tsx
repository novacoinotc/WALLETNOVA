import { useEffect, useState } from 'react';
import usdtAbi from '@/lib/abi/usdt.json';

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
  }
}

const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS || process.env.USDT_ADDRESS;
const FORWARDER = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || process.env.FORWARDER_ADDRESS;
const FLAT_FEE = process.env.NEXT_PUBLIC_FLAT_FEE_USDT || process.env.FLAT_FEE_USDT || '2000000'; // default 2 USDT

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>(''); // human
  const [status, setStatus] = useState<string>('Ready.');
  const [allowance, setAllowance] = useState<string>('0');

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        if (window.tronWeb && window.tronWeb.ready) {
          const addr = window.tronWeb.defaultAddress?.base58 || '';
          setAddress(addr);
          setConnected(!!addr);
        }
      } catch {}
    }, 800);
    return () => clearInterval(timer);
  }, []);

  async function connect() {
    if (!window.tronLink) {
      setStatus('Instala TronLink primero.');
      return;
    }
    try {
      await window.tronLink.request({ method: 'tron_requestAccounts' });
      const addr = window.tronWeb.defaultAddress.base58;
      setAddress(addr);
      setConnected(true);
      setStatus('Conectado.');
    } catch (e: any) {
      setStatus('No se pudo conectar: ' + (e?.message || e));
    }
  }

  function toUSDTUnits(human: string) {
    const [i, d=''] = human.split('.');
    const dec = (d + '000000').slice(0, 6);
    const big = BigInt((i || '0')) * 10n**6n + BigInt(dec || '0');
    return big;
  }

  async function readAllowance() {
    if (!connected || !USDT || !FORWARDER) return;
    try {
      const tronWeb = window.tronWeb;
      const usdt = await tronWeb.contract(usdtAbi, USDT);
      const value = await usdt.allowance(address, FORWARDER).call();
      setAllowance(value.toString());
    } catch (e: any) {
      setStatus('Error leyendo allowance: ' + (e?.message || e));
    }
  }

  async function activate() {
    if (!connected || !USDT || !FORWARDER) {
      setStatus('Falta USDT o FORWARDER en configuración');
      return;
    }
    try {
      setStatus('Delegando Energy...');
      await fetch('/api/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userBase58: address })
      }).then(r => r.json()).then(j => {
        if (!j.ok) throw new Error(j.error || 'delegate failed');
      });

      setStatus('Firmando approve en TronLink...');
      const tronWeb = window.tronWeb;
      const usdt = await tronWeb.contract(usdtAbi, USDT);
      const max = '1000000000000000'; // 1e15
      const txid = await usdt.approve(FORWARDER, max).send({ feeLimit: 100_000_000 });
      setStatus('Approve enviado: ' + txid);

      setTimeout(readAllowance, 2000);
    } catch (e: any) {
      setStatus('Activación falló: ' + (e?.message || e));
    }
  }

  async function signOrder(fromBase58: string, toBase58: string, amountHuman: string, minutesValid = 10) {
    const tronWeb = window.tronWeb;
    const fromHex = tronWeb.address.toHex(fromBase58);
    const toHex = tronWeb.address.toHex(toBase58);

    const amount = toUSDTUnits(amountHuman);
    const fee = BigInt(FLAT_FEE || '2000000');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + minutesValid * 60);

    const encoded = tronWeb.utils.abi.encodeParams(
      ['address','address','uint256','uint256','uint256'],
      [fromHex, toHex, amount.toString(), fee.toString(), deadline.toString()]
    );
    const digest = tronWeb.utils.sha3(encoded);

    let sigHex: string;
    if (tronWeb.trx.signMessageV2) {
      sigHex = await tronWeb.trx.signMessageV2(digest);
    } else if (tronWeb.trx.sign) {
      sigHex = await tronWeb.trx.sign(digest);
    } else {
      throw new Error('No signing method available in TronLink');
    }

    const sig = sigHex.replace(/^0x/i, '');
    const r = '0x' + sig.slice(0, 64);
    const s = '0x' + sig.slice(64, 128);
    let v = parseInt(sig.slice(128, 130), 16);
    if (v < 27) v += 27;

    return { from: fromBase58, to: toBase58, amount: amount.toString(), deadline: deadline.toString(), v, r, s };
  }

  async function sendGasless() {
    if (!connected) return setStatus('Conecta TronLink');
    if (!to || !amount) return setStatus('Captura destino y monto');
    try {
      setStatus('Firmando orden...');
      const order = await signOrder(address, to, amount);
      setStatus('Reenviando via relayer...');
      const resp = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      }).then(r => r.json());
      if (!resp.ok) throw new Error(resp.error || 'relay failed');
      setStatus('Enviado: ' + resp.txid);
    } catch (e: any) {
      setStatus('Fallo envío: ' + (e?.message || e));
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>TRON Wallet Gas‑Free — USDT</h1>
      <p style={{ opacity: 0.8 }}>Demostración: delega Energy para approve inicial y luego envía USDT sin TRX usando un relayer.</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={connect} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>
          {connected ? 'Conectado' : 'Conectar TronLink'}
        </button>
        <button onClick={activate} disabled={!connected} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>
          Activar (Approve sin TRX)
        </button>
        <button onClick={readAllowance} disabled={!connected} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>
          Ver Allowance
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <div><b>Wallet:</b> {connected ? address : 'no conectada'}</div>
        <div><b>Allowance actual:</b> {allowance}</div>
      </div>

      <hr style={{ margin: '24px 0' }} />

      <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Destino (base58)" value={to} onChange={e => setTo(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <input placeholder="Monto USDT (ej. 25.50)" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd' }} />
        <button onClick={sendGasless} disabled={!connected} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd' }}>
          Enviar USDT (Gas‑Free)
        </button>
      </div>

      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 12, marginTop: 20, fontSize: 12 }}>
        {status}
      </pre>

      <div style={{ marginTop: 20, fontSize: 12, opacity: 0.8 }}>
        <p><b>Nota:</b> Establece variables en Vercel: <code>RELAYER_PRIVATE_KEY, TRON_FULLNODE, TRON_SOLIDITYNODE, USDT_ADDRESS, FORWARDER_ADDRESS, FLAT_FEE_USDT, DELEGATE_ENERGY_AMOUNT</code>.</p>
      </div>
    </div>
  );
}
