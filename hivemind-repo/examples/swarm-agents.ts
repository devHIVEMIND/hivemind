/**
 * HIVEMIND — Multi-Agent Swarm Example
 *
 * Spawns multiple agents that share knowledge through the mesh.
 * Run: npx ts-node examples/swarm-agents.ts
 */

import { Mesh } from 'hivemind-sol';
import 'dotenv/config';

async function createAgent(name: string, cluster: string) {
  const hive = new Mesh({
    supabase: {
      url: process.env.SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    },
    solana: {
      rpc: process.env.SOLANA_RPC_URL!,
      wallet: process.env.WALLET_PRIVATE_KEY!,
    },
    storage: 'hybrid',
    mesh: { clusterId: cluster },
    sync: { autoValidate: true },
  });

  await hive.connect();

  // Auto-validate incoming memories
  hive.on('validate', async (memory) => {
    const evidence = await hive.recall({
      query: memory.content,
      scope: 'node',
      limit: 3,
    });

    const hasEvidence = evidence.length > 0 && evidence[0].score > 0.6;

    console.log(`[${name}] Validating: "${memory.content.slice(0, 50)}..." → ${hasEvidence ? 'SUPPORT' : 'ABSTAIN'}`);

    return {
      agentId: hive.nodeId,
      memoryId: memory.id,
      vote: hasEvidence ? 'support' as const : 'abstain' as const,
      confidence: hasEvidence ? evidence[0].score : 0.5,
      timestamp: new Date(),
    };
  });

  // Listen for sync events
  hive.on('sync:commit', (tx) => {
    console.log(`[${name}] Swarm sync committed: ${tx}`);
  });

  return { name, hive };
}

async function main() {
  console.log('Spawning HIVEMIND swarm...\n');

  // Create agents in the same cluster
  const alpha = await createAgent('Alpha', 'defi-analytics');
  const beta = await createAgent('Beta', 'defi-analytics');
  const gamma = await createAgent('Gamma', 'defi-analytics');

  console.log('3 agents connected to "defi-analytics" cluster\n');

  // Alpha discovers something and broadcasts to the mesh
  console.log('[Alpha] Broadcasting discovery...');
  await alpha.hive.broadcast({
    type: 'semantic',
    content: 'Raydium CLMM pools show 40% higher fee generation than standard AMM pools',
    confidence: 0.88,
    tags: ['raydium', 'clmm', 'fees'],
    priority: 'high',
  });

  // Beta contributes different knowledge
  console.log('[Beta] Broadcasting discovery...');
  await beta.hive.broadcast({
    type: 'semantic',
    content: 'Orca Whirlpools concentrated liquidity positions within 5% range capture 80% of fees',
    confidence: 0.85,
    tags: ['orca', 'whirlpools', 'concentrated-liquidity'],
  });

  // Gamma queries the collective
  console.log('\n[Gamma] Querying collective for DEX insights...');
  const insights = await gamma.hive.recall({
    query: 'best liquidity provision strategies on Solana DEXes',
    scope: 'collective',
    limit: 5,
  });

  console.log(`\n[Gamma] Found ${insights.length} collective insights:`);
  for (const r of insights) {
    console.log(`  [${r.score.toFixed(2)}] ${r.memory.content}`);
  }

  // Create association between related memories
  if (insights.length >= 2) {
    await gamma.hive.associate({
      source: insights[0].memory.id,
      target: insights[1].memory.id,
      relation: 'relates',
      weight: 0.8,
    });
    console.log('\n[Gamma] Created association between top 2 insights');
  }

  // Cleanup
  await Promise.all([
    alpha.hive.disconnect(),
    beta.hive.disconnect(),
    gamma.hive.disconnect(),
  ]);

  console.log('\nSwarm disconnected');
}

main().catch(console.error);
