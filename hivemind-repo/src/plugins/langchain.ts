import { Mesh } from '../core/mesh';

interface RetrieverConfig { mesh: Mesh; scope?: string; topK?: number; }

export class HivemindRetriever {
  private mesh: Mesh;
  private scope: string;
  private topK: number;

  constructor(config: RetrieverConfig) {
    this.mesh = config.mesh;
    this.scope = config.scope || 'collective';
    this.topK = config.topK || 5;
  }

  async getRelevantDocuments(query: string) {
    const results = await this.mesh.recall({ query, scope: this.scope as any, limit: this.topK });
    return results.map(r => ({ pageContent: r.memory.content, metadata: { score: r.score, type: r.memory.type } }));
  }
}
