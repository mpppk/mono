import { DAG } from "./dag";
import { WaveletEdges } from "./wavelet-edges";
import { NodeID } from "./values";

/**
 * Create a sample graph for testing serialization size
 */
function createSampleGraph() {
  const dag = new DAG<string, number>();
  
  // Create a chain of 100 nodes
  const nodes: NodeID[] = [];
  for (let i = 0; i < 100; i++) {
    nodes.push(dag.nodes.add(`node-${i}`));
  }
  
  // Create edges in a chain and some cross-connections
  for (let i = 0; i < 99; i++) {
    dag.edges.add(nodes[i], nodes[i + 1], i);
    
    // Add some cross-connections for every 10th node
    if (i % 10 === 0 && i + 10 < nodes.length) {
      dag.edges.add(nodes[i], nodes[i + 10], i + 1000);
    }
  }
  
  return { dag, nodes };
}

/**
 * Compare serialization sizes between traditional format and wavelet tree format
 */
export function compareSerialization() {
  const { dag } = createSampleGraph();
  
  // Traditional serialization (from the DAG's WaveletEdges, but serialized in traditional format)
  const traditionalSerialized = dag.edges.serialize();
  
  // Wavelet tree compact serialization
  const compactSerialized = dag.edges.serializeCompact();
  
  // Convert to JSON strings to compare sizes
  const traditionalJson = JSON.stringify(traditionalSerialized);
  const compactJson = JSON.stringify(compactSerialized);
  
  console.log("=== Serialization Size Comparison ===");
  console.log(`Traditional format: ${traditionalJson.length} characters`);
  console.log(`Compact format: ${compactJson.length} characters`);
  console.log(`Size reduction: ${((traditionalJson.length - compactJson.length) / traditionalJson.length * 100).toFixed(1)}%`);
  
  // Show stats about the edges
  const stats = dag.edges.getStats();
  console.log(`\nEdge statistics:`);
  console.log(`- Total edges: ${stats.edgeCount}`);
  console.log(`- Unique from nodes: ${stats.uniqueFromNodes}`);
  console.log(`- Unique to nodes: ${stats.uniqueToNodes}`);
  
  return {
    traditionalSize: traditionalJson.length,
    compactSize: compactJson.length,
    sizeReduction: (traditionalJson.length - compactJson.length) / traditionalJson.length,
    stats
  };
}

// Example usage for manual testing
if (require.main === module) {
  compareSerialization();
}