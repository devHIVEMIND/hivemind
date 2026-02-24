export class ImportanceScorer {
  private weights = {
    length: 0.1,
    specificity: 0.3,
    novelty: 0.3,
    actionability: 0.3,
  };

  score(content: string): number {
    const lengthScore = Math.min(1, content.length / 500);
    const specificityScore = this.calcSpecificity(content);
    const actionScore = this.calcActionability(content);

    return Math.min(1,
      lengthScore * this.weights.length +
      specificityScore * this.weights.specificity +
      actionScore * this.weights.actionability +
      0.5 * this.weights.novelty // Default novelty
    );
  }

  private calcSpecificity(content: string): number {
    const numbers = (content.match(/\d+/g) || []).length;
    const properNouns = (content.match(/[A-Z][a-z]+/g) || []).length;
    return Math.min(1, (numbers * 0.2 + properNouns * 0.15));
  }

  private calcActionability(content: string): number {
    const actionWords = ['should', 'must', 'always', 'never', 'prefer', 'avoid', 'use', 'try'];
    const lower = content.toLowerCase();
    const hits = actionWords.filter(w => lower.includes(w)).length;
    return Math.min(1, hits * 0.25);
  }
}
