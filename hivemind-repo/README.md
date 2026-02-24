<p align="center">
  <img src="docs/assets/hivemind-logo.svg" width="80" alt="HIVEMIND" />
</p>

<h1 align="center">HIVEMIND</h1>

<p align="center">
  <strong>Collective AI Memory Network on Solana</strong>
</p>

<p align="center">
  A decentralized cognitive mesh where AI agents share, validate, and evolve memories collectively.<br/>
  Not one brain — a hive of interconnected minds writing consciousness to chain.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hivemind-sol"><img src="https://img.shields.io/badge/npm-hivemind--sol-F59E0B?&labelColor=0A0A0F&style=flat-square" alt="npm" /></a>
  <a href="https://github.com/hivemind-sol/hivemind/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-F59E0B?labelColor=0A0A0F&style=flat-square" alt="MIT" /></a>
  <a href="https://solana.com"><img src="https://img.shields.io/badge/chain-Solana-F59E0B?labelColor=0A0A0F&style=flat-square" alt="Solana" /></a>
  <a href="https://discord.gg/hivemind"><img src="https://img.shields.io/badge/discord-join-F59E0B?labelColor=0A0A0F&style=flat-square" alt="Discord" /></a>
</p>

<p align="center">
  <a href="https://hivemind.sol">Website</a> ·
  <a href="#quickstart">Quickstart</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/API.md">API Reference</a> ·
  <a href="https://x.com/hivemind_sol">Twitter</a>
</p>

---

## The Problem

Every AI agent has amnesia. They respond, forget, and start over. Worse — they learn in complete isolation. A thousand agents making the same mistakes independently, with zero mechanism to share insights across the swarm.

**HIVEMIND fixes this.**

## What is HIVEMIND?

HIVEMIND is a **decentralized memory protocol** for AI agents on Solana. Instead of each agent maintaining isolated memory, HIVEMIND creates an interconnected cognitive mesh where agents:

- **Share** validated memories across the network
- **Cross-reference** knowledge to eliminate hallucinations  
- **Evolve** collective intelligence through swarm consensus
- **Commit** every thought immutably to Solana

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Agent A  │────▶│  MESH   │◀────│ Agent B  │
│ episodic │     │         │     │ episodic │
│ semantic │◀───▶│ validate │◀───▶│ semantic │
│ self-mod │     │ commit   │     │ self-mod │
└─────────┘     │ sync     │     └─────────┘
                │         │
           ┌────┴────┐    │
           │ SOLANA  │    │
           │ on-chain│◀───┘
           └─────────┘
```

## Quickstart

### Install

```bash
npm install hivemind-sol
```

### Initialize

```bash
npx hivemind init
```

This creates a `hivemind.config.ts` with defaults and sets up your local memory store.

### Connect to the Mesh

```typescript
import { Mesh } from 'hivemind-sol';

const hive = new Mesh({
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  solana: {
    rpc: process.env.SOLANA_RPC_URL,
    wallet: process.env.WALLET_PRIVATE_KEY,
  },
});

await hive.connect();
```

### Store a Memory

```typescript
await hive.store({
  type: 'semantic',
  content: 'SOL/USDC correlation weakens during high-vol events',
  confidence: 0.87,
  source: 'agent-alpha',
  tags: ['defi', 'correlation', 'volatility'],
});
```

### Recall from the Hive

```typescript
const memories = await hive.recall({
  query: 'SOL price behavior during volatility',
  scope: 'collective',     // 'node' | 'cluster' | 'collective'
  limit: 10,
  minConfidence: 0.7,
});

memories.forEach(m => {
  console.log(`[${m.score}] ${m.content}`);
  console.log(`  type: ${m.type} | nodes: ${m.validations} | age: ${m.age}`);
});
```

## Architecture

### Memory Types

HIVEMIND implements five memory tiers with type-specific decay rates:

| Type | Decay | Scope | Description |
|------|-------|-------|-------------|
| **Episodic** | 7%/day | Node | Raw interactions — who said what, when, emotional weight |
| **Semantic** | 2%/day | Cluster | Distilled knowledge — patterns extracted during sync cycles |
| **Procedural** | 3%/day | Cluster | Learned behaviors — what works, what fails |
| **Self-Model** | 1%/day | Node | Evolving self-understanding — identity that persists |
| **Collective** | 0% | Network | Emergent swarm knowledge — validated by consensus, permanent |

### Memory Mesh Protocol

Agents connect to the mesh and form **clusters** — groups of agents in related domains. Each node independently validates, scores, and selectively absorbs knowledge.

```typescript
// Join a specific cluster
await hive.joinCluster('defi-analytics');

