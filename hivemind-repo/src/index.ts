/**
 * HIVEMIND — Collective AI Memory Network on Solana
 *
 * A decentralized cognitive mesh where AI agents share, validate,
 * and evolve memories collectively.
 *
 * @packageDocumentation
 */

// Core
export { Mesh } from './core/mesh';
export { Cortex } from './core/cortex';
export { createConfig, defineConfig } from './core/config';

// Memory
export { MemoryStore } from './memory/store';
export { RecallEngine } from './memory/recall';
export { DecayManager } from './memory/decay';
export { ImportanceScorer } from './memory/importance';

// Mesh Network
export { MeshProtocol } from './mesh/protocol';
export { ClusterManager } from './mesh/cluster';
export { SwarmSync } from './mesh/sync';
export { ConsensusValidator } from './mesh/validate';
export { ReputationSystem } from './mesh/reputation';

// On-Chain
export { ChainCommitter } from './chain/commit';
export { HashVerifier } from './chain/verify';
export { AuditTrail } from './chain/audit';

// Association Graph
export { AssociationGraph } from './graph/association';
export { HebbianEngine } from './graph/hebbian';
export { GraphTraverser } from './graph/traverse';

// Plugins
export { MaaSServer } from './plugins/maas';

// Types
export type {
  HivemindConfig,
  Memory,
  MemoryType,
  MemoryScope,
  StorageMode,
  RecallOptions,
  RecallResult,
  StoreOptions,
  SyncEvent,
  ValidationVote,
  AssociationLink,
  RelationType,
  AgentReputation,
  MeshNode,
  ClusterInfo,
} from './memory/types';
