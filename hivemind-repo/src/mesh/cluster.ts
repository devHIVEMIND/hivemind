import { SupabaseClient } from '@supabase/supabase-js';
import type { HivemindConfig, ClusterInfo } from '../memory/types';

export class ClusterManager {
  private supabase: SupabaseClient;
  private config: HivemindConfig;

  constructor(supabase: SupabaseClient, config: HivemindConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  async join(clusterId: string): Promise<void> {
    await this.supabase.from('clusters').upsert({ id: clusterId, updated_at: new Date().toISOString() });
  }

  async leave(clusterId: string): Promise<void> {
    // Remove node from cluster
  }

  async list(): Promise<ClusterInfo[]> {
    const { data } = await this.supabase.from('clusters').select('*');
    return (data || []) as ClusterInfo[];
  }
}
