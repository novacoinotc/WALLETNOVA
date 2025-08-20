import * as bip39 from 'bip39';
import * as bip32 from 'bip32';

export async function generateSeedWords(): Promise<string> {
  const mn = bip39.generateMnemonic(128); // 12 palabras
  return mn;
}

export async function deriveTronPrivateKeyFromSeed(mnemonic: string): Promise<string> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const node = bip32.fromSeed(seed);
  // TRON coin type 195 -> m/44'/195'/0'/0/0
  const child = node.derivePath("m/44'/195'/0'/0/0");
  return child.privateKey!.toString('hex');
}

export function validateMnemonic(mn: string): boolean {
  return bip39.validateMnemonic(mn);
}
