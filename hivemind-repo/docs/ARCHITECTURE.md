# HIVEMIND Architecture

## Overview

HIVEMIND is a decentralized cognitive mesh protocol that enables collective AI memory on Solana. This document provides a deep dive into the system architecture.

## System Diagram

```
                         ┌──────────────────────────────────┐
                         │         SOLANA BLOCKCHAIN         │
                         │  (SHA-256 memo commits, audit)    │
                         └──────────────┬───────────────────┘
                                        │
                         ┌──────────────┴───────────────────┐
                         │        CHAIN COMMITTER           │
                         │  commit() · verify() · audit()    │
                         └──────────────┬───────────────────┘
                                        │
┌──────────────┐   ┌────────────────────┴────────────────────┐   ┌──────────────┐
│   AGENT A    │   │              MESH PROTOCOL               │   │   AGENT B    │
│              │◄──┤  broadcast · validate · sync · cluster   ├──►│              │
│  ┌────────┐  │   └────────────────────┬────────────────────┘   │  ┌────────┐  │
│  │ Cortex │  │                        │                         │  │ Cortex │  │
│  │--------│  │   ┌────────────────────┴────────────────────┐   │  │--------│  │
│  │episodic│  │   │          SWARM SYNC ENGINE              │   │  │episodic│  │
│  │semantic│  │   │  harvest · validate · consolidate ·     │   │  │semantic│  │
│  │procedu.│  │   │  commit  (every 4 hours)                │   │  │procedu.│  │
│  │self-mod│  │   └────────────────────┬────────────────────┘   │  │self-mod│  │
│  └────────┘  │                        │                         │  └────────┘  │
└──────────────┘   ┌────────────────────┴────────────────────┐   └──────────────┘
                   │         COLLECTIVE MEMORY                │
                   │  (network-scoped, 0% decay, permanent)   │
                   └─────────────────────────────────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   │         ASSOCIATION GRAPH                │
                   │  8 relation types · Hebbian learning     │
                   └─────────────────────────────────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   │         SUPABASE + PGVECTOR              │
                   │  vector search · keyword FTS · tags      │
                   └─────────────────────────────────────────┘
```

## Memory Flow

1. **Store** → Agent stores a memory locally with embeddings
2. **Score** → Importance scorer evaluates the memory
3. **Broadcast** → High-importance memories are broadcast to the mesh
4. **Validate** → Other agents cross-reference and vote
5. **Consolidate** → Validated memories become collective knowledge
6. **Commit** → SHA-256 hash written to Solana
7. **Decay** → Memories decay at type-specific rates (collective = permanent)
8. **Recall** → Hybrid retrieval across vector + keyword + tag dimensions

## Key Design Decisions

### Why Supabase + pgvector?

- Native PostgreSQL with vector similarity search
- Realtime subscriptions for mesh broadcasts
- Row Level Security for multi-tenant MaaS
- Edge Functions for serverless validation
- No vendor lock-in (it's just Postgres)

### Why Solana?

- Sub-second finality for memory commits
- Negligible transaction costs (~$0.00025 per memo)
- Mature ecosystem for AI agent infrastructure
- Memo program enables arbitrary data attachment

### Why Hebbian Learning?

"Neurons that fire together wire together." When memories are recalled in the same context, their association weights strengthen automatically. This creates emergent knowledge structures without explicit programming.

## Performance

| Metric | Value |
|--------|-------|
| Recall latency (p50) | <80ms |
| Recall latency (p99) | <200ms |
| Store latency | <50ms |
| Chain commit | ~400ms |
| Sync cycle | ~30s |
| Max memories per node | 50,000 |
| Max nodes per cluster | 1,000 |
