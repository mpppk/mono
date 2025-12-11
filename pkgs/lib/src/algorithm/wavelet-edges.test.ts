import { describe, it, expect } from "vitest";
import { WaveletEdges } from "./wavelet-edges";
import { NodeID } from "./values";

describe("WaveletEdges", () => {
  describe("basic operations", () => {
    it("handles empty edges", () => {
      const edges = new WaveletEdges<number>();

      expect(edges.get(NodeID.new(0))).toBeUndefined();
      expect(edges.getStats().edgeCount).toBe(0);

      const serialized = edges.serialize();
      expect(serialized.parent).toEqual([]);
      expect(serialized.children).toEqual([]);
    });

    it("adds and retrieves single edge", () => {
      const edges = new WaveletEdges<number>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      edges.add(nodeA, nodeB, 42);

      const nodeAEdges = edges.get(nodeA);
      expect(nodeAEdges).toBeDefined();
      expect(nodeAEdges!.children).toHaveLength(1);
      expect(nodeAEdges!.children[0]).toEqual({
        from: nodeA,
        to: nodeB,
        value: 42,
      });
      expect(nodeAEdges!.parent).toHaveLength(0);

      const nodeBEdges = edges.get(nodeB);
      expect(nodeBEdges).toBeDefined();
      expect(nodeBEdges!.parent).toHaveLength(1);
      expect(nodeBEdges!.parent[0]).toEqual({
        from: nodeA,
        to: nodeB,
        value: 42,
      });
      expect(nodeBEdges!.children).toHaveLength(0);
    });

    it("handles multiple edges from same node", () => {
      const edges = new WaveletEdges<string>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);
      const nodeC = NodeID.new(2);

      edges.add(nodeA, nodeB, "ab");
      edges.add(nodeA, nodeC, "ac");

      const nodeAEdges = edges.get(nodeA);
      expect(nodeAEdges).toBeDefined();
      expect(nodeAEdges!.children).toHaveLength(2);
      expect(nodeAEdges!.children.map((e) => e.value).sort()).toEqual([
        "ab",
        "ac",
      ]);
    });

    it("handles multiple edges to same node", () => {
      const edges = new WaveletEdges<string>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);
      const nodeC = NodeID.new(2);

      edges.add(nodeA, nodeC, "ac");
      edges.add(nodeB, nodeC, "bc");

      const nodeCEdges = edges.get(nodeC);
      expect(nodeCEdges).toBeDefined();
      expect(nodeCEdges!.parent).toHaveLength(2);
      expect(nodeCEdges!.parent.map((e) => e.value).sort()).toEqual([
        "ac",
        "bc",
      ]);
    });
  });

  describe("getValue", () => {
    it("returns correct edge value", () => {
      const edges = new WaveletEdges<number>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      edges.add(nodeA, nodeB, 123);
      expect(edges.getValue(nodeA, nodeB)).toBe(123);
    });

    it("throws error for non-existent edge", () => {
      const edges = new WaveletEdges<number>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      expect(() => edges.getValue(nodeA, nodeB)).toThrow("edge not found");
    });
  });

  describe("serialization", () => {
    it("serializes correctly with traditional format", () => {
      const edges = new WaveletEdges<number>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);
      const nodeC = NodeID.new(2);

      edges.add(nodeA, nodeB, 1);
      edges.add(nodeA, nodeC, 2);
      edges.add(nodeB, nodeC, 3);

      const serialized = edges.serialize();

      // Check children format: [from, [[to, value], ...]]
      expect(serialized.children).toEqual([
        [
          nodeA,
          [
            [nodeB, 1],
            [nodeC, 2],
          ],
        ],
        [nodeB, [[nodeC, 3]]],
      ]);

      // Check parent format: [to, [[from, value], ...]]
      expect(serialized.parent).toEqual([
        [nodeB, [[nodeA, 1]]],
        [
          nodeC,
          [
            [nodeA, 2],
            [nodeB, 3],
          ],
        ],
      ]);
    });

    it("handles compact serialization", () => {
      const edges = new WaveletEdges<number>();
      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      edges.add(nodeA, nodeB, 42);

      const compact = edges.serializeCompact();
      expect(compact.edges).toEqual([[0, 1, 42]]);
      expect(compact.fromTree).toBeDefined();
      expect(compact.toTree).toBeDefined();

      // Test round-trip
      const restored = WaveletEdges.fromCompactSerialization(compact);
      expect(restored.getValue(nodeA, nodeB)).toBe(42);

      const restoredNodeAEdges = restored.get(nodeA);
      expect(restoredNodeAEdges).toBeDefined();
      expect(restoredNodeAEdges!.children).toHaveLength(1);
      expect(restoredNodeAEdges!.children[0].value).toBe(42);
    });
  });

  describe("handlers", () => {
    it("calls handlers on edge addition", () => {
      const edges = new WaveletEdges<number>();
      const calls: Array<[NodeID, NodeID, number]> = [];

      edges.addHandler((from, to, value) => {
        calls.push([from, to, value]);
      });

      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      edges.add(nodeA, nodeB, 42);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([nodeA, nodeB, 42]);
    });

    it("calls multiple handlers", () => {
      const edges = new WaveletEdges<number>();
      const calls1: Array<[NodeID, NodeID, number]> = [];
      const calls2: Array<[NodeID, NodeID, number]> = [];

      edges.addHandler((from, to, value) => calls1.push([from, to, value]));
      edges.addHandler((from, to, value) => calls2.push([from, to, value]));

      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);

      edges.add(nodeA, nodeB, 42);

      expect(calls1).toHaveLength(1);
      expect(calls2).toHaveLength(1);
    });
  });

  describe("stats", () => {
    it("provides correct statistics", () => {
      const edges = new WaveletEdges<number>();

      let stats = edges.getStats();
      expect(stats.edgeCount).toBe(0);
      expect(stats.uniqueFromNodes).toBe(0);
      expect(stats.uniqueToNodes).toBe(0);

      const nodeA = NodeID.new(0);
      const nodeB = NodeID.new(1);
      const nodeC = NodeID.new(2);

      edges.add(nodeA, nodeB, 1);
      edges.add(nodeA, nodeC, 2);
      edges.add(nodeB, nodeC, 3);

      stats = edges.getStats();
      expect(stats.edgeCount).toBe(3);
      expect(stats.uniqueFromNodes).toBe(2); // A and B
      expect(stats.uniqueToNodes).toBe(2); // B and C
    });
  });

  describe("complex scenarios", () => {
    it("handles large number of edges efficiently", () => {
      const edges = new WaveletEdges<number>();

      // Create a chain of 100 nodes
      for (let i = 0; i < 99; i++) {
        edges.add(NodeID.new(i), NodeID.new(i + 1), i);
      }

      const stats = edges.getStats();
      expect(stats.edgeCount).toBe(99);
      expect(stats.uniqueFromNodes).toBe(99);
      expect(stats.uniqueToNodes).toBe(99);

      // Test that we can still query specific edges
      expect(edges.getValue(NodeID.new(0), NodeID.new(1))).toBe(0);
      expect(edges.getValue(NodeID.new(50), NodeID.new(51))).toBe(50);
      expect(edges.getValue(NodeID.new(98), NodeID.new(99))).toBe(98);

      // Test serialization still works
      const serialized = edges.serialize();
      expect(serialized.children).toHaveLength(99);
      expect(serialized.parent).toHaveLength(99);
    });
  });
});
