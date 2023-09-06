import { PriorityQueue } from "./priority-queue";
import { addToSetMap, NonEmptyArray, unreachable } from "../common";

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
  from?: NodeID;
  to?: NodeID;
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

  get roots(): NodeID[] {
    return [...this.nodes.nodes.keys()].filter((nodeID) => {
      const { parent } = this.edges.get(nodeID);
      return parent.length === 0;
    });
  }

  get leafs(): NodeID[] {
    return [...this.nodes.nodes.keys()].filter((nodeID) => {
      const { children } = this.edges.get(nodeID);
      return children.length === 0;
    });
  }

  public *findWaypointPath(
    waypoints: NonEmptyArray<NodeID>,
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions()
  ) {
    if (waypoints.length < 1) {
      throw new Error("waypoints.length must be >= 1");
    }
    const generators: ReturnType<typeof this.findPath>[] = [];
    const { from, to } = options;
    generators.push(this.findPath({ from, to: waypoints[0], ...options }));
    for (let i = 1; i < waypoints.length; i++) {
      const [from, to] = [waypoints[i - 1], waypoints[i]];
      generators.push(this.findPath({ from, to, ...options }));
    }
    const lastWaypoint = waypoints[waypoints.length - 1];
    generators.push(this.findPath({ from: lastWaypoint, to, ...options }));
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
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions()
  ) {
    const queue = new PriorityQueue<Path>((p) => p.cost);
    const from = options.from === undefined ? this.roots : [options.from];
    const to = options.to === undefined ? this.leafs : [options.to];
    for (const f of from) {
      queue.push({ path: [f], cost: options.defaultCost });
    }
    while (queue.size() > 0) {
      const path = queue.pop();
      const lastNode = path.path[path.path.length - 1];
      if (to.includes(lastNode)) {
        // これでいいんだっけ?
        // toになるのはユーザが指定した一つだけか、leafなので多分大丈夫
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

export type FindPartialPathOp = "next" | "next-dag";
type FindPartialPathResult = {
  path: NodeID[];
  dagID: DagID;
};
export type FindPartialPathMatcher<Node, EdgeValue> = (
  nodeID: NodeID,
  dag: DAG<Node, EdgeValue>
) => Generator<NodeID[], void>;

class ForestDags<Node, EdgeValue> {
  private nodeDagMap: Map<NodeID, Set<DagID>> = new Map();
  private _dags: DAG<Node, EdgeValue>[] = [];
  constructor(private nodes: Nodes<Node>) {}

  public get(id: DagID): DAG<Node, EdgeValue> {
    return this._dags[DagID.toNumber(id)];
  }

  public getByNodeID(id: NodeID): Set<DagID> {
    return this.nodeDagMap.get(id) ?? new Set();
  }

  public add(dag: DAG<Node, EdgeValue>): DagID {
    this._dags.push(dag);
    return DagID.new(this._dags.length - 1);
  }

  public new(): { dag: DAG<Node, EdgeValue>; id: DagID } {
    const dag = new DAG<Node, EdgeValue>(this.nodes);
    return { dag, id: this.add(dag) };
  }

  public list(): DAG<Node, EdgeValue>[] {
    return this._dags;
  }

  public size(): number {
    return this._dags.length;
  }

  public addEdge(
    dagID: DagID,
    from: NodeID,
    to: NodeID,
    value: EdgeValue
  ): void {
    this.get(dagID).edges.add(from, to, value);
    addToSetMap(this.nodeDagMap, from, dagID);
  }
}

class DagForestEdges<Node, EdgeValue> {
  constructor(private dags: ForestDags<Node, EdgeValue>) {}
  public add(dagID: DagID, from: NodeID, to: NodeID, value: EdgeValue): void {
    this.dags.addEdge(dagID, from, to, value);
  }
}

export class DagForest<Node, EdgeValue> {
  private readonly _edges: DagForestEdges<Node, EdgeValue>;
  constructor(
    private _nodes: Nodes<Node> = new Nodes(),
    private _dags = new ForestDags<Node, EdgeValue>(_nodes) // private _dags: DAG<Node, EdgeValue>[] = []
  ) {
    this._edges = new DagForestEdges(this._dags);
  }
  get nodes(): Nodes<Node> {
    return this._nodes;
  }

  get dags(): ForestDags<Node, EdgeValue> {
    return this._dags;
  }

  get edges() {
    return this._edges;
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
      const dagSet = this.dags.getByNodeID(nodeID);
      for (const dagID of dagSet) {
        const dag = this.dags.get(dagID);
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
