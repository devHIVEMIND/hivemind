import { SupabaseClient } from '@supabase/supabase-js';
import type { HivemindConfig, DECAY_RATES } from './types';

const DECAY_RATES_MAP: Record<string, number> = {
  episodic: 0.07,
  semantic: 0.02,
  procedural: 0.03,
  'self-model': 0.01,
  collective: 0,
};

export class DecayManager {
  private supabase: SupabaseClient;
  private config: HivemindConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient, config: HivemindConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  start(): void {
    // Run decay every hour
    this.timer = setInterval(() => this.applyDecay(), 60 * 60 * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async applyDecay(): Promise<void> {
    for (const [type, rate] of Object.entries(DECAY_RATES_MAP)) {
      if (rate === 0) continue;

      const hourlyRate = rate / 24;

      await this.supabase.rpc('apply_memory_decay', {
        memory_type: type,
        decay_rate: hourlyRate,
      });
    }
  }
}
