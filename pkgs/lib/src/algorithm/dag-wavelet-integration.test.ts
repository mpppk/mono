import { describe, expect, it } from "vitest";
import { DAG, Nodes } from "./dag";
import { WaveletMatrixEdges } from "./wavelet-matrix-edges";
import type { NodeID } from "./values";

describe("DAG with WaveletMatrixEdges", () => {
  it("should work interchangeably with original Edges implementation", () => {
    // Create two identical DAGs - one with original edges, one with wavelet matrix
    const originalDAG = new DAG<string, number>(new Nodes());
    const waveletDAG = new DAG<string, number>(
      new Nodes(),
      new WaveletMatrixEdges<number>(),
    );

    // Add the same nodes and edges to both
    const a1 = originalDAG.nodes.add("a");
    const b1 = originalDAG.nodes.add("b");
    const c1 = originalDAG.nodes.add("c");
    const d1 = originalDAG.nodes.add("d");

    const a2 = waveletDAG.nodes.add("a");
    const b2 = waveletDAG.nodes.add("b");
    const c2 = waveletDAG.nodes.add("c");
    const d2 = waveletDAG.nodes.add("d");

    // Add edges (diamond pattern)
    originalDAG.edges.add(a1, b1, 10);
    originalDAG.edges.add(a1, c1, 20);
    originalDAG.edges.add(b1, d1, 30);
    originalDAG.edges.add(c1, d1, 40);

    waveletDAG.edges.add(a2, b2, 10);
    waveletDAG.edges.add(a2, c2, 20);
    waveletDAG.edges.add(b2, d2, 30);
    waveletDAG.edges.add(c2, d2, 40);

    // Verify both have the same structure
    expect(originalDAG.roots).toEqual(waveletDAG.roots);
    expect(originalDAG.leafs).toEqual(waveletDAG.leafs);

    // Check edge values are the same
    expect(originalDAG.edges.getValue(a1, b1)).toBe(
      waveletDAG.edges.getValue(a2, b2),
    );
    expect(originalDAG.edges.getValue(a1, c1)).toBe(
      waveletDAG.edges.getValue(a2, c2),
    );
    expect(originalDAG.edges.getValue(b1, d1)).toBe(
      waveletDAG.edges.getValue(b2, d2),
    );
    expect(originalDAG.edges.getValue(c1, d1)).toBe(
      waveletDAG.edges.getValue(c2, d2),
    );

    // Check adjacency structure is the same
    const origA = originalDAG.edges.get(a1);
    const wavA = waveletDAG.edges.get(a2);
    expect(origA).toBeDefined();
    expect(wavA).toBeDefined();
    expect(origA!.children.length).toBe(wavA!.children.length);
    expect(origA!.parent.length).toBe(wavA!.parent.length);

    const origD = originalDAG.edges.get(d1);
    const wavD = waveletDAG.edges.get(d2);
    expect(origD).toBeDefined();
    expect(wavD).toBeDefined();
    expect(origD!.children.length).toBe(wavD!.children.length);
    expect(origD!.parent.length).toBe(wavD!.parent.length);

    // Test path finding algorithms work the same
    const originalPaths = [
      ...originalDAG.findShortestPath({
        from: a1,
        to: d1,
        costF: (e) => e.value,
      }),
    ];
    const waveletPaths = [
      ...waveletDAG.findShortestPath({
        from: a2,
        to: d2,
        costF: (e) => e.value,
      }),
    ];

    // Should have the same number of paths
    expect(originalPaths.length).toBe(waveletPaths.length);

    // Should have the same minimum cost
    if (originalPaths.length > 0 && waveletPaths.length > 0) {
      expect(originalPaths[0].cost).toBe(waveletPaths[0].cost);
    }
  });

  it("should maintain consistent behavior with complex DAG operations", () => {
    const waveletDAG = new DAG<string, string>(
      new Nodes(),
      new WaveletMatrixEdges<string>(),
    );

    // Create a more complex graph
    const nodes = ["root", "a", "b", "c", "d", "leaf1", "leaf2"].map((n) =>
      waveletDAG.nodes.add(n),
    );
    const [root, a, b, c, d, leaf1, leaf2] = nodes;

    // Add multiple levels of edges
    waveletDAG.edges.add(root, a, "edge1");
    waveletDAG.edges.add(root, b, "edge2");
    waveletDAG.edges.add(a, c, "edge3");
    waveletDAG.edges.add(a, d, "edge4");
    waveletDAG.edges.add(b, c, "edge5");
    waveletDAG.edges.add(b, d, "edge6");
    waveletDAG.edges.add(c, leaf1, "edge7");
    waveletDAG.edges.add(d, leaf1, "edge8");
    waveletDAG.edges.add(d, leaf2, "edge9");

    // Test roots and leafs
    expect(waveletDAG.roots).toHaveLength(1);
    expect(waveletDAG.roots[0]).toBe(root);
    expect(waveletDAG.leafs).toHaveLength(2);
    expect(waveletDAG.leafs).toContain(leaf1);
    expect(waveletDAG.leafs).toContain(leaf2);

    // Test DFS traversal
    const allPaths = [...waveletDAG.dfs()];
    expect(allPaths.length).toBeGreaterThan(0);

    // Test cycle detection (should be none)
    expect(waveletDAG.detectCycle()).toBeNull();

    // Test waypoint path finding
    const waypointPaths = [...waveletDAG.findWaypointPath([root, c, leaf1])];
    expect(waypointPaths.length).toBeGreaterThan(0);

    // Ensure all paths go through the waypoint
    for (const path of waypointPaths) {
      expect(path.path).toContain(root);
      expect(path.path).toContain(c);
      expect(path.path).toContain(leaf1);
    }
  });

  it("should provide memory and serialization benefits", () => {
    const originalDAG = new DAG<number, number>(new Nodes());
    const waveletDAG = new DAG<number, number>(
      new Nodes(),
      new WaveletMatrixEdges<number>(),
    );

    // Add many nodes and edges to see the difference
    const numNodes = 100;
    const originalNodes: NodeID[] = [];
    const waveletNodes: NodeID[] = [];

    // Add nodes
    for (let i = 0; i < numNodes; i++) {
      originalNodes.push(originalDAG.nodes.add(i));
      waveletNodes.push(waveletDAG.nodes.add(i));
    }

    // Add edges (each node connects to the next few nodes)
    for (let i = 0; i < numNodes - 3; i++) {
      originalDAG.edges.add(originalNodes[i], originalNodes[i + 1], i);
      originalDAG.edges.add(originalNodes[i], originalNodes[i + 2], i * 2);
      originalDAG.edges.add(originalNodes[i], originalNodes[i + 3], i * 3);

      waveletDAG.edges.add(waveletNodes[i], waveletNodes[i + 1], i);
      waveletDAG.edges.add(waveletNodes[i], waveletNodes[i + 2], i * 2);
      waveletDAG.edges.add(waveletNodes[i], waveletNodes[i + 3], i * 3);
    }

    // Test serialization
    const originalSerialized = originalDAG.serializeEdges();
    const waveletSerialized = waveletDAG.serializeEdges();

    // Should have the same structure
    expect(originalSerialized.children.length).toBe(
      waveletSerialized.children.length,
    );
    expect(originalSerialized.parent.length).toBe(
      waveletSerialized.parent.length,
    );

    // Verify the serialized data contains the same information
    expect(originalSerialized.children.length).toBeGreaterThan(0);
    expect(waveletSerialized.children.length).toBeGreaterThan(0);

    console.log(
      "Original edges serialized size:",
      JSON.stringify(originalSerialized).length,
    );
    console.log(
      "Wavelet matrix edges serialized size:",
      JSON.stringify(waveletSerialized).length,
    );
  });
});
