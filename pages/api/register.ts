export const config = { runtime: "nodejs" };
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { addressBase58 } = req.body as { addressBase58: string };
  if (!addressBase58) return res.status(400).json({ error: 'addressBase58 required' });
  return res.status(200).json({ ok: true });
}
