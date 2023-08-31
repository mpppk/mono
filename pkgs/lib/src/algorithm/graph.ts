import { PriorityQueue } from "./priority-queue";

export interface NodeID extends Number {
  _nodeIDBrand: never;
}

export class Nodes<T> {
  constructor(private toHex: (n: T) => string = (n) => String(n)) {}

  private nodes: Map<NodeID, T> = new Map();
  private hexToIDMap: Map<string, NodeID> = new Map();

  private nextID = 0;
  private newID(): NodeID {
    return this.nextID++ as unknown as NodeID;
  }

  public add(node: T): NodeID {
    const hex = this.toHex(node);
    if (this.hexToIDMap.has(hex)) {
      return this.hexToIDMap.get(hex)!;
    }
    const id = this.newID();
    this.nodes.set(id, node);
    return id;
  }

  public get(id: NodeID): T {
    return this.nodes.get(id)!;
  }
}

type Edge<T> = {
  from: NodeID;
  to: NodeID;
  value: T;
};
class Edges<T> {
  private edges: Map<NodeID, Edge<T>[]> = new Map();
  private revEdges: Map<NodeID, Edge<T>[]> = new Map();
  constructor() {}
  public add(from: NodeID, to: NodeID, value: T): void {
    const edges = this.edges.get(from) ?? [];
    edges.push({ from, to, value });
    this.edges.set(from, edges);
    const revEdges = this.revEdges.get(to) ?? [];
    revEdges.push({ from, to, value });
    this.revEdges.set(to, revEdges);
  }

  public get(from: NodeID): { parent: Edge<T>[]; children: Edge<T>[] } {
    const parent = this.revEdges.get(from) ?? [];
    const children = this.edges.get(from) ?? [];
    return { parent, children };
  }
}

type CostFunction<Node, EdgeValue> = (
  edge: Edge<EdgeValue>,
  context: DAG<Node, EdgeValue>
) => number;
export type FindPathOptions<Node, EdgeValue> = Readonly<{
  costF: CostFunction<Node, EdgeValue>;
  defaultCost: number;
}>;

const defaultFindPathOptions = <Node, EdgeValue>(): FindPathOptions<
  Node,
  EdgeValue
> => ({
  defaultCost: 0,
  costF: () => 0,
});
export type Path = Readonly<{
  path: NodeID[];
  cost: number;
}>;

export class DAG<Node, EdgeValue> {
  public edges: Edges<EdgeValue> = new Edges();
  constructor(public readonly nodes: Nodes<Node>) {}

  public *findPath(
    from: NodeID,
    to: NodeID,
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions()
  ) {
    const queue = new PriorityQueue<Path>((p) => p.cost);
    queue.push({ path: [from], cost: options.defaultCost });
    while (queue.size() > 0) {
      const path = queue.pop();
      if (path === null) {
        break;
      }
      const lastNode = path.path[path.path.length - 1];
      if (lastNode === to) {
        yield path;
        continue;
      }
      const { children } = this.edges.get(lastNode);
      for (const child of children) {
        const cost = options.costF(child, this);
        queue.push({ path: [...path.path, child.to], cost: path.cost + cost });
      }
    }
  }
}

export class DAGForestBuilder<Node, EdgeValue> {
  public dags: DAG<Node, EdgeValue>[] = [];
  public build(): DAGForest<Node, EdgeValue> {
    return new DAGForest(this);
  }

  constructor(public nodes: Nodes<Node> = new Nodes()) {}

  public addNode(node: Node): NodeID {
    return this.nodes.add(node);
  }

  public addDAG(dag: DAG<Node, EdgeValue>): number {
    this.dags.push(dag);
    return this.dags.length - 1;
  }

  public newDAG(): { dag: DAG<Node, EdgeValue>; index: number } {
    const dag = new DAG<Node, EdgeValue>(this.nodes);
    this.addDAG(dag);
    return { dag, index: this.dags.length - 1 };
  }
}

export class DAGForest<Node, EdgeValue> {
  constructor(private forest: DAGForestBuilder<Node, EdgeValue>) {}
  get nodes(): Nodes<Node> {
    return this.forest.nodes;
  }

  public getDAG(id: number): DAG<Node, EdgeValue> {
    return this.forest.dags[id];
  }
}
