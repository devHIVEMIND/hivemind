import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import type { HivemindConfig, CommitOptions } from '../memory/types';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export class ChainCommitter {
  private connection: Connection;
  private wallet: Keypair;
  private config: HivemindConfig;

  constructor(connection: Connection, wallet: Keypair, config: HivemindConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
  }

  /**
   * Commit a memory hash to Solana via memo transaction
   */
  async commit(options: CommitOptions): Promise<{ signature: string; hash: string }> {
    const hash = options.hash || this.generateHash(options.memoryId);
    const memo = this.buildMemo(options.memoryId, hash, options.memo);

    const instruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    });

    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.wallet],
      { commitment: this.config.solana.commitment || 'confirmed' },
    );

    return { signature, hash };
  }

  /**
   * Batch commit multiple memories in a single transaction
   */
  async batchCommit(
    items: CommitOptions[],
  ): Promise<{ signature: string; count: number }> {
    const transaction = new Transaction();

    for (const item of items) {
      const hash = item.hash || this.generateHash(item.memoryId);
      const memo = this.buildMemo(item.memoryId, hash, item.memo);

      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memo, 'utf-8'),
        }),
      );
    }

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.wallet],
      { commitment: this.config.solana.commitment || 'confirmed' },
    );

    return { signature, count: items.length };
  }

  /**
   * Verify a memory hash on-chain
   */
  async verify(signature: string, expectedHash: string): Promise<boolean> {
    const tx = await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.meta?.logMessages) return false;

    return tx.meta.logMessages.some((log) => log.includes(expectedHash));
  }

  /**
   * Get the wallet's current SOL balance
   */
  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  private buildMemo(memoryId: string, hash: string, extraMemo?: string): string {
    const payload = {
      protocol: 'HIVEMIND',
      version: '0.1.0',
      memoryId,
      hash,
      timestamp: Date.now(),
      ...(extraMemo ? { memo: extraMemo } : {}),
    };

    return JSON.stringify(payload);
  }

  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
