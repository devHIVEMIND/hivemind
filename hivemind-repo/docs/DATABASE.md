# Database Setup

HIVEMIND uses **Supabase** with **pgvector** for hybrid vector + keyword retrieval.

## Automatic Setup

```bash
npx hivemind db:setup
```

## Manual Setup

If you prefer to set up manually, run these SQL statements in your Supabase SQL editor:

### 1. Enable pgvector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Tables

```sql
-- Memories table
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('episodic', 'semantic', 'procedural', 'self-model', 'collective')),
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(1536),
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  importance FLOAT DEFAULT 0.5,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  decay_factor FLOAT DEFAULT 1.0,
  validations INTEGER DEFAULT 0,
  chain_tx TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Association graph
CREATE TABLE associations (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES memories(id) ON DELETE CASCADE,
  target_id TEXT REFERENCES memories(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'contradicts', 'follows', 'elaborates', 'causes', 'relates', 'extends', 'refutes')),
  weight FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reinforcements INTEGER DEFAULT 0
);

-- Mesh nodes
CREATE TABLE mesh_nodes (
  id TEXT PRIMARY KEY,
  cluster_id TEXT DEFAULT 'default',
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  memory_count INTEGER DEFAULT 0,
  validation_count INTEGER DEFAULT 0
);

-- Clusters
CREATE TABLE clusters (
  id TEXT PRIMARY KEY,
  name TEXT,
  node_count INTEGER DEFAULT 0,
  memory_count INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ,
  topics JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesh broadcasts
CREATE TABLE mesh_broadcasts (
  id SERIAL PRIMARY KEY,
  memory_id TEXT REFERENCES memories(id),
  source_node TEXT,
  cluster_id TEXT,
  priority TEXT DEFAULT 'normal',
  ttl INTEGER DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation votes
CREATE TABLE validation_votes (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  memory_id TEXT REFERENCES memories(id),
  vote TEXT CHECK (vote IN ('support', 'oppose', 'abstain')),
  confidence FLOAT DEFAULT 0.5,
  evidence JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent reputation
CREATE TABLE agent_reputation (
  agent_id TEXT PRIMARY KEY,
  score FLOAT DEFAULT 0.5,
  validations INTEGER DEFAULT 0,
  accuracy FLOAT DEFAULT 0.5,
  contributions INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Create Indexes

```sql
-- Vector similarity search index
CREATE INDEX memories_embedding_idx ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX memories_content_fts_idx ON memories
  USING GIN (to_tsvector('english', content));

-- Type + importance index for sync queries
CREATE INDEX memories_type_importance_idx ON memories(type, importance DESC);

-- Association graph indexes
CREATE INDEX associations_source_idx ON associations(source_id);
CREATE INDEX associations_target_idx ON associations(target_id);

-- Mesh node status index
CREATE INDEX mesh_nodes_status_idx ON mesh_nodes(status);
```

### 4. Create Functions

```sql
-- Vector similarity match function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  scope_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id TEXT,
  type TEXT,
  content TEXT,
  summary TEXT,
  embedding vector(1536),
  tags JSONB,
  source TEXT,
  confidence FLOAT,
  importance FLOAT,
  hash TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  access_count INTEGER,
  last_accessed_at TIMESTAMPTZ,
  decay_factor FLOAT,
  validations INTEGER,
  chain_tx TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.*,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
    AND m.decay_factor > 0.01
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Increment access count
CREATE OR REPLACE FUNCTION increment_access_count(memory_id TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE memories
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$;

-- Apply memory decay
CREATE OR REPLACE FUNCTION apply_memory_decay(memory_type TEXT, decay_rate FLOAT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE memories
  SET decay_factor = GREATEST(0, decay_factor - decay_rate),
      updated_at = NOW()
  WHERE type = memory_type
    AND decay_factor > 0;
END;
$$;

-- Hebbian reinforcement
CREATE OR REPLACE FUNCTION reinforce_association(source TEXT, target TEXT, boost FLOAT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE associations
  SET weight = LEAST(1.0, weight + boost),
      reinforcements = reinforcements + 1
  WHERE (source_id = source AND target_id = target)
     OR (source_id = target AND target_id = source);
END;
$$;
```

### 5. Enable Realtime (Optional)

For real-time mesh updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE validation_votes;
```

## Row Level Security

For production, enable RLS:

```sql
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_nodes ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON memories FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON associations FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON mesh_nodes FOR ALL
  USING (auth.role() = 'service_role');
```
