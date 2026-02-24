import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'eventemitter3';
import { MemoryStore } from '../memory/store';
import { ConsensusValidator } from './validate';
import { ChainCommitter } from '../chain/commit';
import type { HivemindConfig, Memory } from '../memory/types';

export class SwarmSync extends EventEmitter {
  private supabase: SupabaseClient;
  private store: MemoryStore;
  private validator: ConsensusValidator;
  private committer: ChainCommitter;
  private config: HivemindConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    supabase: SupabaseClient,
    store: MemoryStore,
    validator: ConsensusValidator,
    committer: ChainCommitter,
    config: HivemindConfig,
  ) {
    super();
    this.supabase = supabase;
    this.store = store;
    this.validator = validator;
    this.committer = committer;
    this.config = config;
  }

  start(): void {
    const interval = this.config.sync?.interval || 4 * 60 * 60 * 1000;
    this.timer = setInterval(() => this.runCycle(), interval);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async runCycle(): Promise<void> {
    // Phase I: Harvest
    const harvested = await this.harvest();
    this.emit('harvest', harvested);

    // Phase II: Validate
    const validated = await this.validate(harvested);
    this.emit('validate', validated);

    // Phase III: Consolidate
    const consolidated = await this.consolidate(validated);
    this.emit('consolidate', consolidated);

    // Phase IV: Commit
    if (consolidated.length > 0) {
      const tx = await this.commit(consolidated);
      this.emit('commit', tx);
    }
  }

  private async harvest(): Promise<Memory[]> {
    const minImportance = this.config.sync?.minImportance || 0.6;
    const { data } = await this.supabase
      .from('memories')
      .select('*')
      .gte('importance', minImportance)
      .eq('validations', 0)
      .order('importance', { ascending: false })
      .limit(50);
    return data || [];
  }

  private async validate(memories: Memory[]): Promise<Memory[]> {
    return this.validator.validateBatch(memories);
  }

  private async consolidate(memories: Memory[]): Promise<Memory[]> {
    // Promote to collective type and update graph weights
    return memories;
  }

  private async commit(memories: Memory[]): Promise<string> {
    const items = memories.map(m => ({ memoryId: m.id, hash: m.hash }));
    const { signature } = await this.committer.batchCommit(items);
    return signature;
  }
}
