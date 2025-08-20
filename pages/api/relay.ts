export const config = { runtime: "nodejs" };
import type { NextApiRequest, NextApiResponse } from 'next';
import { tronWeb } from '../../lib/tronweb';

const FORWARDER = process.env.FORWARDER_ADDRESS as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { from, to, amount, deadline, v, r, s } = req.body as {
      from: string; to: string; amount: string; deadline: string; v: number; r: string; s: string;
    };
    if (!FORWARDER) return res.status(400).json({ error: 'FORWARDER_ADDRESS not set' });
    if (!from || !to || !amount || !deadline || v === undefined || !r || !s) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const params = [
      { type: 'address', value: tronWeb.address.toHex(from) },
      { type: 'address', value: tronWeb.address.toHex(to) },
      { type: 'uint256', value: amount },
      { type: 'uint256', value: deadline },
      { type: 'uint8', value: v },
      { type: 'bytes32', value: r },
      { type: 'bytes32', value: s }
    ];

    const functionSelector = 'metaTransfer(address,address,uint256,uint256,uint8,bytes32,bytes32)';
    const options = { feeLimit: 100_000_000 };

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      tronWeb.address.toHex(FORWARDER),
      functionSelector,
      options,
      params
    );
    if (!tx?.transaction) throw new Error('triggerSmartContract failed');

    const signed = await tronWeb.trx.sign(tx.transaction);
    const receipt = await tronWeb.trx.sendRawTransaction(signed);
    return res.status(200).json({ ok: true, txid: receipt?.txid, raw: receipt });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'relay failed' });
  }
}
