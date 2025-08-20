import { utils } from 'ethers';

/** Genera 12 palabras (BIP39) usando ethers */
export function generateSeedWords(): string {
  const entropy = utils.randomBytes(16); // 128 bits -> 12 palabras
  return utils.entropyToMnemonic(entropy);
}

/** Deriva la clave privada TRON a partir de la seed (ruta estándar m/44'/195'/0'/0/0) */
export function deriveTronPrivateKeyFromSeed(mnemonic: string): string {
  const hd = utils.HDNode.fromMnemonic(mnemonic);
  const child = hd.derivePath("m/44'/195'/0'/0/0");
  // Ethers devuelve pk con 0x; TronWeb acepta sin 0x
  return child.privateKey.replace(/^0x/i, '');
}

export function validateMnemonic(mn: string): boolean {
  return utils.isValidMnemonic(mn);
}
