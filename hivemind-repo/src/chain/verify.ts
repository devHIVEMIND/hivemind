import { Connection } from '@solana/web3.js';

export class HashVerifier {
  private connection: Connection;
  constructor(connection: Connection) { this.connection = connection; }

  async verify(signature: string, expectedHash: string): Promise<boolean> {
    const tx = await this.connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    if (!tx?.meta?.logMessages) return false;
    return tx.meta.logMessages.some(log => log.includes(expectedHash));
  }
}
