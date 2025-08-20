import type { NextApiRequest, NextApiResponse } from 'next';
import { tronWeb } from '@/lib/tronweb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { userBase58, energy } = req.body as { userBase58: string, energy?: number };
    if (!userBase58) return res.status(400).json({ error: 'userBase58 required' });

    const amount = energy ?? parseInt(process.env.DELEGATE_ENERGY_AMOUNT || '300000', 10);
    const receipt = await tronWeb.trx.delegateResource(amount, userBase58, 'ENERGY', true);
    return res.status(200).json({ ok: true, receipt });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'delegate failed' });
  }
}
