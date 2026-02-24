import { SupabaseClient } from '@supabase/supabase-js';

export class HebbianEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async reinforce(memoryIds: string[]): Promise<void> {
    for (let i = 0; i < memoryIds.length; i++) {
      for (let j = i + 1; j < memoryIds.length; j++) {
        await this.supabase.rpc('reinforce_association', {
          source: memoryIds[i],
          target: memoryIds[j],
          boost: 0.05,
        });
      }
    }
  }
}
