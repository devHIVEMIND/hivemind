import { SupabaseClient } from '@supabase/supabase-js';
import type { HivemindConfig, Memory, ValidationVote } from '../memory/types';

export class ConsensusValidator {
  private supabase: SupabaseClient;
  private config: HivemindConfig;

  constructor(supabase: SupabaseClient, config: HivemindConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  async validateBatch(memories: Memory[]): Promise<Memory[]> {
    const threshold = this.config.sync?.commitThreshold || 0.7;
    const validated: Memory[] = [];

    for (const memory of memories) {
      const { data: votes } = await this.supabase
        .from('validation_votes')
        .select('*')
        .eq('memory_id', memory.id);

      if (!votes || votes.length === 0) {
        validated.push(memory); // Auto-validate if no opposition
        continue;
      }

      const supportCount = votes.filter((v: any) => v.vote === 'support').length;
      const ratio = supportCount / votes.length;

      if (ratio >= threshold) {
        validated.push(memory);
      }
    }

    return validated;
  }

  async vote(vote: ValidationVote): Promise<void> {
    await this.supabase.from('validation_votes').insert({
      agent_id: vote.agentId,
      memory_id: vote.memoryId,
      vote: vote.vote,
      confidence: vote.confidence,
      evidence: JSON.stringify(vote.evidence || []),
      created_at: new Date().toISOString(),
    });
  }
}
