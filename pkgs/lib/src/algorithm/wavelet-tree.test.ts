import { describe, it, expect } from "vitest";
import { WaveletTree } from "./wavelet-tree";

describe("WaveletTree", () => {
  describe("basic operations", () => {
    it("handles empty sequence", () => {
      const wt = new WaveletTree([]);
      expect(wt.getSequence()).toEqual([]);
      expect(wt.rank(1, 0)).toBe(0);
      expect(wt.select(1, 1)).toBe(-1);
    });

    it("handles single element", () => {
      const wt = new WaveletTree([5]);
      expect(wt.getSequence()).toEqual([5]);
      expect(wt.access(0)).toBe(5);
      expect(wt.rank(5, 0)).toBe(1);
      expect(wt.select(5, 1)).toBe(0);
      expect(wt.select(5, 2)).toBe(-1);
    });

    it("handles simple sequence", () => {
      const sequence = [1, 0, 1, 2, 0, 1];
      const wt = new WaveletTree(sequence);

      expect(wt.getSequence()).toEqual(sequence);

      // Test access
      for (let i = 0; i < sequence.length; i++) {
        expect(wt.access(i)).toBe(sequence[i]);
      }
    });
  });

  describe("rank operations", () => {
    it("counts character occurrences correctly", () => {
      const wt = new WaveletTree([1, 0, 1, 2, 0, 1]); // positions: 0,1,2,3,4,5

      // Rank of 0
      expect(wt.rank(0, 0)).toBe(0); // no 0s up to pos 0
      expect(wt.rank(0, 1)).toBe(1); // one 0 up to pos 1
      expect(wt.rank(0, 3)).toBe(1); // still one 0 up to pos 3
      expect(wt.rank(0, 4)).toBe(2); // two 0s up to pos 4
      expect(wt.rank(0, 5)).toBe(2); // still two 0s up to pos 5

      // Rank of 1
      expect(wt.rank(1, 0)).toBe(1); // one 1 up to pos 0
      expect(wt.rank(1, 1)).toBe(1); // still one 1 up to pos 1
      expect(wt.rank(1, 2)).toBe(2); // two 1s up to pos 2
      expect(wt.rank(1, 5)).toBe(3); // three 1s up to pos 5

      // Rank of 2
      expect(wt.rank(2, 2)).toBe(0); // no 2s up to pos 2
      expect(wt.rank(2, 3)).toBe(1); // one 2 up to pos 3
      expect(wt.rank(2, 5)).toBe(1); // still one 2 up to pos 5
    });

    it("handles out of bounds rank queries", () => {
      const wt = new WaveletTree([1, 0, 1, 2]);
      expect(wt.rank(1, -1)).toBe(0);
      expect(wt.rank(1, 10)).toBe(0);
    });
  });

  describe("select operations", () => {
    it("finds correct positions", () => {
      const wt = new WaveletTree([1, 0, 1, 2, 0, 1]); // [1,0,1,2,0,1]

      // Select for 0 (appears at positions 1, 4)
      expect(wt.select(0, 1)).toBe(1); // 1st occurrence at pos 1
      expect(wt.select(0, 2)).toBe(4); // 2nd occurrence at pos 4
      expect(wt.select(0, 3)).toBe(-1); // no 3rd occurrence

      // Select for 1 (appears at positions 0, 2, 5)
      expect(wt.select(1, 1)).toBe(0); // 1st occurrence at pos 0
      expect(wt.select(1, 2)).toBe(2); // 2nd occurrence at pos 2
      expect(wt.select(1, 3)).toBe(5); // 3rd occurrence at pos 5
      expect(wt.select(1, 4)).toBe(-1); // no 4th occurrence

      // Select for 2 (appears at position 3)
      expect(wt.select(2, 1)).toBe(3); // 1st occurrence at pos 3
      expect(wt.select(2, 2)).toBe(-1); // no 2nd occurrence
    });

    it("handles invalid select queries", () => {
      const wt = new WaveletTree([1, 0, 1]);
      expect(wt.select(1, 0)).toBe(-1); // 0th occurrence doesn't make sense
      expect(wt.select(1, -1)).toBe(-1); // negative index
      expect(wt.select(5, 1)).toBe(-1); // character not in sequence
    });
  });

  describe("findAll operations", () => {
    it("finds all positions of character", () => {
      const wt = new WaveletTree([1, 0, 1, 2, 0, 1]);

      expect(wt.findAll(0)).toEqual([1, 4]);
      expect(wt.findAll(1)).toEqual([0, 2, 5]);
      expect(wt.findAll(2)).toEqual([3]);
      expect(wt.findAll(5)).toEqual([]); // character not in sequence
    });
  });

  describe("serialization", () => {
    it("serializes and deserializes correctly", () => {
      const originalSequence = [3, 1, 4, 1, 5, 9, 2, 6];
      const wt = new WaveletTree(originalSequence);

      const serialized = wt.serialize();
      const deserialized = WaveletTree.fromSerialized(serialized);

      expect(deserialized.getSequence()).toEqual(originalSequence);

      // Test that operations work the same
      for (let i = 0; i < originalSequence.length; i++) {
        expect(deserialized.access(i)).toBe(wt.access(i));
        for (const char of [1, 2, 3, 4, 5, 6, 9]) {
          expect(deserialized.rank(char, i)).toBe(wt.rank(char, i));
        }
      }
    });
  });

  describe("complex sequences", () => {
    it("handles sequences with repeated patterns", () => {
      const wt = new WaveletTree([0, 1, 0, 1, 0, 1, 2, 2, 2]);

      // Test some rank queries
      expect(wt.rank(0, 4)).toBe(3); // 3 zeros up to position 4
      expect(wt.rank(1, 5)).toBe(3); // 3 ones up to position 5
      expect(wt.rank(2, 8)).toBe(3); // 3 twos up to position 8

      // Test some select queries
      expect(wt.select(0, 2)).toBe(2); // 2nd zero at position 2
      expect(wt.select(1, 3)).toBe(5); // 3rd one at position 5
      expect(wt.select(2, 1)).toBe(6); // 1st two at position 6
    });

    it("works with larger alphabet", () => {
      const wt = new WaveletTree([10, 5, 15, 3, 12, 8, 20, 1]);

      expect(wt.access(2)).toBe(15);
      expect(wt.rank(5, 3)).toBe(1);
      expect(wt.select(12, 1)).toBe(4);
      expect(wt.findAll(20)).toEqual([6]);
    });
  });
});
