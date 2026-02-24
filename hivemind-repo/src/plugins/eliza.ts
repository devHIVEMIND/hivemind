import { Mesh } from '../core/mesh';

interface ElizaPluginConfig { mesh: Mesh; autoStore?: boolean; autoRecall?: boolean; }

export class HivemindPlugin {
  private mesh: Mesh;
  private autoStore: boolean;
  private autoRecall: boolean;

  constructor(config: ElizaPluginConfig) {
    this.mesh = config.mesh;
    this.autoStore = config.autoStore ?? true;
    this.autoRecall = config.autoRecall ?? true;
  }

  get name() { return 'hivemind'; }
  get description() { return 'Collective AI memory via HIVEMIND mesh'; }
}
