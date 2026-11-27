/**
 * Succinct bit vector with rank/select support
 * Used for marking boundaries in wavelet matrix representation
 */
export class SuccinctBitVector {
  private bits: Uint32Array;
  private rankTable!: Uint32Array;
  private selectTable!: number[][];
  private size: number;
  private blockSize = 32; // Size of each block in bits

  constructor(bits: boolean[] | number[]) {
    this.size = bits.length;
    const numBlocks = Math.ceil(this.size / this.blockSize);
    this.bits = new Uint32Array(numBlocks);

    // Build bit array
    for (let i = 0; i < bits.length; i++) {
      if (bits[i]) {
        this.setBit(i);
      }
    }

    this.buildRankTable();
    this.buildSelectTables();
  }

  private setBit(index: number): void {
    const blockIndex = Math.floor(index / this.blockSize);
    const bitIndex = index % this.blockSize;
    this.bits[blockIndex] |= 1 << bitIndex;
  }

  private getBit(index: number): boolean {
    if (index >= this.size) return false;
    const blockIndex = Math.floor(index / this.blockSize);
    const bitIndex = index % this.blockSize;
    return (this.bits[blockIndex] & (1 << bitIndex)) !== 0;
  }

  private buildRankTable(): void {
    const numBlocks = this.bits.length;
    this.rankTable = new Uint32Array(numBlocks + 1);

    let rank = 0;
    for (let i = 0; i < numBlocks; i++) {
      this.rankTable[i] = rank;
      rank += this.popcount(this.bits[i]);
    }
    this.rankTable[numBlocks] = rank;
  }

  private buildSelectTables(): void {
    this.selectTable = [[], []];
    const sampleRate = Math.ceil(Math.sqrt(this.size));

    let rank0 = 0,
      rank1 = 0;

    for (let i = 0; i < this.size; i++) {
      const bit = this.getBit(i) ? 1 : 0;

      if (bit === 0) {
        if (rank0 % sampleRate === 0) {
          this.selectTable[0][Math.floor(rank0 / sampleRate)] = i;
        }
        rank0++;
      } else {
        if (rank1 % sampleRate === 0) {
          this.selectTable[1][Math.floor(rank1 / sampleRate)] = i;
        }
        rank1++;
      }
    }
  }

  private popcount(n: number): number {
    // Count number of set bits in a 32-bit integer
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }

  /**
   * Return the number of 1s in bits[0..i-1]
   */
  rank1(i: number): number {
    if (i <= 0) return 0;
    if (i >= this.size) i = this.size;

    const blockIndex = Math.floor(i / this.blockSize);
    const remainder = i % this.blockSize;

    let rank = this.rankTable[blockIndex];

    // Add bits in the partial block
    if (remainder > 0) {
      const mask = (1 << remainder) - 1;
      rank += this.popcount(this.bits[blockIndex] & mask);
    }

    return rank;
  }

  /**
   * Return the number of 0s in bits[0..i-1]
   */
  rank0(i: number): number {
    return i - this.rank1(i);
  }

  /**
   * Return the position of the (i+1)-th occurrence of bit value
   */
  select(bit: number, i: number): number {
    if (bit !== 0 && bit !== 1) throw new Error("bit must be 0 or 1");
    if (i < 0) return -1;

    // For small vectors, use linear search
    if (this.size <= 100) {
      let count = 0;
      const targetCount = i + 1;

      for (let pos = 0; pos < this.size; pos++) {
        if ((this.getBit(pos) ? 1 : 0) === bit) {
          count++;
          if (count === targetCount) {
            return pos;
          }
        }
      }

      return -1; // Not found
    }

    const sampleRate = Math.ceil(Math.sqrt(this.size));
    const tableIndex = Math.floor(i / sampleRate);

    let start = 0;
    if (tableIndex < this.selectTable[bit].length) {
      start = this.selectTable[bit][tableIndex];
    }

    // Linear search from sample point
    let count = tableIndex * sampleRate;
    const targetCount = i + 1;

    for (let pos = start; pos < this.size; pos++) {
      if ((this.getBit(pos) ? 1 : 0) === bit) {
        count++;
        if (count === targetCount) {
          return pos;
        }
      }
    }

    return -1; // Not found
  }

  /**
   * Get the length of the bit vector
   */
  length(): number {
    return this.size;
  }
}
