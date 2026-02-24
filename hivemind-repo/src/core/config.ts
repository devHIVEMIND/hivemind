import type { HivemindConfig } from '../memory/types';

const DEFAULTS: Partial<HivemindConfig> = {
  storage: 'hybrid',
  memory: {
    maxEpisodic: 10000,
    maxSemantic: 5000,
    embeddingModel: 'text-embedding-3-small',
    decayEnabled: true,
  },
  mesh: {
    clusterId: 'default',
    maxConnections: 50,
    heartbeatInterval: 30000,
  },
  sync: {
    interval: 4 * 60 * 60 * 1000,
    minImportance: 0.6,
    autoValidate: true,
    commitThreshold: 0.7,
  },
  retrieval: {
    vector: { weight: 0.5 },
    keyword: { weight: 0.3 },
    tag: { weight: 0.2 },
  },
};

export function createConfig(overrides: Partial<HivemindConfig>): HivemindConfig {
  return {
    ...DEFAULTS,
    ...overrides,
    memory: { ...DEFAULTS.memory, ...overrides.memory },
    mesh: { ...DEFAULTS.mesh, ...overrides.mesh },
    sync: { ...DEFAULTS.sync, ...overrides.sync },
    retrieval: { ...DEFAULTS.retrieval, ...overrides.retrieval },
  } as HivemindConfig;
}

export const defineConfig = createConfig;
