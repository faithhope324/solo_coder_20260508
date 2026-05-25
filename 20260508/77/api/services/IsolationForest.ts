interface IsolationTreeOptions {
  maxDepth?: number;
  subsampleSize?: number;
}

interface TreeNode {
  splitFeature?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
  size?: number;
}

export interface TransactionFeatures {
  amount: number;
  hourDeviation: number;
  locationDeviation: number;
  merchantRisk: number;
  frequency: number;
}

export class IsolationForest {
  private trees: TreeNode[] = [];
  private numTrees: number;
  private maxDepth: number;
  private subsampleSize: number;
  private featureMin: number[] = [];
  private featureMax: number[] = [];

  constructor(numTrees: number = 100, options: IsolationTreeOptions = {}) {
    this.numTrees = numTrees;
    this.maxDepth = options.maxDepth || 12;
    this.subsampleSize = options.subsampleSize || 256;
  }

  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private fitNormalizer(data: number[][]): void {
    const numFeatures = data[0].length;
    this.featureMin = new Array(numFeatures).fill(Infinity);
    this.featureMax = new Array(numFeatures).fill(-Infinity);

    for (const row of data) {
      for (let i = 0; i < numFeatures; i++) {
        if (row[i] < this.featureMin[i]) this.featureMin[i] = row[i];
        if (row[i] > this.featureMax[i]) this.featureMax[i] = row[i];
      }
    }

    for (let i = 0; i < numFeatures; i++) {
      if (this.featureMax[i] === this.featureMin[i]) {
        this.featureMax[i] = this.featureMin[i] + 1;
      }
    }
  }

  private normalize(features: number[]): number[] {
    return features.map((val, i) => {
      if (this.featureMax[i] === this.featureMin[i]) return 0.5;
      return (val - this.featureMin[i]) / (this.featureMax[i] - this.featureMin[i]);
    });
  }

  private buildTree(data: number[][], depth: number = 0): TreeNode {
    const depthLimit = Math.min(this.maxDepth, Math.ceil(Math.log2(Math.max(data.length, 2))));

    if (depth >= depthLimit || data.length <= 1) {
      return { size: data.length };
    }

    const numFeatures = data[0].length;
    const splitFeature = this.randomInt(0, numFeatures - 1);

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of data) {
      if (row[splitFeature] < minVal) minVal = row[splitFeature];
      if (row[splitFeature] > maxVal) maxVal = row[splitFeature];
    }

    if (minVal === maxVal) {
      return { size: data.length };
    }

    const splitValue = this.random(minVal, maxVal);

    const leftData: number[][] = [];
    const rightData: number[][] = [];

    for (const row of data) {
      if (row[splitFeature] < splitValue) {
        leftData.push(row);
      } else {
        rightData.push(row);
      }
    }

    if (leftData.length === 0 || rightData.length === 0) {
      return { size: data.length };
    }

    return {
      splitFeature,
      splitValue,
      left: this.buildTree(leftData, depth + 1),
      right: this.buildTree(rightData, depth + 1),
    };
  }

  private pathLength(features: number[], node: TreeNode, depth: number = 0): number {
    if (!node.left && !node.right) {
      return depth + this.cFactor(node.size || 1);
    }

    const splitFeature = node.splitFeature!;
    const splitValue = node.splitValue!;

    if (features[splitFeature] < splitValue) {
      return this.pathLength(features, node.left!, depth + 1);
    } else {
      return this.pathLength(features, node.right!, depth + 1);
    }
  }

  private cFactor(n: number): number {
    if (n <= 1) return 0;
    const harmonicNumber = Math.log(n - 1) + 0.5772156649;
    return 2 * harmonicNumber - (2 * (n - 1)) / n;
  }

  public fit(data: number[][]): void {
    this.fitNormalizer(data);

    const normalizedData = data.map((row) => this.normalize(row));

    for (let i = 0; i < this.numTrees; i++) {
      const subsample: number[][] = [];
      const subSize = Math.min(this.subsampleSize, normalizedData.length);

      for (let j = 0; j < subSize; j++) {
        const idx = this.randomInt(0, normalizedData.length - 1);
        subsample.push([...normalizedData[idx]]);
      }

      this.trees.push(this.buildTree(subsample));
    }
  }

  public anomalyScore(features: number[]): number {
    const normalized = this.normalize(features);

    let sumPathLength = 0;
    for (const tree of this.trees) {
      sumPathLength += this.pathLength(normalized, tree);
    }

    const avgPathLength = sumPathLength / this.numTrees;
    const c = this.cFactor(Math.min(this.subsampleSize, 256));

    return Math.pow(2, -avgPathLength / c);
  }

  public predict(features: number[], threshold: number = 0.6): { score: number; isFraud: boolean } {
    const score = this.anomalyScore(features);
    return {
      score,
      isFraud: score > threshold,
    };
  }

  public static extractFeatures(tx: TransactionFeatures): number[] {
    return [
      Math.log1p(tx.amount),
      tx.hourDeviation,
      tx.locationDeviation,
      tx.merchantRisk,
      tx.frequency,
    ];
  }
}

export function createTrainedModel(): IsolationForest {
  const model = new IsolationForest(100, { maxDepth: 12, subsampleSize: 256 });

  function random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  const trainingData: number[][] = [];
  for (let i = 0; i < 5000; i++) {
    const isAnomaly = Math.random() < 0.03;

    if (isAnomaly) {
      trainingData.push([
        Math.log1p(random(5000, 50000)),
        random(8, 24),
        random(0.7, 1.0),
        random(0.7, 1.0),
        random(3, 10),
      ]);
    } else {
      trainingData.push([
        Math.log1p(random(10, 2000)),
        random(0, 8),
        random(0, 0.4),
        random(0, 0.4),
        random(0, 2),
      ]);
    }
  }

  model.fit(trainingData);
  return model;
}
