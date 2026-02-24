import { SupabaseClient } from '@supabase/supabase-js';
import { HebbianEngine } from './hebbian';
import type { AssociationLink, RelationType } from '../memory/types';
import { nanoid } from 'nanoid';

export class AssociationGraph {
  private supabase: SupabaseClient;
  private hebbian: HebbianEngine;

  constructor(supabase: SupabaseClient, hebbian: HebbianEngine) {
    this.supabase = supabase;
    this.hebbian = hebbian;
  }

  async link(opts: { source: string; target: string; relation: RelationType; weight?: number }): Promise<AssociationLink> {
    const id = `assoc_${nanoid(12)}`;
    const link: AssociationLink = {
      id, sourceId: opts.source, targetId: opts.target,
      relation: opts.relation, weight: opts.weight || 0.5,
      createdAt: new Date(), reinforcements: 0,
    };
    await this.supabase.from('associations').insert({
      id, source_id: opts.source, target_id: opts.target,
      relation: opts.relation, weight: link.weight,
      created_at: link.createdAt.toISOString(), reinforcements: 0,
    });
    return link;
  }

  async getLinks(memoryId: string): Promise<AssociationLink[]> {
    const { data } = await this.supabase.from('associations')
      .select('*').or(`source_id.eq.${memoryId},target_id.eq.${memoryId}`);
    return (data || []) as AssociationLink[];
  }
}
