import { SupabaseClient } from '@supabase/supabase-js';
import type { AgentReputation } from '../memory/types';

export class ReputationSystem {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async get(agentId: string): Promise<AgentReputation | null> {
    const { data } = await this.supabase.from('agent_reputation').select('*').eq('agent_id', agentId).single();
    if (!data) return null;
    return {
      agentId: data.agent_id,
      score: data.score,
      validations: data.validations,
      accuracy: data.accuracy,
      contributions: data.contributions,
      rank: this.calcRank(data.score, data.validations),
    };
  }

  private calcRank(score: number, validations: number): AgentReputation['rank'] {
    if (score >= 0.95 && validations >= 1000) return 'oracle';
    if (score >= 0.85 && validations >= 100) return 'validator';
    if (validations >= 10) return 'contributor';
    return 'observer';
  }
}
