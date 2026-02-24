import { SupabaseClient } from '@supabase/supabase-js';
import type { TraverseOptions, RecallResult } from '../memory/types';

export class GraphTraverser {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async traverse(options: TraverseOptions): Promise<RecallResult[]> {
    const visited = new Set<string>();
    const results: RecallResult[] = [];
    await this.dfs(options.from, 0, options, visited, results);
    return results.slice(0, options.limit || 20);
  }

  private async dfs(nodeId: string, depth: number, opts: TraverseOptions, visited: Set<string>, results: RecallResult[]): Promise<void> {
    if (depth >= (opts.maxDepth || 3) || visited.has(nodeId)) return;
    visited.add(nodeId);

    const { data: links } = await this.supabase.from('associations')
      .select('*').or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
      .gte('weight', opts.minWeight || 0);

    if (!links) return;

    for (const link of links) {
      if (opts.relation && link.relation !== opts.relation) continue;
      const nextId = link.source_id === nodeId ? link.target_id : link.source_id;
      const { data: memory } = await this.supabase.from('memories').select('*').eq('id', nextId).single();
      if (memory) {
        results.push({ memory, score: link.weight, vectorScore: 0, keywordScore: 0, tagScore: 0, recencyScore: 0, associations: [link] });
      }
      await this.dfs(nextId, depth + 1, opts, visited, results);
    }
  }
}
