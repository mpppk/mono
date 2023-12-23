import { NodeID } from "./values";
import { debugPrefix, NonEmptyArray } from "../common";
import { newPriorityQueueDebugger, PriorityQueue } from "./priority-queue";
import createDebug from "debug";

const debug = createDebug(debugPrefix.alg + ":dag");

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
    const node = this.nodes.get(id);
    if (node === undefined) {
      throw new Error(`node not found: ${id}`);
    }
    return node;
  }

  public safeGet(id: NodeID): T | undefined {
    return this.nodes.get(id);
  }

  public toArray(): (T | undefined)[] {
    const nodes: (T | undefined)[] = [];
    let foundCnt = 0;
    while (foundCnt < this.nodes.size) {
      const node = this.safeGet(NodeID.new(foundCnt));
      nodes.push(node);
      if (node !== undefined) {
        foundCnt++;
      }
    }
    return nodes;
  }
}

type Edge<T> = {
  from: NodeID;
  to: NodeID;
  value: T;
};
class Edges<T> {
  public edges: Map<NodeID, Edge<T>[]> = new Map();
  public revEdges: Map<NodeID, Edge<T>[]> = new Map();
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

  public getValue(from: NodeID, to: NodeID): T {
    const edges = this.edges.get(from) ?? [];
    const edge = edges.find((e) => e.to === to);
    if (!edge) {
      throw new Error(`edge not found: ${from} -> ${to}`);
    }
    return edge.value;
  }

  public serialize() {
    const parent = [...this.revEdges.entries()].map(([to, edges]) => {
      return [to, edges.map((e) => [e.from, e.value])];
    });
    const children = [...this.edges.entries()].map(([from, edges]) => {
      return [from, edges.map((e) => [e.to, e.value])];
    });
    return { parent, children };
  }
}

export type CostFunction<Node, EdgeValue> = (
  edge: Edge<EdgeValue>,
  context: DAG<Node, EdgeValue>,
) => number;
export type FindPathOptions<Node, EdgeValue> = Readonly<{
  from?: NodeID;
  to?: NodeID;
  costF: CostFunction<Node, EdgeValue>;
  defaultCost?: number;
}>;

export const defaultFindPathOptions = <Node, EdgeValue>(): FindPathOptions<
  Node,
  EdgeValue
> => ({
  costF: () => 0,
});
export type Path = Readonly<{
  path: NodeID[];
  cost: number;
}>;
export const Path = Object.freeze({
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

  public serializeEdges() {
    return this.edges.serialize();
  }

  public *findWaypointPath(
    waypoints: NonEmptyArray<NodeID>,
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions(),
  ) {
    if (waypoints.length < 1) {
      throw new Error("waypoints.length must be >= 1");
    }
    const generators: ReturnType<typeof this.findPath>[] = [];
    const { from, to } = options;
    debug("first:findPath", { from, to: waypoints[0] });
    generators.push(this.findPath({ ...options, from, to: waypoints[0] }));
    for (let i = 1; i < waypoints.length; i++) {
      const [from, to] = [waypoints[i - 1], waypoints[i]];
      debug("second:findPath", { from, to: waypoints[0] });
      generators.push(this.findPath({ ...options, from, to }));
    }
    const lastWaypoint = waypoints[waypoints.length - 1];
    debug("last:findPath", { from: lastWaypoint, to });
    generators.push(this.findPath({ ...options, from: lastWaypoint, to }));
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
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions(),
  ) {
    debug(`findPath:start from(${options.from}) to(${options.to})`);
    const queue = PriorityQueue.newAsc<Path>(
      (p) => p.cost,
      newPriorityQueueDebugger(debug),
    );
    const from = options.from === undefined ? this.roots : [options.from];
    const to = options.to === undefined ? this.leafs : [options.to];
    for (const f of from) {
      debug(
        "path:queued",
        { path: [f], cost: options.defaultCost ?? 0 },
        `${queue.size()} -> ${queue.size() + 1}`,
      );
      queue.push({ path: [f], cost: options.defaultCost ?? 0 });
    }
    while (queue.size() > 0) {
      const path = queue.pop();
      debug("path:popped", path, `${queue.size() + 1} -> ${queue.size()}`);
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
        debug(
          "path:queued",
          {
            path: [...path.path, child.to],
            cost: path.cost + cost,
          },
          `${queue.size()} -> ${queue.size() + 1}`,
        );
        queue.push({ path: [...path.path, child.to], cost: path.cost + cost });
      }
    }
  }
}
