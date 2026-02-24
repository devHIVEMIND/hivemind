/**
 * Mesh — The core HIVEMIND interface
 *
 * Creates a connection to the decentralized memory mesh,
 * enabling agents to store, recall, validate, and share
 * memories collectively across the network.
 *
 * @example
 * ```typescript
 * import { Mesh } from 'hivemind-sol';
 *
 * const hive = new Mesh({
 *   supabase: { url, serviceKey },
 *   solana: { rpc, wallet },
 * });
 *
 * await hive.connect();
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { EventEmitter } from 'eventemitter3';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

import { MemoryStore } from '../memory/store';
import { RecallEngine } from '../memory/recall';
import { DecayManager } from '../memory/decay';
import { ImportanceScorer } from '../memory/importance';
import { MeshProtocol } from '../mesh/protocol';
import { ClusterManager } from '../mesh/cluster';
import { SwarmSync } from '../mesh/sync';
import { ConsensusValidator } from '../mesh/validate';
import { ReputationSystem } from '../mesh/reputation';
import { ChainCommitter } from '../chain/commit';
import { AssociationGraph } from '../graph/association';
import { HebbianEngine } from '../graph/hebbian';
import { GraphTraverser } from '../graph/traverse';

import type {
  HivemindConfig,
  Memory,
  StoreOptions,
  RecallOptions,
  RecallResult,
  BroadcastOptions,
  CommitOptions,
  TraverseOptions,
  AssociationLink,
  RelationType,
  SyncEvent,
  ValidationVote,
  MeshNode,
  DECAY_RATES,
} from '../memory/types';

// ═══════════════════════════════════════════════════════

interface MeshEvents {
  'connected': () => void;
  'disconnected': () => void;
  'memory:stored': (memory: Memory) => void;
  'memory:recalled': (results: RecallResult[]) => void;
  'memory:decayed': (memoryId: string, newFactor: number) => void;
  'mesh:node-joined': (node: MeshNode) => void;
  'mesh:node-left': (nodeId: string) => void;
  'validate': (memory: Memory) => Promise<ValidationVote>;
  'broadcast': (memory: Memory) => void;
  'sync:harvest': (memories: Memory[]) => void;
  'sync:validate': (proposals: Memory[]) => void;
  'sync:consolidate': (results: Memory[]) => void;
  'sync:commit': (txSignature: string) => void;
  'chain:committed': (txSignature: string, memoryId: string) => void;
  'error': (error: Error) => void;
}

// ═══════════════════════════════════════════════════════

export class Mesh extends EventEmitter<MeshEvents> {
  readonly config: HivemindConfig;
  readonly nodeId: string;

  // Internals
  private supabase: SupabaseClient;
  private connection: Connection;
  private wallet: Keypair;
  private connected = false;

  // Subsystems
  private memoryStore: MemoryStore;
  private recallEngine: RecallEngine;
  private decayManager: DecayManager;
  private importanceScorer: ImportanceScorer;
  private meshProtocol: MeshProtocol;
  private clusterManager: ClusterManager;
  private swarmSync: SwarmSync;
  private consensusValidator: ConsensusValidator;
  private chainCommitter: ChainCommitter;
  private hebbianEngine: HebbianEngine;

  // Public subsystems
  readonly reputation: ReputationSystem;
  readonly graph: AssociationGraph & { traverse: (opts: TraverseOptions) => Promise<RecallResult[]> };

  constructor(config: HivemindConfig) {
    super();

    this.config = {
      storage: 'hybrid',
      memory: {
        maxEpisodic: 10000,
        maxSemantic: 5000,
        embeddingModel: 'text-embedding-3-small',
        decayEnabled: true,
        ...config.memory,
      },
      mesh: {
        clusterId: 'default',
        maxConnections: 50,
        heartbeatInterval: 30000,
        ...config.mesh,
      },
      sync: {
        interval: 4 * 60 * 60 * 1000, // 4 hours
        minImportance: 0.6,
        autoValidate: true,
        commitThreshold: 0.7,
        ...config.sync,
      },
      retrieval: {
        vector: { weight: 0.5 },
        keyword: { weight: 0.3 },
        tag: { weight: 0.2 },
        ...config.retrieval,
      },
      ...config,
    };

    this.nodeId = `node_${nanoid(12)}`;

    // Initialize Supabase
    this.supabase = createClient(
      this.config.supabase.url,
      this.config.supabase.serviceKey,
    );

    // Initialize Solana
    this.connection = new Connection(
      this.config.solana.rpc,
      this.config.solana.commitment || 'confirmed',
    );
    this.wallet = Keypair.fromSecretKey(
      bs58.decode(this.config.solana.wallet),
    );

    // Initialize subsystems
    this.memoryStore = new MemoryStore(this.supabase, this.config);
    this.recallEngine = new RecallEngine(this.supabase, this.config);
    this.decayManager = new DecayManager(this.supabase, this.config);
    this.importanceScorer = new ImportanceScorer();
    this.meshProtocol = new MeshProtocol(this.supabase, this.nodeId, this.config);
    this.clusterManager = new ClusterManager(this.supabase, this.config);
    this.consensusValidator = new ConsensusValidator(this.supabase, this.config);
    this.chainCommitter = new ChainCommitter(this.connection, this.wallet, this.config);
    this.hebbianEngine = new HebbianEngine(this.supabase);
    this.reputation = new ReputationSystem(this.supabase);
    this.swarmSync = new SwarmSync(
      this.supabase,
      this.memoryStore,
      this.consensusValidator,
      this.chainCommitter,
      this.config,
    );

    const assocGraph = new AssociationGraph(this.supabase, this.hebbianEngine);
    const graphTraverser = new GraphTraverser(this.supabase);

    this.graph = Object.assign(assocGraph, {
      traverse: graphTraverser.traverse.bind(graphTraverser),
    });
  }

  // ═══════════ CONNECTION ═══════════

  /**
   * Connect to the HIVEMIND mesh network
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      // Register node in mesh
      await this.meshProtocol.register(this.nodeId);

      // Join cluster
      await this.clusterManager.join(this.config.mesh!.clusterId!);

      // Start decay timer
      if (this.config.memory!.decayEnabled) {
        this.decayManager.start();
      }

      // Start sync cycle
      this.swarmSync.start();

      // Start heartbeat
      this.meshProtocol.startHeartbeat();

      // Wire up sync events
      this.swarmSync.on('harvest', (memories) => this.emit('sync:harvest', memories));
      this.swarmSync.on('validate', (proposals) => this.emit('sync:validate', proposals));
      this.swarmSync.on('consolidate', (results) => this.emit('sync:consolidate', results));
      this.swarmSync.on('commit', (tx) => this.emit('sync:commit', tx));

      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from the mesh
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    this.swarmSync.stop();
    this.decayManager.stop();
    this.meshProtocol.stopHeartbeat();
    await this.meshProtocol.unregister(this.nodeId);

    this.connected = false;
    this.emit('disconnected');
  }

  // ═══════════ MEMORY OPERATIONS ═══════════

  /**
   * Store a memory in the hive
   */
  async store(options: StoreOptions): Promise<Memory> {
    this.ensureConnected();

    const memory = await this.memoryStore.store({
      ...options,
      source: options.source || this.nodeId,
      confidence: options.confidence ?? 1.0,
      importance: this.importanceScorer.score(options.content),
    });

    // Auto-commit to chain based on storage mode
    if (this.shouldCommitToChain(memory)) {
      const tx = await this.chainCommitter.commit({
        memoryId: memory.id,
        hash: memory.hash,
      });
      memory.chainTx = tx.signature;
    }

    this.emit('memory:stored', memory);
    return memory;
  }

  /**
   * Recall memories using hybrid retrieval
   */
  async recall(options: RecallOptions): Promise<RecallResult[]> {
    this.ensureConnected();

    const results = await this.recallEngine.recall({
      ...options,
      retrieval: options.retrieval || this.config.retrieval,
    });

    // Hebbian reinforcement — strengthen associations between co-recalled memories
    if (results.length > 1) {
      await this.hebbianEngine.reinforce(
        results.map((r) => r.memory.id),
      );
    }

    this.emit('memory:recalled', results);
    return results;
  }

  /**
   * Broadcast a memory to the mesh for collective validation
   */
  async broadcast(options: BroadcastOptions): Promise<Memory> {
    this.ensureConnected();

    const memory = await this.store(options);
    await this.meshProtocol.broadcast(memory, {
      ttl: options.ttl,
      priority: options.priority || 'normal',
    });

    this.emit('broadcast', memory);
    return memory;
  }

  /**
   * Manually commit a memory to Solana
   */
  async commit(options: CommitOptions): Promise<{ signature: string }> {
    this.ensureConnected();

    const tx = await this.chainCommitter.commit(options);
    this.emit('chain:committed', tx.signature, options.memoryId);
    return tx;
  }

  /**
   * Create an association between two memories
   */
  async associate(options: {
    source: string;
    target: string;
    relation: RelationType;
    weight?: number;
  }): Promise<AssociationLink> {
    this.ensureConnected();
    return this.graph.link(options);
  }

  /**
   * Join a specific cluster in the mesh
   */
  async joinCluster(clusterId: string): Promise<void> {
    this.ensureConnected();
    await this.clusterManager.join(clusterId);
  }

  /**
   * Get mesh status
   */
  async status(): Promise<{
    connected: boolean;
    nodeId: string;
    clusterId: string;
    nodeCount: number;
    memoryCount: number;
    lastSync: Date | null;
    latency: number;
  }> {
    const meshStatus = await this.meshProtocol.status();
    return {
      connected: this.connected,
      nodeId: this.nodeId,
      clusterId: this.config.mesh!.clusterId!,
      ...meshStatus,
    };
  }

  // ═══════════ PRIVATE HELPERS ═══════════

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error(
        'Not connected to HIVEMIND mesh. Call hive.connect() first.',
      );
    }
  }

  private shouldCommitToChain(memory: Memory): boolean {
    switch (this.config.storage) {
      case 'chain':
        return true;
      case 'hybrid':
        return (
          memory.type === 'semantic' ||
          memory.type === 'collective' ||
          memory.type === 'self-model'
        );
      case 'local':
        return false;
      default:
        return false;
    }
  }
}
