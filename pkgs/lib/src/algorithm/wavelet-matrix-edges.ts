import { SuccinctBitVector } from "./succinct-bit-vector";
import type { NodeID } from "./values";

/**
 * Edge representation including source node
 */
type FullEdge<T> = {
  from: NodeID;
  to: NodeID;
  value: T;
};

/**
 * Edge representation
 */
type Edge<T> = {
  from: NodeID;
  to: NodeID;
  value: T;
};

/**
 * Interface for edge storage implementations
 */
interface IEdges<T> {
  addHandler(handler: (from: NodeID, to: NodeID, value: T, self: IEdges<T>) => void): void;
  add(from: NodeID, to: NodeID, value: T): void;
  get(from: NodeID): 
    | {
        parent: Edge<T>[];
        children: Edge<T>[];
      }
    | undefined;
  getValue(from: NodeID, to: NodeID): T;
  serialize(): { parent: any[]; children: any[] };
}

/**
 * Handler for edge changes
 */
type WaveletMatrixEdgesHandler<T> = (
  from: NodeID,
  to: NodeID,
  value: T,
  self: WaveletMatrixEdges<T>,
) => void;

/**
 * Wavelet matrix implementation of edges for memory-efficient DAG representation
 * Uses a flat array for all edges and succinct data structures to mark node boundaries
 */
export class WaveletMatrixEdges<T> implements IEdges<T> {
  // Temporary storage during construction
  private pendingEdges: FullEdge<T>[] = [];
  private pendingRevEdges: FullEdge<T>[] = [];
  
  // Compressed representation (built lazily)
  private flatEdges: Array<{ to: NodeID; value: T }> = [];
  private flatRevEdges: Array<{ to: NodeID; value: T }> = [];
  
  // Bit vectors to mark boundaries between different nodes' adjacency lists
  private edgeBoundaries: SuccinctBitVector | null = null;
  private revEdgeBoundaries: SuccinctBitVector | null = null;
  
  // Maps to find the position of each node's edges in the flat arrays
  private nodeEdgeStarts = new Map<NodeID, number>();
  private nodeRevEdgeStarts = new Map<NodeID, number>();
  
  private handlers: WaveletMatrixEdgesHandler<T>[] = [];
  private isDirty = true;

  constructor() {}

  public addHandler(handler: (from: NodeID, to: NodeID, value: T, self: IEdges<T>) => void): void {
    this.handlers.push(handler as WaveletMatrixEdgesHandler<T>);
  }

  public add(from: NodeID, to: NodeID, value: T): void {
    // Add to pending edges
    this.pendingEdges.push({ from, to, value });
    this.pendingRevEdges.push({ from: to, to: from, value });
    
    // Mark as dirty - boundaries need to be rebuilt
    this.isDirty = true;
    
    // Notify handlers
    this.handlers.forEach((h) => h(from, to, value, this));
  }

  /**
   * Build the succinct data structures for boundary marking
   * This is called lazily when needed
   */
  private buildBoundaries(): void {
    if (!this.isDirty) return;
    
    this.buildEdgeBoundaries();
    this.buildRevEdgeBoundaries();
    
    this.isDirty = false;
  }
  
  private buildEdgeBoundaries(): void {
    // Group edges by source node
    const edgesByNode = new Map<NodeID, Array<{ to: NodeID; value: T }>>();
    
    for (const edge of this.pendingEdges) {
      if (!edgesByNode.has(edge.from)) {
        edgesByNode.set(edge.from, []);
      }
      edgesByNode.get(edge.from)!.push({ to: edge.to, value: edge.value });
    }
    
    // Sort nodes to ensure consistent ordering
    const sortedNodes = Array.from(edgesByNode.keys()).sort((a, b) => Number(a) - Number(b));
    
    // Build flat array and boundary vector
    this.flatEdges = [];
    this.nodeEdgeStarts.clear();
    const boundaries: number[] = [];
    
    for (const nodeId of sortedNodes) {
      const edges = edgesByNode.get(nodeId)!;
      
      // Record where this node's edges start
      this.nodeEdgeStarts.set(nodeId, this.flatEdges.length);
      
      // Add boundary marker (1 for start of new node, 0 for continuation)
      if (boundaries.length === 0) {
        boundaries.push(1); // First node always starts with 1
      } else {
        boundaries.push(1); // Mark start of new node
      }
      
      // Add the edges
      this.flatEdges.push(...edges);
      
      // Add continuation markers (0s) for all edges except the first
      for (let i = 1; i < edges.length; i++) {
        boundaries.push(0);
      }
    }
    
    // Build succinct bit vector if we have boundaries
    if (boundaries.length > 0) {
      this.edgeBoundaries = new SuccinctBitVector(boundaries);
    } else {
      this.edgeBoundaries = null;
    }
  }
  
