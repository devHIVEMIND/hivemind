import { SupabaseClient } from '@supabase/supabase-js';
import type { HivemindConfig, Memory, MeshNode } from '../memory/types';

export class MeshProtocol {
  private supabase: SupabaseClient;
  private nodeId: string;
  private config: HivemindConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient, nodeId: string, config: HivemindConfig) {
    this.supabase = supabase;
    this.nodeId = nodeId;
    this.config = config;
  }

  async register(nodeId: string): Promise<void> {
    await this.supabase.from('mesh_nodes').upsert({
      id: nodeId,
      cluster_id: this.config.mesh?.clusterId || 'default',
      status: 'active',
      connected_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
    });
  }

  async unregister(nodeId: string): Promise<void> {
    await this.supabase.from('mesh_nodes').update({ status: 'disconnected' }).eq('id', nodeId);
  }

  startHeartbeat(): void {
    const interval = this.config.mesh?.heartbeatInterval || 30000;
    this.heartbeatTimer = setInterval(async () => {
      await this.supabase.from('mesh_nodes')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', this.nodeId);
    }, interval);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async broadcast(memory: Memory, opts: { ttl?: number; priority?: string }): Promise<void> {
    await this.supabase.from('mesh_broadcasts').insert({
      memory_id: memory.id,
      source_node: this.nodeId,
      cluster_id: this.config.mesh?.clusterId,
      priority: opts.priority || 'normal',
      ttl: opts.ttl || 3600,
      created_at: new Date().toISOString(),
    });
  }

  async status(): Promise<{ nodeCount: number; memoryCount: number; lastSync: Date | null; latency: number }> {
    const start = Date.now();
    const { count: nodeCount } = await this.supabase.from('mesh_nodes').select('id', { count: 'exact' }).eq('status', 'active');
    const { count: memoryCount } = await this.supabase.from('memories').select('id', { count: 'exact' });
    const latency = Date.now() - start;
    return { nodeCount: nodeCount || 0, memoryCount: memoryCount || 0, lastSync: null, latency };
  }
}
