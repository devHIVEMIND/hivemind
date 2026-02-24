import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import type { HivemindConfig, Memory, StoreOptions, MemoryType } from './types';

export class MemoryStore {
  private supabase: SupabaseClient;
  private config: HivemindConfig;

  constructor(supabase: SupabaseClient, config: HivemindConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  async store(options: StoreOptions & { importance: number }): Promise<Memory> {
    const id = `mem_${nanoid(16)}`;
    const hash = this.hashContent(options.content);
    const now = new Date();

    // Generate embedding via OpenAI
    const embedding = await this.generateEmbedding(options.content);

    const memory: Memory = {
      id,
      type: options.type,
      content: options.content,
      summary: options.summary,
      embedding,
      tags: options.tags || [],
      source: options.source || 'unknown',
      confidence: options.confidence ?? 1.0,
      importance: options.importance,
      hash,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessedAt: now,
      decayFactor: 1.0,
      validations: 0,
      metadata: options.metadata || {},
    };

    const { error } = await this.supabase
      .from('memories')
      .insert(this.serializeMemory(memory));

    if (error) throw new Error(`Failed to store memory: ${error.message}`);

    return memory;
  }

  async get(id: string): Promise<Memory | null> {
    const { data, error } = await this.supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.deserializeMemory(data);
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('memories').delete().eq('id', id);
  }

  async count(type?: MemoryType): Promise<number> {
    let query = this.supabase.from('memories').select('id', { count: 'exact' });
    if (type) query = query.eq('type', type);
    const { count } = await query;
    return count || 0;
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Uses OpenAI embeddings API
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI();

    const response = await openai.embeddings.create({
      model: this.config.memory?.embeddingModel || 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  private serializeMemory(memory: Memory): Record<string, unknown> {
    return {
      ...memory,
      embedding: JSON.stringify(memory.embedding),
      tags: JSON.stringify(memory.tags),
      metadata: JSON.stringify(memory.metadata),
      created_at: memory.createdAt.toISOString(),
      updated_at: memory.updatedAt.toISOString(),
      last_accessed_at: memory.lastAccessedAt.toISOString(),
    };
  }

  private deserializeMemory(data: Record<string, unknown>): Memory {
    return {
      id: data.id as string,
      type: data.type as MemoryType,
      content: data.content as string,
      summary: data.summary as string | undefined,
      embedding: JSON.parse(data.embedding as string),
      tags: JSON.parse(data.tags as string),
      source: data.source as string,
      confidence: data.confidence as number,
      importance: data.importance as number,
      hash: data.hash as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      accessCount: data.access_count as number,
      lastAccessedAt: new Date(data.last_accessed_at as string),
      decayFactor: data.decay_factor as number,
      validations: data.validations as number,
      chainTx: data.chain_tx as string | undefined,
      metadata: JSON.parse(data.metadata as string),
    };
  }
}
