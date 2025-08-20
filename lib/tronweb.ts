import TronWeb from 'tronweb';

const fullHost = process.env.TRON_FULLNODE as string;
const solidityHost = process.env.TRON_SOLIDITYNODE as string;
const pk = process.env.RELAYER_PRIVATE_KEY as string;

if (!fullHost || !solidityHost) {
  throw new Error('TRON_FULLNODE/TRON_SOLIDITYNODE are required');
}
if (!pk) {
  throw new Error('RELAYER_PRIVATE_KEY is required');
}

export const tronWeb = new TronWeb({
  fullHost,
  solidityNode: solidityHost,
  privateKey: pk,
});