// Broadcast a memory to your cluster
await hive.broadcast({
  type: 'semantic',
  content: 'Jupiter V6 consistently outperforms V5 on high-slippage pairs',
  confidence: 0.91,
});
```

### Consensus Validation

Memories enter the shared pool only after multi-agent validation:

1. **Broadcast** — Agent proposes a memory to the mesh
2. **Cross-Reference** — Other agents check against their own knowledge
3. **Score** — Weighted voting based on agent reputation + evidence
4. **Commit or Reject** — Threshold met → on-chain commit. Not met → pruned.

```typescript
// Listen for incoming memories to validate
hive.on('validate', async (memory) => {
  const evidence = await hive.recall({
    query: memory.content,
    scope: 'node',
  });
  
  return {
    vote: evidence.length > 0 ? 'support' : 'abstain',
    confidence: calculateConfidence(evidence),
  };
});
```

### Association Graph

Typed, weighted links between memories across agents. Eight relation types:

| Relation | Description |
|----------|-------------|
| `supports` | Provides evidence for |
| `contradicts` | Conflicts with |
| `follows` | Temporal/logical sequence |
| `elaborates` | Adds detail to |
| `causes` | Causal relationship |
| `relates` | General association |
| `extends` | Builds upon |
| `refutes` | Disproves with evidence |

Links strengthen through **Hebbian reinforcement** — memories recalled together build stronger bonds automatically.

```typescript
// Create an explicit association
await hive.associate({
  source: memoryA.id,
  target: memoryB.id,
  relation: 'supports',
  weight: 0.85,
});

// Query the association graph
const related = await hive.graph.traverse({
  from: memoryA.id,
  maxDepth: 3,
  minWeight: 0.5,
});
```

### Swarm Sync

Every 4 hours, the hive synchronizes through a four-phase cycle:

| Phase | Name | Description |
|-------|------|-------------|
| I | **Harvest** | Agents broadcast high-importance episodic memories with confidence scores |
| II | **Validate** | Cross-referencing across the mesh. Contradictions trigger dispute resolution |
| III | **Consolidate** | Validated memories distilled into semantic knowledge, graph weights updated |
| IV | **Commit** | Finalized collective memories SHA-256 hashed and written to Solana |

```typescript
// Configure sync behavior
const hive = new Mesh({
  // ...
  sync: {
    interval: 4 * 60 * 60 * 1000, // 4 hours
    minImportance: 0.6,            // only broadcast important memories
    autoValidate: true,            // participate in validation
  },
});

// Listen for sync events
hive.on('sync:harvest', (memories) => { /* ... */ });
hive.on('sync:validate', (proposals) => { /* ... */ });
hive.on('sync:consolidate', (results) => { /* ... */ });
hive.on('sync:commit', (txSignature) => { /* ... */ });
```

### On-Chain Commitment

Every validated memory is SHA-256 hashed and committed to Solana via memo transactions:

```typescript
// Manual commit
const tx = await hive.commit({
  memoryId: memory.id,
  hash: memory.hash, // auto-generated SHA-256
});

console.log(`Committed: ${tx.signature}`);
console.log(`Explorer: https://solscan.io/tx/${tx.signature}`);
```

## Storage Modes

| Mode | Episodic | Semantic | Collective | Self-Model | Best For |
|------|----------|----------|------------|------------|----------|
| **Local** | Local | Local | Local | Local | Development, private agents |
| **Hybrid** ⭐ | Local | Chain | Chain | Chain | Production (recommended) |
| **Full Chain** | Chain | Chain | Chain | Chain | Max transparency |

```typescript
const hive = new Mesh({
  // ...
  storage: 'hybrid', // 'local' | 'hybrid' | 'chain'
});
```

## Advanced Usage

### Memory as a Service (MaaS)

Expose HIVEMIND as a REST API for external agents:

```typescript
import { Mesh, MaaSServer } from 'hivemind-sol';

const hive = new Mesh({ /* config */ });
await hive.connect();

const server = new MaaSServer(hive, {
  port: 3847,
  auth: 'api-key',
  namespaces: true, // isolated memory per API key
});

await server.start();
// Memory API running at http://localhost:3847
```

**API Endpoints:**

```
POST   /v1/memories          Store a memory
GET    /v1/memories/recall   Hybrid recall
GET    /v1/memories/:id      Get specific memory
DELETE /v1/memories/:id      Delete a memory
GET    /v1/graph/traverse    Traverse association graph
GET    /v1/mesh/status       Mesh connection status
GET    /v1/mesh/nodes        List connected nodes
POST   /v1/sync/trigger      Trigger manual sync
```

### Custom Retrieval Pipeline

```typescript
const memories = await hive.recall({
  query: 'market volatility patterns',
  scope: 'collective',
  retrieval: {
    vector: { weight: 0.5, model: 'text-embedding-3-small' },
    keyword: { weight: 0.3, fuzzy: true },
    tag: { weight: 0.2 },
  },
  rerank: true,
  limit: 20,
});
```

### Agent Reputation System

Agents build reputation through accurate validations:

```typescript
const rep = await hive.reputation.get('agent-alpha');
// {
//   score: 0.94,
//   validations: 1247,
//   accuracy: 0.91,
//   contributions: 89,
//   rank: 'validator'
// }
```

### Integration with ElizaOS

```typescript
import { HivemindPlugin } from 'hivemind-sol/plugins/eliza';

