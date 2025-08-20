import TronWeb from 'tronweb';

const fullHost = process.env.TRON_FULLNODE || 'https://api.trongrid.io';
const solidityHost = process.env.TRON_SOLIDITYNODE || 'https://api.trongrid.io';
const pk = process.env.RELAYER_PRIVATE_KEY as string;

if (!pk) {
  throw new Error('RELAYER_PRIVATE_KEY is required');
}

export const tronWeb = new TronWeb({
  fullHost,
  solidityNode: solidityHost,
  privateKey: pk,
});
