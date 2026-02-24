import { SupabaseClient } from '@supabase/supabase-js';
import type { HivemindConfig, RecallOptions, RecallResult, Memory } from './types';

export class RecallEngine {
  private supabase: SupabaseClient;
  private config: HivemindConfig;

  constructor(supabase: SupabaseClient, config: HivemindConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Hybrid recall: vector similarity + keyword matching + tag scoring
   * Results are weighted and combined for optimal retrieval
   */
  async recall(options: RecallOptions): Promise<RecallResult[]> {
    const weights = options.retrieval || this.config.retrieval!;
    const limit = options.limit || 10;

    // Run retrieval strategies in parallel
    const [vectorResults, keywordResults, tagResults] = await Promise.all([
      weights.vector?.weight ? this.vectorSearch(options) : [],
      weights.keyword?.weight ? this.keywordSearch(options) : [],
      weights.tag?.weight ? this.tagSearch(options) : [],
    ]);

    // Merge and score results
    const merged = this.mergeResults(
      vectorResults,
      keywordResults,
      tagResults,
      weights,
    );

    // Apply filters
    let filtered = merged;

    if (options.minConfidence) {
      filtered = filtered.filter((r) => r.memory.confidence >= options.minConfidence!);
    }
    if (options.minImportance) {
      filtered = filtered.filter((r) => r.memory.importance >= options.minImportance!);
    }
    if (options.type) {
      filtered = filtered.filter((r) => r.memory.type === options.type);
    }

    // Sort by combined score and limit
    filtered.sort((a, b) => b.score - a.score);

    // Update access counts for recalled memories
    const topResults = filtered.slice(0, limit);
    await this.updateAccessCounts(topResults.map((r) => r.memory.id));

    return topResults;
  }

  /**
   * Vector similarity search using pgvector
   */
  private async vectorSearch(options: RecallOptions): Promise<RecallResult[]> {
    const embedding = await this.generateEmbedding(options.query);

    const { data, error } = await this.supabase.rpc('match_memories', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.5,
      match_count: (options.limit || 10) * 2,
      scope_filter: options.scope || 'all',
    });

    if (error || !data) return [];

    return data.map((row: any) => ({
      memory: this.deserialize(row),
      score: row.similarity,
      vectorScore: row.similarity,
      keywordScore: 0,
      tagScore: 0,
      recencyScore: this.calcRecency(row.created_at),
      associations: [],
    }));
  }

  /**
   * Keyword-based full-text search
   */
  private async keywordSearch(options: RecallOptions): Promise<RecallResult[]> {
    const keywords = this.extractKeywords(options.query);
    if (keywords.length === 0) return [];

    const searchQuery = keywords.join(' & ');

    const { data, error } = await this.supabase
      .from('memories')
      .select('*')
      .textSearch('content', searchQuery)
      .limit((options.limit || 10) * 2);

    if (error || !data) return [];

    return data.map((row: any) => ({
      memory: this.deserialize(row),
      score: 0,
      vectorScore: 0,
      keywordScore: this.calcKeywordScore(row.content, keywords),
      tagScore: 0,
      recencyScore: this.calcRecency(row.created_at),
      associations: [],
    }));
  }

  /**
   * Tag-based search
   */
  private async tagSearch(options: RecallOptions): Promise<RecallResult[]> {
    if (!options.tags?.length) return [];

    const { data, error } = await this.supabase
      .from('memories')
      .select('*')
      .overlaps('tags', options.tags)
      .limit((options.limit || 10) * 2);

    if (error || !data) return [];

    return data.map((row: any) => ({
      memory: this.deserialize(row),
      score: 0,
      vectorScore: 0,
      keywordScore: 0,
      tagScore: this.calcTagScore(JSON.parse(row.tags), options.tags!),
      recencyScore: this.calcRecency(row.created_at),
      associations: [],
    }));
  }

  private mergeResults(
    vector: RecallResult[],
    keyword: RecallResult[],
    tag: RecallResult[],
    weights: NonNullable<HivemindConfig['retrieval']>,
  ): RecallResult[] {
    const map = new Map<string, RecallResult>();

    const process = (results: RecallResult[]) => {
      for (const r of results) {
        const existing = map.get(r.memory.id);
        if (existing) {
          existing.vectorScore = Math.max(existing.vectorScore, r.vectorScore);
          existing.keywordScore = Math.max(existing.keywordScore, r.keywordScore);
          existing.tagScore = Math.max(existing.tagScore, r.tagScore);
        } else {
          map.set(r.memory.id, { ...r });
        }
      }
    };

    process(vector);
    process(keyword);
    process(tag);

    // Calculate combined scores
    for (const result of map.values()) {
      result.score =
        result.vectorScore * (weights.vector?.weight || 0) +
        result.keywordScore * (weights.keyword?.weight || 0) +
        result.tagScore * (weights.tag?.weight || 0) +
        result.recencyScore * 0.1;

      // Apply decay factor
      result.score *= result.memory.decayFactor;
    }

    return Array.from(map.values());
  }

  private extractKeywords(query: string): string[] {
    const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'about', 'between', 'under', 'above', 'and', 'but', 'or', 'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'what', 'how', 'that', 'this', 'which', 'who', 'whom']);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));
  }

  private calcRecency(createdAt: string): number {
    const age = Date.now() - new Date(createdAt).getTime();
    const dayMs = 86400000;
    return Math.max(0, 1 - age / (30 * dayMs)); // Decays over 30 days
  }

  private calcKeywordScore(content: string, keywords: string[]): number {
    const lower = content.toLowerCase();
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) hits++;
    }
    return keywords.length > 0 ? hits / keywords.length : 0;
  }

  private calcTagScore(memoryTags: string[], queryTags: string[]): number {
    const set = new Set(memoryTags);
    let hits = 0;
    for (const t of queryTags) {
      if (set.has(t)) hits++;
    }
    return queryTags.length > 0 ? hits / queryTags.length : 0;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI();
    const res = await openai.embeddings.create({
      model: this.config.memory?.embeddingModel || 'text-embedding-3-small',
      input: text,
    });
    return res.data[0].embedding;
  }

  private async updateAccessCounts(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.supabase.rpc('increment_access_count', { memory_id: id });
    }
  }

  private deserialize(data: any): any {
    return {
      ...data,
      tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
      metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastAccessedAt: new Date(data.last_accessed_at),
    };
  }
}