  private buildRevEdgeBoundaries(): void {
    // Group reverse edges by target node (which becomes the source in reverse)
    const revEdgesByNode = new Map<NodeID, Array<{ to: NodeID; value: T }>>();
    
    for (const edge of this.pendingRevEdges) {
      if (!revEdgesByNode.has(edge.from)) {
        revEdgesByNode.set(edge.from, []);
      }
      revEdgesByNode.get(edge.from)!.push({ to: edge.to, value: edge.value });
    }
    
    // Sort nodes to ensure consistent ordering
    const sortedNodes = Array.from(revEdgesByNode.keys()).sort((a, b) => Number(a) - Number(b));
    
    // Build flat array and boundary vector
    this.flatRevEdges = [];
    this.nodeRevEdgeStarts.clear();
    const boundaries: number[] = [];
    
    for (const nodeId of sortedNodes) {
      const edges = revEdgesByNode.get(nodeId)!;
      
      // Record where this node's edges start
      this.nodeRevEdgeStarts.set(nodeId, this.flatRevEdges.length);
      
      // Add boundary marker
      if (boundaries.length === 0) {
        boundaries.push(1); // First node always starts with 1
      } else {
        boundaries.push(1); // Mark start of new node
      }
      
      // Add the edges
      this.flatRevEdges.push(...edges);
      
      // Add continuation markers
      for (let i = 1; i < edges.length; i++) {
        boundaries.push(0);
      }
    }
    
    // Build succinct bit vector if we have boundaries
    if (boundaries.length > 0) {
      this.revEdgeBoundaries = new SuccinctBitVector(boundaries);
    } else {
      this.revEdgeBoundaries = null;
    }
  }

  /**
   * Get parent and children edges for a node
   */
  public get(from: NodeID): 
    | { parent: Array<{ from: NodeID; to: NodeID; value: T }>; 
        children: Array<{ from: NodeID; to: NodeID; value: T }> } 
    | undefined {
    this.buildBoundaries();
    
    // Get children (outgoing edges)
    const children: Array<{ from: NodeID; to: NodeID; value: T }> = [];
    if (this.nodeEdgeStarts.has(from)) {
      const startPos = this.nodeEdgeStarts.get(from)!;
      
      // Find end position using boundary vector
      let endPos = this.flatEdges.length;
      if (this.edgeBoundaries) {
        // Find next 1 after startPos to determine end
        const nodeIndex = this.getNodeIndex(from, this.nodeEdgeStarts);
        if (nodeIndex >= 0) {
          const nextBoundary = this.edgeBoundaries.select(1, nodeIndex + 1);
          if (nextBoundary >= 0) {
            endPos = nextBoundary;
          }
        }
      }
      
      // Extract edges for this node
      for (let i = startPos; i < endPos && i < this.flatEdges.length; i++) {
        const edge = this.flatEdges[i];
        children.push({ from, to: edge.to, value: edge.value });
      }
    }
    
    // Get parents (incoming edges)
    const parent: Array<{ from: NodeID; to: NodeID; value: T }> = [];
    if (this.nodeRevEdgeStarts.has(from)) {
      const startPos = this.nodeRevEdgeStarts.get(from)!;
      
      // Find end position
      let endPos = this.flatRevEdges.length;
      if (this.revEdgeBoundaries) {
        const nodeIndex = this.getNodeIndex(from, this.nodeRevEdgeStarts);
        if (nodeIndex >= 0) {
          const nextBoundary = this.revEdgeBoundaries.select(1, nodeIndex + 1);
          if (nextBoundary >= 0) {
            endPos = nextBoundary;
          }
        }
      }
      
      // Extract reverse edges for this node
      for (let i = startPos; i < endPos && i < this.flatRevEdges.length; i++) {
        const edge = this.flatRevEdges[i];
        parent.push({ from: edge.to, to: from, value: edge.value });
      }
    }
    
    if (children.length === 0 && parent.length === 0) {
      return undefined;
    }
    
    return { parent, children };
  }
  
