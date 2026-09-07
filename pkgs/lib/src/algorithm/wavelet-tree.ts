/**
 * Simple Wavelet Tree implementation for efficient rank/select operations
 * Used to optimize graph adjacency list storage and serialization
 */

/**
 * Simple Wavelet Tree for a sequence over integer alphabet
 * This is a simplified implementation that prioritizes correctness over optimal complexity
 */
export class WaveletTree {
  private sequence: number[];
  private minValue: number;
  private maxValue: number;

  constructor(sequence: number[]) {
    this.sequence = [...sequence];
    if (sequence.length === 0) {
      this.minValue = 0;
      this.maxValue = 0;
    } else {
      this.minValue = Math.min(...sequence);
      this.maxValue = Math.max(...sequence);
    }
  }

  /**
   * Count occurrences of character c up to position i (inclusive)
   */
  rank(c: number, i: number): number {
    if (
      i < 0 ||
      i >= this.sequence.length ||
      c < this.minValue ||
      c > this.maxValue
    ) {
      return 0;
    }

    let count = 0;
    for (let pos = 0; pos <= i; pos++) {
      if (this.sequence[pos] === c) {
        count++;
      }
    }
    return count;
  }

  /**
   * Find position of j-th occurrence of character c (1-indexed)
   */
  select(c: number, j: number): number {
    if (j <= 0 || c < this.minValue || c > this.maxValue) return -1;

    let count = 0;
    for (let pos = 0; pos < this.sequence.length; pos++) {
      if (this.sequence[pos] === c) {
        count++;
        if (count === j) {
          return pos;
        }
      }
    }
    return -1;
  }

  /**
   * Access character at position i
   */
  access(i: number): number {
    if (i < 0 || i >= this.sequence.length) {
      throw new Error(`Index out of bounds: ${i}`);
    }
    return this.sequence[i];
  }

  /**
   * Get the original sequence
   */
  getSequence(): number[] {
    return [...this.sequence];
  }

  /**
   * Get all positions where character c appears
   */
  findAll(c: number): number[] {
    const positions: number[] = [];
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.sequence[i] === c) {
        positions.push(i);
      }
    }
    return positions;
  }

  /**
   * Serialize the wavelet tree to a compact format
   */
  serialize(): {
    sequence: number[];
    minValue: number;
    maxValue: number;
  } {
    return {
      sequence: this.sequence,
      minValue: this.minValue,
      maxValue: this.maxValue,
    };
  }

  /**
   * Create wavelet tree from serialized data
   */
  static fromSerialized(data: {
    sequence: number[];
    minValue: number;
    maxValue: number;
  }): WaveletTree {
    return new WaveletTree(data.sequence);
  }
}
