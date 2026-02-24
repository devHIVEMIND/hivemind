// ═══════════════════════════════════════════════════════
// HIVEMIND Type Definitions
// ═══════════════════════════════════════════════════════

/**
 * Memory types with different decay rates and scopes
 */
export type MemoryType =
  | 'episodic'    // 7%/day decay — raw interactions (node-scoped)
  | 'semantic'    // 2%/day decay — distilled knowledge (cluster-scoped)
  | 'procedural'  // 3%/day decay — learned behaviors (cluster-scoped)
  | 'self-model'  // 1%/day decay — agent identity (node-scoped)
  | 'collective'; // 0% decay — swarm consensus (network-scoped, permanent)

/**
 * Memory retrieval scope
 */
export type MemoryScope =
  | 'node'       // This agent's memories only
  | 'cluster'    // Memories from agents in the same cluster
  | 'collective' // All validated memories across the network
  | 'all';       // Everything (node + cluster + collective)

/**
 * Storage mode determines where memories are persisted
 */
export type StorageMode =
  | 'local'   // All local, zero gas, full privacy
  | 'hybrid'  // Local cache + chain for important memories (recommended)
  | 'chain';  // Everything on Solana, max transparency

/**
 * Association relation types
 */
export type RelationType =
  | 'supports'     // Provides evidence for
  | 'contradicts'  // Conflicts with
  | 'follows'      // Temporal/logical sequence
  | 'elaborates'   // Adds detail to
  | 'causes'       // Causal relationship
  | 'relates'      // General association
  | 'extends'      // Builds upon
  | 'refutes';     // Disproves with evidence

// ═══════════════════════════════════════════════════════
// Core Data Structures
// ═══════════════════════════════════════════════════════

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  summary?: string;
  embedding?: number[];
  tags: string[];
  source: string;
  confidence: number;
  importance: number;
  hash: string;           // SHA-256 content hash
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  decayFactor: number;    // Current decay multiplier (0-1)
  validations: number;    // Number of agent validations
  chainTx?: string;       // Solana transaction signature
  metadata: Record<string, unknown>;
}

export interface RecallResult {
  memory: Memory;
  score: number;          // Combined relevance score
  vectorScore: number;    // Vector similarity score
  keywordScore: number;   // Keyword match score
  tagScore: number;       // Tag match score
  recencyScore: number;   // Time-based recency score
  associations: AssociationLink[];
}

export interface AssociationLink {
  id: string;
  sourceId: string;
  targetId: string;
  relation: RelationType;
  weight: number;         // 0-1, strengthened via Hebbian reinforcement
  createdAt: Date;
  reinforcements: number;
}

export interface MeshNode {
  id: string;
  agentId: string;
  clusterId: string;
  reputation: number;
  connectedAt: Date;
  lastHeartbeat: Date;
  memoryCount: number;
  validationCount: number;
  status: 'active' | 'idle' | 'syncing' | 'disconnected';
}

export interface ClusterInfo {
  id: string;
  name: string;
  nodeCount: number;
  memoryCount: number;
  lastSync: Date;
  topics: string[];
}

export interface AgentReputation {
  agentId: string;
  score: number;          // 0-1 overall reputation
  validations: number;    // Total validations performed
  accuracy: number;       // Validation accuracy rate
  contributions: number;  // Memories contributed to collective
  rank: 'observer' | 'contributor' | 'validator' | 'oracle';
}

export interface ValidationVote {
  agentId: string;
  memoryId: string;
  vote: 'support' | 'oppose' | 'abstain';
  confidence: number;
  evidence?: string[];    // Memory IDs used as evidence
  timestamp: Date;
}

export interface SyncEvent {
  phase: 'harvest' | 'validate' | 'consolidate' | 'commit';
  cycleId: string;
  timestamp: Date;
  data: unknown;
}

// ═══════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════

export interface HivemindConfig {
  supabase: {
    url: string;
    serviceKey: string;
  };
  solana: {
    rpc: string;
    wallet: string;
    commitment?: 'processed' | 'confirmed' | 'finalized';
  };
  storage: StorageMode;
  memory?: {
    maxEpisodic?: number;
    maxSemantic?: number;
    embeddingModel?: string;
    decayEnabled?: boolean;
  };
  mesh?: {
    clusterId?: string;
    maxConnections?: number;
    heartbeatInterval?: number;
  };
  sync?: {
    interval?: number;
    minImportance?: number;
    autoValidate?: boolean;
    commitThreshold?: number;
  };
  retrieval?: {
    vector?: { weight: number; model?: string };
    keyword?: { weight: number; fuzzy?: boolean };
    tag?: { weight: number };
  };
}

// ═══════════════════════════════════════════════════════
// Method Options
// ═══════════════════════════════════════════════════════

export interface StoreOptions {
  type: MemoryType;
  content: string;
  summary?: string;
  confidence?: number;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RecallOptions {
  query: string;
  scope?: MemoryScope;
  type?: MemoryType;
  limit?: number;
  minConfidence?: number;
  minImportance?: number;
  tags?: string[];
  retrieval?: {
    vector?: { weight: number };
    keyword?: { weight: number };
    tag?: { weight: number };
  };
  rerank?: boolean;
}

export interface BroadcastOptions extends StoreOptions {
  ttl?: number;           // Time to live in mesh (seconds)
  priority?: 'low' | 'normal' | 'high';
}

export interface CommitOptions {
  memoryId: string;
  hash?: string;
  memo?: string;
}

export interface TraverseOptions {
  from: string;
  relation?: RelationType;
  maxDepth?: number;
  minWeight?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════
// Decay Constants
// ═══════════════════════════════════════════════════════

export const DECAY_RATES: Record<MemoryType, number> = {
  episodic: 0.07,    // 7% per day
  semantic: 0.02,    // 2% per day
  procedural: 0.03,  // 3% per day
  'self-model': 0.01, // 1% per day
  collective: 0,      // permanent
};

export const MEMORY_SCOPES: Record<MemoryType, MemoryScope> = {
  episodic: 'node',
  semantic: 'cluster',
  procedural: 'cluster',
  'self-model': 'node',
  collective: 'collective',
};
