export const config = { runtime: "nodejs" };
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const fullnode = process.env.TRON_FULLNODE || 'https://api.trongrid.io';
  const soliditynode = process.env.TRON_SOLIDITYNODE || 'https://api.trongrid.io';
  const usdt = process.env.USDT_ADDRESS || '';
  const forwarder = process.env.FORWARDER_ADDRESS || '';
  const flatFeeUSDT = Number(process.env.FLAT_FEE_USDT || '2000000'); // 2 USDT con 6 decimales

  return res.status(200).json({
    fullnode, soliditynode, usdt, forwarder, flatFeeUSDT, chainId: 728126428
  });
}
