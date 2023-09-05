import { PriorityQueue } from "./priority-queue";
import { addToSetMap, TwoOrMoreArray, unreachable } from "../common";

// eslint-disable-next-line @typescript-eslint/ban-types
export interface NodeID extends Number {
  _nodeIDBrand: never;
}
const NodeID = Object.freeze({
  new: (n: number): NodeID => n as unknown as NodeID,
  toNumber: (id: NodeID): number => id as unknown as number,
});

// eslint-disable-next-line @typescript-eslint/ban-types
export interface DagID extends Number {
  _nodeIDBrand: never;
}
export const DagID = Object.freeze({
  new: (n: number): DagID => n as unknown as DagID,
  toNumber: (id: DagID): number => id as unknown as number,
});

export class Nodes<T> {
  constructor(private toHex: (n: T) => string = (n) => String(n)) {}

  public nodes: Map<NodeID, T> = new Map();
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
const Path = Object.freeze({
  clone(path: Path): Path {
    return { path: [...path.path], cost: path.cost };
  },
  // 連続して同じノードを通過するパスについて、最初のノードを残して削除する
  normalize(path: Path): Path {
    if (path.path.length === 0) {
      throw new Error("empty path provided to normalizePath");
    }
    if (path.path.length === 1) {
      return path;
    }

    const newPath: NodeID[] = [path.path[0]];
    for (let i = 1; i < path.path.length; i++) {
      const lastPath = newPath[newPath.length - 1];
      if (path.path[i] !== lastPath) {
        newPath.push(path.path[i]);
      }
    }
    return { path: newPath, cost: path.cost };
  },
});

export class DAG<Node, EdgeValue> {
  public edges: Edges<EdgeValue> = new Edges();
  constructor(public readonly nodes: Nodes<Node> = new Nodes()) {}

  public *findWaypointPath(
    waypoints: TwoOrMoreArray<NodeID>,
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions()
  ) {
    if (waypoints.length < 2) {
      throw new Error("waypoints.length must be >= 2");
    }
    const generators: ReturnType<typeof this.findPath>[] = [];
    for (let i = 1; i < waypoints.length; i++) {
      const [from, to] = [waypoints[i - 1], waypoints[i]];
      generators.push(this.findPath(from, to, options));
    }
    const f = function* (generators2: typeof generators): Generator<Path> {
      const generators3 = [...generators2];
      const g = generators3.shift();
      if (g && generators3.length === 0) {
        yield* g;
        return;
      }
      const parentPaths = [...g!];
      for (const childPath of f(generators3)) {
        for (const p of parentPaths) {
          yield {
            path: [...p.path, ...childPath.path],
            cost: p.cost + childPath.cost,
          };
        }
      }
    };
    for (const p of f(generators)) {
      yield Path.normalize(p);
    }
  }

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
    return new DAGForest(this.nodes, this.dags);
  }

  constructor(public nodes: Nodes<Node> = new Nodes()) {}

  public addNode(node: Node): NodeID {
    return this.nodes.add(node);
  }

  public addDAG(dag: DAG<Node, EdgeValue>): number {
    this.dags.push(dag);
    return this.dags.length - 1;
  }

  public newDAG(): { dag: DAG<Node, EdgeValue>; id: DagID } {
    const dag = new DAG<Node, EdgeValue>(this.nodes);
    this.addDAG(dag);
    return { dag, id: DagID.new(this.dags.length - 1) };
  }
}

export type FindPartialPathOp = "next" | "next-dag";
type FindPartialPathResult = {
  path: NodeID[];
  dagID: DagID;
};
export type FindPartialPathMatcher<Node, EdgeValue> = (
  nodeID: NodeID,
  dag: DAG<Node, EdgeValue>
) => Generator<NodeID[], void>;

export class DAGForest<Node, EdgeValue> {
  private nodeDagMap: Map<NodeID, Set<DagID>> = new Map();
  constructor(
    private _nodes: Nodes<Node>,
    private _dags: DAG<Node, EdgeValue>[]
  ) {}
  get nodes(): Nodes<Node> {
    return this._nodes;
  }

  public getDag(id: DagID): DAG<Node, EdgeValue> {
    return this._dags[DagID.toNumber(id)];
  }

  public getDagByNodeID(id: NodeID): Set<DagID> {
    return this.nodeDagMap.get(id) ?? new Set();
  }

  public addEdge(
    dagID: DagID,
    from: NodeID,
    to: NodeID,
    value: EdgeValue
  ): void {
    this.getDag(dagID).edges.add(from, to, value);
    addToSetMap(this.nodeDagMap, from, dagID);
  }

  /**
   * 全ノードから、条件にマッチする部分的なパスを返す
   */
  public *findPartialPath(
    matcher: FindPartialPathMatcher<Node, EdgeValue>
  ): Generator<FindPartialPathResult, void, FindPartialPathOp | undefined> {
    // FIXME: nodeの取り出し順をいい感じにすると枝刈りもいい感じになるはず
    // いずれ訪問済みのdagをskipするopが必要になるかも
    for (const [nodeID] of this.nodes.nodes.entries()) {
      const dagSet = this.getDagByNodeID(nodeID);
      for (const dagID of dagSet) {
        const dag = this.getDag(dagID);
        loop1: for (const path of matcher(nodeID, dag)) {
          const op = yield { path, dagID };
          switch (op) {
            case "next":
            case undefined:
              continue;
            case "next-dag":
              break loop1;
            default:
              unreachable(op);
          }
        }
      }
    }
  }
}
