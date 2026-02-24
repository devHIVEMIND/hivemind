# HIVEMIND API Reference

## Mesh

### `new Mesh(config)`

Create a new mesh connection.

### `hive.connect()`

Connect to the HIVEMIND mesh network.

### `hive.disconnect()`

Disconnect from the mesh.

### `hive.store(options)`

Store a memory. Returns `Promise<Memory>`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `MemoryType` | ✓ | Memory type |
| `content` | `string` | ✓ | Memory content |
| `confidence` | `number` | | Confidence score (0-1) |
| `tags` | `string[]` | | Tags for retrieval |
| `source` | `string` | | Source identifier |

### `hive.recall(options)`

Recall memories using hybrid retrieval. Returns `Promise<RecallResult[]>`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | ✓ | Search query |
| `scope` | `MemoryScope` | | `'node'` \| `'cluster'` \| `'collective'` |
| `limit` | `number` | | Max results (default: 10) |
| `minConfidence` | `number` | | Minimum confidence filter |

### `hive.broadcast(options)`

Store and broadcast a memory to the mesh. Returns `Promise<Memory>`.

### `hive.commit(options)`

Manually commit a memory to Solana. Returns `Promise<{ signature: string }>`.

### `hive.associate(options)`

Create an association between two memories. Returns `Promise<AssociationLink>`.

### `hive.status()`

Get mesh connection status.

## Cortex (Standalone)

### `new Cortex(config)`

Create a standalone brain (no mesh).

### `brain.init()`

Initialize the cortex.

### `brain.store(options)` / `brain.recall(options)`

Same as Mesh but node-scoped only.

## Events

| Event | Data | Description |
|-------|------|-------------|
| `connected` | — | Connected to mesh |
| `disconnected` | — | Disconnected |
| `memory:stored` | `Memory` | Memory stored |
| `memory:recalled` | `RecallResult[]` | Memories recalled |
| `validate` | `Memory` | Incoming memory to validate |
| `sync:harvest` | `Memory[]` | Sync phase I |
| `sync:validate` | `Memory[]` | Sync phase II |
| `sync:consolidate` | `Memory[]` | Sync phase III |
| `sync:commit` | `string` | Sync phase IV (tx signature) |
| `chain:committed` | `string, string` | On-chain commit (sig, memoryId) |
