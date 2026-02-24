/**
 * HIVEMIND — Basic Agent Example
 *
 * Simple agent that stores and recalls memories.
 * Run: npx ts-node examples/basic-agent.ts
 */

import { Mesh } from 'hivemind-sol';
import 'dotenv/config';

async function main() {
  // Initialize the mesh
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
  });

  await hive.connect();
  console.log('Connected to HIVEMIND mesh');

  // Store some memories
  await hive.store({
    type: 'semantic',
    content: 'Jupiter V6 API provides better routing for high-slippage pairs',
    confidence: 0.9,
    tags: ['defi', 'jupiter', 'routing'],
  });

  await hive.store({
    type: 'episodic',
    content: 'User asked about SOL staking yields — recommended Marinade for liquid staking',
    tags: ['staking', 'marinade', 'user-interaction'],
  });

  await hive.store({
    type: 'procedural',
    content: 'When detecting rug pull signals, alert immediately and avoid recommending the token',
    confidence: 0.95,
    tags: ['safety', 'rug-detection'],
  });

  console.log('Stored 3 memories');

  // Recall from the hive
  const results = await hive.recall({
    query: 'best DEX routing on Solana',
    scope: 'collective',
    limit: 5,
  });

  console.log(`\nRecalled ${results.length} memories:`);
  for (const r of results) {
    console.log(`  [${r.score.toFixed(2)}] ${r.memory.content}`);
    console.log(`    type: ${r.memory.type} | confidence: ${r.memory.confidence}`);
  }

  // Check mesh status
  const status = await hive.status();
  console.log(`\nMesh status:`, status);

  await hive.disconnect();
  console.log('Disconnected');
}

main().catch(console.error);
