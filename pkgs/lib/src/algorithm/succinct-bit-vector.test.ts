import { describe, expect, it } from "vitest";
import { SuccinctBitVector } from "./succinct-bit-vector";

describe("SuccinctBitVector", () => {
  describe("basic operations", () => {
    it("should handle empty bit vector", () => {
      const sbv = new SuccinctBitVector([]);
      expect(sbv.length()).toBe(0);
      expect(sbv.rank1(0)).toBe(0);
      expect(sbv.rank0(0)).toBe(0);
    });

    it("should handle single bit", () => {
      const sbv1 = new SuccinctBitVector([1]);
      expect(sbv1.length()).toBe(1);
      expect(sbv1.rank1(0)).toBe(0);
      expect(sbv1.rank1(1)).toBe(1);
      expect(sbv1.rank0(0)).toBe(0);
      expect(sbv1.rank0(1)).toBe(0);

      const sbv0 = new SuccinctBitVector([0]);
      expect(sbv0.length()).toBe(1);
      expect(sbv0.rank1(0)).toBe(0);
      expect(sbv0.rank1(1)).toBe(0);
      expect(sbv0.rank0(0)).toBe(0);
      expect(sbv0.rank0(1)).toBe(1);
    });

    it("should handle simple bit patterns", () => {
      // Pattern: 10110
      const sbv = new SuccinctBitVector([1, 0, 1, 1, 0]);
      expect(sbv.length()).toBe(5);

      // Test rank1
      expect(sbv.rank1(0)).toBe(0); // before first bit
      expect(sbv.rank1(1)).toBe(1); // after first 1
      expect(sbv.rank1(2)).toBe(1); // after first 0
      expect(sbv.rank1(3)).toBe(2); // after second 1
      expect(sbv.rank1(4)).toBe(3); // after third 1
      expect(sbv.rank1(5)).toBe(3); // after last 0

      // Test rank0
      expect(sbv.rank0(0)).toBe(0); // before first bit
      expect(sbv.rank0(1)).toBe(0); // after first 1
      expect(sbv.rank0(2)).toBe(1); // after first 0
      expect(sbv.rank0(3)).toBe(1); // after second 1
      expect(sbv.rank0(4)).toBe(1); // after third 1
      expect(sbv.rank0(5)).toBe(2); // after last 0
    });
  });

  describe("select operations", () => {
    it("should find correct positions for select1", () => {
      // Pattern: 10110
      const sbv = new SuccinctBitVector([1, 0, 1, 1, 0]);

      expect(sbv.select(1, 0)).toBe(0); // first 1 at position 0
      expect(sbv.select(1, 1)).toBe(2); // second 1 at position 2
      expect(sbv.select(1, 2)).toBe(3); // third 1 at position 3
      expect(sbv.select(1, 3)).toBe(-1); // no fourth 1
    });

    it("should find correct positions for select0", () => {
      // Pattern: 10110
      const sbv = new SuccinctBitVector([1, 0, 1, 1, 0]);

      expect(sbv.select(0, 0)).toBe(1); // first 0 at position 1
      expect(sbv.select(0, 1)).toBe(4); // second 0 at position 4
      expect(sbv.select(0, 2)).toBe(-1); // no third 0
    });

    it("should handle boundary cases", () => {
      const sbv = new SuccinctBitVector([1, 1, 1]);
      expect(sbv.select(1, 0)).toBe(0);
      expect(sbv.select(1, 1)).toBe(1);
      expect(sbv.select(1, 2)).toBe(2);
      expect(sbv.select(0, 0)).toBe(-1); // no 0s
    });
  });

  describe("large bit vectors", () => {
    it("should handle bit vectors larger than block size", () => {
      // Create a pattern with 100 bits: alternating 0,1,0,1,...
      const pattern = Array.from({ length: 100 }, (_, i) => i % 2);
      const sbv = new SuccinctBitVector(pattern);

      expect(sbv.length()).toBe(100);

      // Test some rank operations
      expect(sbv.rank1(0)).toBe(0);
      expect(sbv.rank1(2)).toBe(1); // [0,1] -> 1 one
      expect(sbv.rank1(4)).toBe(2); // [0,1,0,1] -> 2 ones
      expect(sbv.rank1(100)).toBe(50); // 50 ones total

      expect(sbv.rank0(0)).toBe(0);
      expect(sbv.rank0(2)).toBe(1); // [0,1] -> 1 zero
      expect(sbv.rank0(4)).toBe(2); // [0,1,0,1] -> 2 zeros
      expect(sbv.rank0(100)).toBe(50); // 50 zeros total

      // Test some select operations
      expect(sbv.select(1, 0)).toBe(1); // first 1 at position 1
      expect(sbv.select(1, 1)).toBe(3); // second 1 at position 3
      expect(sbv.select(1, 24)).toBe(49); // 25th 1 at position 49

      expect(sbv.select(0, 0)).toBe(0); // first 0 at position 0
      expect(sbv.select(0, 1)).toBe(2); // second 0 at position 2
      expect(sbv.select(0, 24)).toBe(48); // 25th 0 at position 48
    });
  });

  describe("boundary marking use case", () => {
    it("should work for DAG edge boundary marking", () => {
      // Simulate DAG with 4 nodes:
      // Node 0: 2 edges
      // Node 1: 0 edges
      // Node 2: 3 edges
      // Node 3: 1 edge
      // Boundary pattern: [0,0,1,0,0,0,1,0] (1s mark start of new node's edges)
      const boundaries = [0, 0, 1, 0, 0, 0, 1, 0];
      const sbv = new SuccinctBitVector(boundaries);

      // Find start positions for each node's edges
      // Node 0 starts at position 0
      // Node 1 would start at position 2 (after node 0's 2 edges)
      // Node 2 starts at position 2 (first 1)
      // Node 3 starts at position 6 (second 1)

      expect(sbv.select(1, 0)).toBe(2); // Node 2 starts at position 2
      expect(sbv.select(1, 1)).toBe(6); // Node 3 starts at position 6

      // Count edges before each boundary
      expect(sbv.rank0(2)).toBe(2); // 2 edges before Node 2
      expect(sbv.rank0(6)).toBe(5); // 5 edges before Node 3
    });
  });
});