  private getNodeIndex(nodeId: NodeID, nodeStarts: Map<NodeID, number>): number {
    const sortedNodes = Array.from(nodeStarts.keys()).sort((a, b) => Number(a) - Number(b));
    return sortedNodes.indexOf(nodeId);
  }

  /**
   * Get edge value between two nodes
   */
  public getValue(from: NodeID, to: NodeID): T {
    this.buildBoundaries();
    
    // Find edges for the source node
    if (!this.nodeEdgeStarts.has(from)) {
      throw new Error(`edge not found: ${from} -> ${to}`);
    }
    
    const startPos = this.nodeEdgeStarts.get(from)!;
    
    // Find end position
    let endPos = this.flatEdges.length;
    if (this.edgeBoundaries) {
      const nodeIndex = this.getNodeIndex(from, this.nodeEdgeStarts);
      if (nodeIndex >= 0) {
        const nextBoundary = this.edgeBoundaries.select(1, nodeIndex + 1);
        if (nextBoundary >= 0) {
          endPos = nextBoundary;
        }
      }
    }
    
    // Search for the specific target
    for (let i = startPos; i < endPos && i < this.flatEdges.length; i++) {
      const edge = this.flatEdges[i];
      if (edge.to === to) {
        return edge.value;
      }
    }
    
    throw new Error(`edge not found: ${from} -> ${to}`);
  }

  /**
   * Serialize the edges
   */
  public serialize(): { parent: any[]; children: any[] } {
    this.buildBoundaries();
    
    const parent: any[] = [];
    const children: any[] = [];
    
    // Build children from node edge starts
    for (const [nodeId, startPos] of this.nodeEdgeStarts.entries()) {
      const nodeChildren: Array<[NodeID, T]> = [];
      
      // Find end position
      let endPos = this.flatEdges.length;
      if (this.edgeBoundaries) {
        const nodeIndex = this.getNodeIndex(nodeId, this.nodeEdgeStarts);
        if (nodeIndex >= 0) {
          const nextBoundary = this.edgeBoundaries.select(1, nodeIndex + 1);
          if (nextBoundary >= 0) {
            endPos = nextBoundary;
          }
        }
      }
      
      for (let i = startPos; i < endPos && i < this.flatEdges.length; i++) {
        const edge = this.flatEdges[i];
        nodeChildren.push([edge.to, edge.value]);
      }
      
      if (nodeChildren.length > 0) {
        children.push([nodeId, nodeChildren]);
      }
    }
    
    // Build parents from reverse edge starts
    for (const [nodeId, startPos] of this.nodeRevEdgeStarts.entries()) {
      const nodeParents: Array<[NodeID, T]> = [];
      
      // Find end position
      let endPos = this.flatRevEdges.length;
      if (this.revEdgeBoundaries) {
        const nodeIndex = this.getNodeIndex(nodeId, this.nodeRevEdgeStarts);
        if (nodeIndex >= 0) {
          const nextBoundary = this.revEdgeBoundaries.select(1, nodeIndex + 1);
          if (nextBoundary >= 0) {
            endPos = nextBoundary;
          }
        }
      }
      
      for (let i = startPos; i < endPos && i < this.flatRevEdges.length; i++) {
        const edge = this.flatRevEdges[i];
        nodeParents.push([edge.to, edge.value]);
      }
      
      if (nodeParents.length > 0) {
        parent.push([nodeId, nodeParents]);
      }
    }
    
    return { parent, children };
  }
}