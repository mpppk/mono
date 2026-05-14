/**
 * Example demonstrating the usage of WaveletMatrixEdges for memory-efficient DAG representation
 */
import { DAG, Nodes, WaveletMatrixEdges } from "../algorithm";

export function waveletMatrixExample() {
  console.log("=== Wavelet Matrix DAG Example ===");

  // Create a DAG with the new wavelet matrix edge representation
  const nodes = new Nodes<string>();
  const waveletEdges = new WaveletMatrixEdges<number>();
  const dag = new DAG<string, number>(nodes, waveletEdges);

  // Add nodes
  const nodeA = dag.nodes.add("A");
  const nodeB = dag.nodes.add("B");
  const nodeC = dag.nodes.add("C");
  const nodeD = dag.nodes.add("D");
  const nodeE = dag.nodes.add("E");

  // Add edges to create a complex DAG structure
  dag.edges.add(nodeA, nodeB, 10); // A -> B (weight 10)
  dag.edges.add(nodeA, nodeC, 20); // A -> C (weight 20)
  dag.edges.add(nodeB, nodeD, 30); // B -> D (weight 30)
  dag.edges.add(nodeC, nodeD, 15); // C -> D (weight 15)
  dag.edges.add(nodeC, nodeE, 25); // C -> E (weight 25)
  dag.edges.add(nodeD, nodeE, 5); // D -> E (weight 5)

  console.log("DAG structure created with wavelet matrix edges:");
  console.log("Nodes:", dag.nodeSet.size);
  console.log("Roots:", dag.roots.length);
  console.log("Leafs:", dag.leafs.length);

  // Demonstrate path finding
  console.log("\nFinding shortest paths from A to E:");
  const paths = [
    ...dag.findShortestPath({
      from: nodeA,
      to: nodeE,
      costF: (edge) => edge.value,
    }),
  ];

  paths.forEach((path, i) => {
    const nodeNames = path.path.map((nodeId) => dag.nodes.get(nodeId));
    console.log(
      `Path ${i + 1}: ${nodeNames.join(" -> ")} (cost: ${path.cost})`,
    );
  });

  // Demonstrate DFS traversal
  console.log("\nDFS traversal paths:");
  let pathCount = 0;
  for (const path of dag.dfs()) {
    const nodeNames = path.map((nodeId) => dag.nodes.get(nodeId));
    console.log(`${nodeNames.join(" -> ")}`);
    pathCount++;
    if (pathCount >= 5) {
      // Limit output
      console.log("... (showing first 5 paths)");
      break;
    }
  }

  // Show serialization
  console.log("\nSerialized edges structure:");
  const serialized = dag.serializeEdges();
  console.log("Children nodes:", serialized.children.length);
  console.log("Parent relationships:", serialized.parent.length);

  return dag;
}

export function comparisonExample() {
  console.log("\n=== Comparison: Original vs Wavelet Matrix ===");

  // Create two identical DAGs with different edge implementations
  const originalDAG = new DAG<string, number>(new Nodes());
  const waveletDAG = new DAG<string, number>(
    new Nodes(),
    new WaveletMatrixEdges<number>(),
  );

  // Build the same graph structure in both
  const buildGraph = (dag: DAG<string, number>) => {
    const nodes = Array.from({ length: 20 }, (_, i) =>
      dag.nodes.add(`Node${i}`),
    );

    // Create a connected graph where each node connects to the next 3 nodes
    for (let i = 0; i < nodes.length - 3; i++) {
      dag.edges.add(nodes[i], nodes[i + 1], i + 1);
      dag.edges.add(nodes[i], nodes[i + 2], i + 2);
      dag.edges.add(nodes[i], nodes[i + 3], i + 3);
    }

    return nodes;
  };

  const originalNodes = buildGraph(originalDAG);
  const waveletNodes = buildGraph(waveletDAG);

  // Compare serialization sizes
  const originalSerialized = originalDAG.serializeEdges();
  const waveletSerialized = waveletDAG.serializeEdges();

  const originalSize = JSON.stringify(originalSerialized).length;
  const waveletSize = JSON.stringify(waveletSerialized).length;

  console.log(`Original edges serialized size: ${originalSize} bytes`);
  console.log(`Wavelet matrix edges serialized size: ${waveletSize} bytes`);
  console.log(`Size difference: ${originalSize - waveletSize} bytes`);

  // Verify they produce the same results
  const originalPaths = [
    ...originalDAG.findShortestPath({
      from: originalNodes[0],
      to: originalNodes[19],
      costF: (e) => e.value,
    }),
  ];

  const waveletPaths = [
    ...waveletDAG.findShortestPath({
      from: waveletNodes[0],
      to: waveletNodes[19],
      costF: (e) => e.value,
    }),
  ];

  console.log(
    "Path finding results match:",
    originalPaths.length === waveletPaths.length &&
      originalPaths[0]?.cost === waveletPaths[0]?.cost,
  );

  return { originalDAG, waveletDAG };
}

// Run the examples if this file is executed directly
if (require.main === module) {
  waveletMatrixExample();
  comparisonExample();
}
