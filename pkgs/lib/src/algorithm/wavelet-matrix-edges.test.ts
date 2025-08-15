import { describe, expect, it } from "vitest";
import { WaveletMatrixEdges } from "./wavelet-matrix-edges";
import type { NodeID } from "./values";

// Helper to create NodeID (mimicking the actual NodeID type)
const nodeId = (id: number): NodeID => id as NodeID;

describe("WaveletMatrixEdges", () => {
  describe("basic edge operations", () => {
    it("should handle empty edges", () => {
      const edges = new WaveletMatrixEdges<number>();
      expect(edges.get(nodeId(0))).toBeUndefined();
    });

    it("should handle single edge", () => {
      const edges = new WaveletMatrixEdges<number>();
      edges.add(nodeId(0), nodeId(1), 42);
      
      const result = edges.get(nodeId(0));
      expect(result).toBeDefined();
      expect(result!.children).toHaveLength(1);
      expect(result!.children[0]).toEqual({
        from: nodeId(0),
        to: nodeId(1),
        value: 42
      });
      expect(result!.parent).toHaveLength(0);
      
      // Check reverse edge
      const reverseResult = edges.get(nodeId(1));
      expect(reverseResult).toBeDefined();
      expect(reverseResult!.parent).toHaveLength(1);
      expect(reverseResult!.parent[0]).toEqual({
        from: nodeId(0),
        to: nodeId(1),
        value: 42
      });
      expect(reverseResult!.children).toHaveLength(0);
    });

    it("should handle multiple edges from same node", () => {
      const edges = new WaveletMatrixEdges<string>();
      edges.add(nodeId(0), nodeId(1), "a");
      edges.add(nodeId(0), nodeId(2), "b");
      edges.add(nodeId(0), nodeId(3), "c");
      
      const result = edges.get(nodeId(0));
      expect(result).toBeDefined();
      expect(result!.children).toHaveLength(3);
      
      // Should contain all three edges (order may vary due to internal sorting)
      const children = result!.children;
      expect(children).toContainEqual({ from: nodeId(0), to: nodeId(1), value: "a" });
      expect(children).toContainEqual({ from: nodeId(0), to: nodeId(2), value: "b" });
      expect(children).toContainEqual({ from: nodeId(0), to: nodeId(3), value: "c" });
    });

    it("should handle edges from multiple nodes", () => {
      const edges = new WaveletMatrixEdges<number>();
      edges.add(nodeId(0), nodeId(2), 1);
      edges.add(nodeId(1), nodeId(2), 2);
      edges.add(nodeId(1), nodeId(3), 3);
      
      // Check node 0's edges
      const result0 = edges.get(nodeId(0));
      expect(result0).toBeDefined();
      expect(result0!.children).toHaveLength(1);
      expect(result0!.children[0]).toEqual({
        from: nodeId(0),
        to: nodeId(2),
        value: 1
      });
      
      // Check node 1's edges
      const result1 = edges.get(nodeId(1));
      expect(result1).toBeDefined();
      expect(result1!.children).toHaveLength(2);
      expect(result1!.children).toContainEqual({
        from: nodeId(1),
        to: nodeId(2),
        value: 2
      });
      expect(result1!.children).toContainEqual({
        from: nodeId(1),
        to: nodeId(3),
        value: 3
      });
      
      // Check node 2's incoming edges
      const result2 = edges.get(nodeId(2));
      expect(result2).toBeDefined();
      expect(result2!.parent).toHaveLength(2);
      expect(result2!.parent).toContainEqual({
        from: nodeId(0),
        to: nodeId(2),
        value: 1
      });
      expect(result2!.parent).toContainEqual({
        from: nodeId(1),
        to: nodeId(2),
        value: 2
      });
    });
  });

  describe("getValue operations", () => {
    it("should return correct edge values", () => {
      const edges = new WaveletMatrixEdges<string>();
      edges.add(nodeId(0), nodeId(1), "hello");
      edges.add(nodeId(0), nodeId(2), "world");
      edges.add(nodeId(1), nodeId(2), "test");
      
      expect(edges.getValue(nodeId(0), nodeId(1))).toBe("hello");
      expect(edges.getValue(nodeId(0), nodeId(2))).toBe("world");
      expect(edges.getValue(nodeId(1), nodeId(2))).toBe("test");
    });

    it("should throw error for non-existent edges", () => {
      const edges = new WaveletMatrixEdges<number>();
      edges.add(nodeId(0), nodeId(1), 42);
      
      expect(() => edges.getValue(nodeId(0), nodeId(2))).toThrow();
      expect(() => edges.getValue(nodeId(1), nodeId(0))).toThrow();
    });
  });

  describe("serialization", () => {
    it("should serialize correctly", () => {
      const edges = new WaveletMatrixEdges<number>();
      edges.add(nodeId(0), nodeId(1), 10);
      edges.add(nodeId(0), nodeId(2), 20);
      edges.add(nodeId(1), nodeId(2), 30);
      
      const serialized = edges.serialize();
      
      expect(serialized.children).toHaveLength(2); // 2 nodes with outgoing edges
      expect(serialized.parent).toHaveLength(2); // 2 nodes with incoming edges
      
      // Find node 0's children
      const node0Children = serialized.children.find(([nodeId]) => nodeId === 0);
      expect(node0Children).toBeDefined();
      expect(node0Children![1]).toHaveLength(2); // 2 outgoing edges
      
      // Find node 1's children
      const node1Children = serialized.children.find(([nodeId]) => nodeId === 1);
      expect(node1Children).toBeDefined();
      expect(node1Children![1]).toHaveLength(1); // 1 outgoing edge
    });

    it("should handle empty serialization", () => {
      const edges = new WaveletMatrixEdges<number>();
      const serialized = edges.serialize();
      
      expect(serialized.children).toHaveLength(0);
      expect(serialized.parent).toHaveLength(0);
    });
  });

  describe("handlers", () => {
    it("should call handlers when edges are added", () => {
      const edges = new WaveletMatrixEdges<string>();
      let callCount = 0;
      let lastCall: { from: NodeID; to: NodeID; value: string } | null = null;
      
      edges.addHandler((from, to, value, self) => {
        callCount++;
        lastCall = { from, to, value };
        expect(self).toBe(edges);
      });
      
      edges.add(nodeId(0), nodeId(1), "test");
      
      expect(callCount).toBe(1);
      expect(lastCall).toEqual({
        from: nodeId(0),
        to: nodeId(1),
        value: "test"
      });
      
      edges.add(nodeId(1), nodeId(2), "test2");
      expect(callCount).toBe(2);
    });

    it("should support multiple handlers", () => {
      const edges = new WaveletMatrixEdges<number>();
      let calls1 = 0;
      let calls2 = 0;
      
      edges.addHandler(() => { calls1++; });
      edges.addHandler(() => { calls2++; });
      
      edges.add(nodeId(0), nodeId(1), 42);
      
      expect(calls1).toBe(1);
      expect(calls2).toBe(1);
    });
  });

  describe("complex graph structures", () => {
    it("should handle DAG with multiple levels", () => {
      const edges = new WaveletMatrixEdges<number>();
      
      // Build a diamond-shaped DAG:
      //    0
      //   / \
      //  1   2
      //   \ /
      //    3
      edges.add(nodeId(0), nodeId(1), 1);
      edges.add(nodeId(0), nodeId(2), 2);
      edges.add(nodeId(1), nodeId(3), 3);
      edges.add(nodeId(2), nodeId(3), 4);
      
      // Check root node
      const result0 = edges.get(nodeId(0));
      expect(result0).toBeDefined();
      expect(result0!.children).toHaveLength(2);
      expect(result0!.parent).toHaveLength(0);
      
      // Check intermediate nodes
      const result1 = edges.get(nodeId(1));
      expect(result1).toBeDefined();
      expect(result1!.children).toHaveLength(1);
      expect(result1!.parent).toHaveLength(1);
      
      const result2 = edges.get(nodeId(2));
      expect(result2).toBeDefined();
      expect(result2!.children).toHaveLength(1);
      expect(result2!.parent).toHaveLength(1);
      
      // Check leaf node
      const result3 = edges.get(nodeId(3));
      expect(result3).toBeDefined();
      expect(result3!.children).toHaveLength(0);
      expect(result3!.parent).toHaveLength(2);
    });

    it("should handle sparse node IDs", () => {
      const edges = new WaveletMatrixEdges<string>();
      
      // Use non-sequential node IDs
      edges.add(nodeId(10), nodeId(25), "a");
      edges.add(nodeId(5), nodeId(10), "b");
      edges.add(nodeId(100), nodeId(5), "c");
      
      expect(edges.getValue(nodeId(10), nodeId(25))).toBe("a");
      expect(edges.getValue(nodeId(5), nodeId(10))).toBe("b");
      expect(edges.getValue(nodeId(100), nodeId(5))).toBe("c");
      
      const result10 = edges.get(nodeId(10));
      expect(result10).toBeDefined();
      expect(result10!.children).toHaveLength(1);
      expect(result10!.parent).toHaveLength(1);
    });
  });
});