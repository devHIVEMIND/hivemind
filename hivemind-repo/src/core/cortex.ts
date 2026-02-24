/**
 * Cortex — Single-node memory engine (standalone mode)
 *
 * For agents that don't need the full mesh but want
 * persistent memory with optional on-chain commits.
 *
 * @example
 * ```typescript
 * import { Cortex } from 'hivemind-sol';
 *
 * const brain = new Cortex({
 *   supabase: { url, serviceKey },
 * });
 *
 * await brain.init();
 * await brain.store({ type: 'episodic', content: '...' });
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

import { MemoryStore } from '../memory/store';
import { RecallEngine } from '../memory/recall';
import { DecayManager } from '../memory/decay';
import { ImportanceScorer } from '../memory/importance';
import { ChainCommitter } from '../chain/commit';
import { AssociationGraph } from '../graph/association';
import { HebbianEngine } from '../graph/hebbian';

import type {
  HivemindConfig,
  Memory,
  StoreOptions,
  RecallOptions,
  RecallResult,
} from '../memory/types';

// ═══════════════════════════════════════════════════════

interface CortexConfig {
  supabase: {
    url: string;
    serviceKey: string;
  };
  solana?: {
    rpc: string;
    wallet: string;
    commitment?: 'processed' | 'confirmed' | 'finalized';
  };
  storage?: 'local' | 'hybrid' | 'chain';
  memory?: {
    maxEpisodic?: number;
    maxSemantic?: number;
    embeddingModel?: string;
    decayEnabled?: boolean;
  };
}

// ═══════════════════════════════════════════════════════

export class Cortex {
  readonly agentId: string;
  private supabase: SupabaseClient;
  private memoryStore: MemoryStore;
  private recallEngine: RecallEngine;
  private decayManager: DecayManager;
  private importanceScorer: ImportanceScorer;
  private chainCommitter?: ChainCommitter;
  private initialized = false;
  private config: CortexConfig;

  constructor(config: CortexConfig) {
    this.config = config;
    this.agentId = `cortex_${nanoid(12)}`;

    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    const fullConfig = {
      ...config,
      storage: config.storage || 'local',
      solana: config.solana || { rpc: '', wallet: '' },
    } as HivemindConfig;

    this.memoryStore = new MemoryStore(this.supabase, fullConfig);
    this.recallEngine = new RecallEngine(this.supabase, fullConfig);
    this.decayManager = new DecayManager(this.supabase, fullConfig);
    this.importanceScorer = new ImportanceScorer();

    // Chain committer only if Solana config provided
    if (config.solana) {
      const connection = new Connection(config.solana.rpc, config.solana.commitment || 'confirmed');
      const wallet = Keypair.fromSecretKey(bs58.decode(config.solana.wallet));
      this.chainCommitter = new ChainCommitter(connection, wallet, fullConfig);
    }
  }

  /**
   * Initialize the Cortex (standalone brain)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.config.memory?.decayEnabled !== false) {
      this.decayManager.start();
    }

    this.initialized = true;
  }

  /**
   * Store a memory
   */
  async store(options: StoreOptions): Promise<Memory> {
    this.ensureInitialized();

    return this.memoryStore.store({
      ...options,
      source: options.source || this.agentId,
      confidence: options.confidence ?? 1.0,
      importance: this.importanceScorer.score(options.content),
    });
  }

  /**
   * Recall memories with hybrid search
   */
  async recall(options: RecallOptions): Promise<RecallResult[]> {
    this.ensureInitialized();
    return this.recallEngine.recall(options);
  }

  /**
   * Manually commit a memory to Solana
   */
  async commit(memoryId: string): Promise<{ signature: string }> {
    if (!this.chainCommitter) {
      throw new Error('Solana not configured. Pass solana config to enable on-chain commits.');
    }
    return this.chainCommitter.commit({ memoryId });
  }

  /**
   * Shutdown the Cortex
   */
  async shutdown(): Promise<void> {
    this.decayManager.stop();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Cortex not initialized. Call brain.init() first.');
    }
  }
}
