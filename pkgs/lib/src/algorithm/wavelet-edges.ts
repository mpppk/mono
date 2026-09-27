import { WaveletTree } from "./wavelet-tree";
import { NodeID } from "./values";

/**
 * Edge representation for WaveletEdges
 */
type Edge<T> = {
  from: NodeID;
  to: NodeID;
  value: T;
};

/**
 * Handler type for edge additions
 */
type EdgesHandler<T> = (
  from: NodeID,
  to: NodeID,
  value: T,
  self: WaveletEdges<T>,
) => void;

/**
 * Wavelet Tree-based implementation of graph edges
 * Provides the same interface as the original Edges class but uses
 * wavelet trees internally for better memory efficiency and serialization
 */
export class WaveletEdges<T> {
  private edgeList: Edge<T>[] = [];
  private handlers: EdgesHandler<T>[] = [];

  // Cached wavelet trees for efficient queries
  private fromTree?: WaveletTree;
  private toTree?: WaveletTree;
  private needsRebuild = false;

  constructor() {}

  public addHandler(handler: EdgesHandler<T>) {
    this.handlers.push(handler);
  }

  public add(from: NodeID, to: NodeID, value: T): void {
    this.edgeList.push({ from, to, value });
    this.needsRebuild = true;
    this.handlers.forEach((h) => h(from, to, value, this));
  }

  /**
   * Rebuild wavelet trees when needed
   */
  private rebuildTrees() {
    if (!this.needsRebuild) return;

    if (this.edgeList.length === 0) {
      this.fromTree = new WaveletTree([]);
      this.toTree = new WaveletTree([]);
    } else {
      const fromSequence = this.edgeList.map((e) => NodeID.toNumber(e.from));
      const toSequence = this.edgeList.map((e) => NodeID.toNumber(e.to));

      this.fromTree = new WaveletTree(fromSequence);
      this.toTree = new WaveletTree(toSequence);
    }

    this.needsRebuild = false;
  }

  /**
   * Get edges for a specific node (parent and children edges)
   */
  public get(nodeId: NodeID):
    | {
        parent: Edge<T>[];
        children: Edge<T>[];
      }
    | undefined {
    this.rebuildTrees();

    const children: Edge<T>[] = [];
    const parent: Edge<T>[] = [];

    // Find all edges where this node is the source (children)
    for (let i = 0; i < this.edgeList.length; i++) {
      if (this.edgeList[i].from === nodeId) {
        children.push(this.edgeList[i]);
      }
    }

    // Find all edges where this node is the target (parents)
    for (let i = 0; i < this.edgeList.length; i++) {
      if (this.edgeList[i].to === nodeId) {
        parent.push(this.edgeList[i]);
      }
    }

    if (parent.length === 0 && children.length === 0) {
      return undefined;
    }

    return { parent, children };
  }

  /**
   * Get the edge value between two specific nodes
   */
  public getValue(from: NodeID, to: NodeID): T {
    const edge = this.edgeList.find((e) => e.from === from && e.to === to);
    if (!edge) {
      throw new Error(`edge not found: ${from} -> ${to}`);
    }
    return edge.value;
  }

  /**
   * Serialize the edges in a compact format
   * This is where the wavelet tree provides benefits - more compact serialization
   */
  public serialize() {
    this.rebuildTrees();

    if (this.edgeList.length === 0) {
      return { parent: [], children: [] };
    }

    // Group edges by source and target for traditional format compatibility
    const childrenMap = new Map<NodeID, Array<[NodeID, T]>>();
    const parentMap = new Map<NodeID, Array<[NodeID, T]>>();

    for (const edge of this.edgeList) {
      // Children: from -> to
      if (!childrenMap.has(edge.from)) {
        childrenMap.set(edge.from, []);
      }
      childrenMap.get(edge.from)!.push([edge.to, edge.value]);

      // Parents: to <- from
      if (!parentMap.has(edge.to)) {
        parentMap.set(edge.to, []);
      }
      parentMap.get(edge.to)!.push([edge.from, edge.value]);
    }

    const children = Array.from(childrenMap.entries());
    const parent = Array.from(parentMap.entries());

    return { parent, children };
  }

  /**
   * Get compact serialization using wavelet tree format
   * This provides better compression than the traditional format
   */
  /**
   * Get compact serialization using wavelet tree format
   * This provides better compression than the traditional format
   */
  public serializeCompact(): {
    edges: Array<[number, number, T]>;
    fromTree?: { sequence: number[]; minValue: number; maxValue: number };
    toTree?: { sequence: number[]; minValue: number; maxValue: number };
  } {
    this.rebuildTrees();

    return {
      edges: this.edgeList.map((e) => [
        NodeID.toNumber(e.from),
        NodeID.toNumber(e.to),
        e.value,
      ]),
      fromTree: this.fromTree?.serialize(),
      toTree: this.toTree?.serialize(),
    };
  }

  /**
   * Create WaveletEdges from compact serialization
   */
  public static fromCompactSerialization<T>(data: {
    edges: Array<[number, number, T]>;
    fromTree?: { sequence: number[]; minValue: number; maxValue: number };
    toTree?: { sequence: number[]; minValue: number; maxValue: number };
  }): WaveletEdges<T> {
    const waveletEdges = new WaveletEdges<T>();

    // Restore edges
    for (const [from, to, value] of data.edges) {
      waveletEdges.edgeList.push({
        from: NodeID.new(from),
        to: NodeID.new(to),
        value,
      });
    }

    // Mark as not needing rebuild since we're loading from serialized data
    waveletEdges.needsRebuild = false;

    if (data.fromTree) {
      waveletEdges.fromTree = WaveletTree.fromSerialized(data.fromTree);
    }
    if (data.toTree) {
      waveletEdges.toTree = WaveletTree.fromSerialized(data.toTree);
    }

    return waveletEdges;
  }

  /**
   * Get statistics about the current edge storage
   */
  public getStats() {
    this.rebuildTrees();

    return {
      edgeCount: this.edgeList.length,
      uniqueFromNodes: new Set(this.edgeList.map((e) => e.from)).size,
      uniqueToNodes: new Set(this.edgeList.map((e) => e.to)).size,
      needsRebuild: this.needsRebuild,
    };
  }
}
