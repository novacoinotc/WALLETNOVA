import { utils } from 'ethers';
export function generateSeedWords(): string {
  const entropy = utils.randomBytes(16); // 12 palabras
  return utils.entropyToMnemonic(entropy);
}
export function deriveTronPrivateKeyFromSeed(mnemonic: string): string {
  const hd = utils.HDNode.fromMnemonic(mnemonic);
  const child = hd.derivePath("m/44'/195'/0'/0/0");
  return child.privateKey.replace(/^0x/i,'');
}
