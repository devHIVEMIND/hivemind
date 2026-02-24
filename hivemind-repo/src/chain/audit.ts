import { Connection } from '@solana/web3.js';

export class AuditTrail {
  private connection: Connection;
  constructor(connection: Connection) { this.connection = connection; }

  async getHistory(walletPubkey: string, limit = 50): Promise<any[]> {
    const sigs = await this.connection.getSignaturesForAddress(
      new (await import('@solana/web3.js')).PublicKey(walletPubkey),
      { limit },
    );
    return sigs;
  }
}