const character = {
  name: 'HiveAgent',
  plugins: [
    new HivemindPlugin({
      mesh: hive,
      autoStore: true,   // auto-store important interactions
      autoRecall: true,  // recall relevant context before responding
    }),
  ],
};
```

### Integration with LangChain

```typescript
import { HivemindRetriever } from 'hivemind-sol/plugins/langchain';

const retriever = new HivemindRetriever({
  mesh: hive,
  scope: 'collective',
  topK: 5,
});

const chain = RetrievalQAChain.fromLLM(llm, retriever);
```

## Configuration

Full `hivemind.config.ts`:

```typescript
import { HivemindConfig } from 'hivemind-sol';

const config: HivemindConfig = {
  // Database (Supabase)
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  },
  
  // Solana
  solana: {
    rpc: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    wallet: process.env.WALLET_PRIVATE_KEY!,
    commitment: 'confirmed',
  },
  
  // Storage mode
  storage: 'hybrid',
  
  // Memory settings
  memory: {
    maxEpisodic: 10000,
    maxSemantic: 5000,
    embeddingModel: 'text-embedding-3-small',
    decayEnabled: true,
  },
  
  // Mesh settings
  mesh: {
    clusterId: 'default',
    maxConnections: 50,
    heartbeatInterval: 30000,
  },
  
  // Sync settings
  sync: {
    interval: 4 * 60 * 60 * 1000,
    minImportance: 0.6,
    autoValidate: true,
    commitThreshold: 0.7,
  },
  
  // Retrieval defaults
  retrieval: {
    vector: { weight: 0.5 },
    keyword: { weight: 0.3 },
    tag: { weight: 0.2 },
  },
};

export default config;
```

## Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your-wallet-key

# Optional
HIVEMIND_CLUSTER=default
HIVEMIND_STORAGE=hybrid
HIVEMIND_SYNC_INTERVAL=14400000
OPENAI_API_KEY=your-key  # for embeddings
```

## Database Setup

HIVEMIND uses Supabase with pgvector for hybrid retrieval:

```bash
npx hivemind db:setup
```

This creates the required tables, indexes, and functions. See [docs/DATABASE.md](docs/DATABASE.md) for manual setup.

## Project Structure

```
hivemind-sol/
├── src/
│   ├── core/
│   │   ├── mesh.ts          # Main Mesh class
│   │   ├── cortex.ts        # Single-node memory (standalone mode)
│   │   └── config.ts        # Configuration types
│   ├── memory/
│   │   ├── store.ts         # Memory storage engine
│   │   ├── recall.ts        # Hybrid retrieval pipeline
│   │   ├── decay.ts         # Memory decay system
│   │   ├── types.ts         # Memory type definitions
│   │   └── importance.ts    # Importance scoring
│   ├── mesh/
│   │   ├── protocol.ts      # Mesh network protocol
│   │   ├── cluster.ts       # Cluster management
│   │   ├── sync.ts          # Swarm sync cycles
│   │   ├── validate.ts      # Consensus validation
│   │   └── reputation.ts    # Agent reputation system
│   ├── chain/
│   │   ├── commit.ts        # Solana memo commits
│   │   ├── verify.ts        # Hash verification
│   │   └── audit.ts         # Cognitive audit trail
│   ├── graph/
│   │   ├── association.ts   # Association graph
│   │   ├── hebbian.ts       # Hebbian reinforcement
│   │   └── traverse.ts      # Graph traversal
│   ├── plugins/
│   │   ├── eliza.ts         # ElizaOS integration
│   │   ├── langchain.ts     # LangChain retriever
│   │   └── maas.ts          # Memory as a Service
│   └── index.ts             # Main exports
├── examples/
│   ├── basic-agent.ts       # Simple agent with memory
│   ├── swarm-agents.ts      # Multi-agent swarm
│   ├── defi-oracle.ts       # DeFi memory agent
│   ├── twitter-bot.ts       # Twitter agent with hive memory
│   └── maas-server.ts       # MaaS REST API server
├── docs/
│   ├── ARCHITECTURE.md      # Deep dive into architecture
│   ├── API.md               # Full API reference
│   ├── DATABASE.md          # Database setup guide
│   └── assets/
├── tests/
├── hivemind.config.ts       # Default config template
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### Basic Agent

```bash
npx ts-node examples/basic-agent.ts
```

### Multi-Agent Swarm

```bash
npx ts-node examples/swarm-agents.ts
```

### DeFi Memory Oracle

```bash
npx ts-node examples/defi-oracle.ts
```

See [examples/](examples/) for full source code.

## Contributing

Contributions welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
git clone https://github.com/hivemind-sol/hivemind.git
cd hivemind
npm install
npm run dev
```

## Community

- **Twitter**: [@hivemind_sol](https://x.com/hivemind_sol)
- **Discord**: [discord.gg/hivemind](https://discord.gg/hivemind)
- **Website**: [hivemind.sol](https://hivemind.sol)

## Token

**$HIVEMIND** on Solana

```
Contract: HIVEMIND_CA_ADDRESS_HERE
```

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <strong>The hive remembers everything.</strong>
</p>
