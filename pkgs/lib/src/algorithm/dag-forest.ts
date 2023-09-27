import { newPriorityQueueDebugger, PriorityQueue } from "./priority-queue";
import {
  addToSetMap,
  debugPrefix,
  NonEmptyArray,
  unreachable,
} from "../common";
import createDebug from "debug";
import { StringFinder } from "./graph-string";
import { HeapCompareFunction } from "./heap";
import { DagID, NodeID } from "./values";
import {
  CostFunction,
  DAG,
  defaultFindPathOptions,
  FindPathOptions,
  Nodes,
  Path,
} from "./dag";

const debug = createDebug(debugPrefix.alg + ":dag");

export type FindPartialPathOp = "next" | "next-dag";
type FindPartialPathResult = {
  path: NodeID[];
  dagId: DagID;
};
export type FindPartialPathMatcher<Node, EdgeValue> = (
  nodeID: NodeID,
  dag: DAG<Node, EdgeValue>,
) => Generator<NodeID[], void>;

type PrioritizedDag = {
  dagId: DagID;
  priority: number;
};

const newDagPriorityQueue = () => {
  return PriorityQueue.newDesc<PrioritizedDag>((d) => d.priority);
};

export class DagPriorityMap {
  private readonly m: Map<DagID, number> = new Map();
  private readonly queue = newDagPriorityQueue();

  public set(id: DagID, priority: number) {
    if (this.m.has(id)) {
      throw new Error(`dag already exists: ${id}`);
    }
    this.m.set(id, priority);
    this.queue.push({ dagId: id, priority });
  }

  public get(id: DagID): number {
    const priority = this.m.get(id);
    if (priority === undefined) {
      throw new Error(`dag not found: ${id}`);
    }
    return priority;
  }

  public *iterate() {
    const q = this.queue.clone();
    while (q.size() > 0) {
      yield q.pop();
    }
  }
}

class ForestDags<Node, EdgeValue> {
  private nodeDagMap: Map<NodeID, Set<DagID>> = new Map();
  public priorityMap: DagPriorityMap = new DagPriorityMap();
  private _dags: DAG<Node, EdgeValue>[] = [];
  constructor(private nodes: Nodes<Node>) {}

  public get(id: DagID): DAG<Node, EdgeValue> {
    return this._dags[DagID.toNumber(id)];
  }

  public getPriority(id: DagID): number {
    const priority = this.priorityMap.get(id);
    if (priority === undefined) {
      throw new Error(`dag not found: ${id}`);
    }
    return priority;
  }

  /**
   * 指定したノードを含むDAGのIDのリストを優先度順に返す
   */
  public listByNodeID(id: NodeID): DagID[] {
    const s = this.nodeDagMap.get(id) ?? new Set();
    const q = newDagPriorityQueue();
    [...s].forEach((dagID) => {
      q.push({ dagId: dagID, priority: this.priorityMap.get(dagID)! });
    });
    return q.popAll().map((d) => d.dagId);
  }

  public add(dag: DAG<Node, EdgeValue>, priority = 0): DagID {
    this._dags.push(dag);
    const dagId = DagID.new(this._dags.length - 1);
    this.priorityMap.set(dagId, priority);
    return dagId;
  }

  public new(priority = 0): { dag: DAG<Node, EdgeValue>; id: DagID } {
    const dag = new DAG<Node, EdgeValue>(this.nodes);
    return { dag, id: this.add(dag, priority) };
  }

  public *iterate() {
    for (const { dagId } of this.priorityMap.iterate()) {
      yield { dag: this.get(dagId), id: dagId };
    }
  }

  public size(): number {
    return this._dags.length;
  }

  public addEdge(
    dagID: DagID,
    from: NodeID,
    to: NodeID,
    value: EdgeValue,
  ): void {
    this.get(dagID).edges.add(from, to, value);
    addToSetMap(this.nodeDagMap, from, dagID);
  }

  public sortByPriority(nodes: NodeID[]): NodeID[] {
    const queue = newDagPriorityQueue();
    nodes
      .map(
        (id) =>
          ({
            dagId: id,
            priority: this.getPriority(id),
          }) as PrioritizedDag,
      )
      .forEach((d) => queue.push(d));
    return queue.popAll().map((d) => d.dagId);
  }
}

export type ForestFindWaypointsPathResult = {
  path: Path;
  dagId: DagID;
  priority: number;
};

class DagForestEdges<Node, EdgeValue> {
  constructor(private dags: ForestDags<Node, EdgeValue>) {}
  public add(dagID: DagID, from: NodeID, to: NodeID, value: EdgeValue): void {
    this.dags.addEdge(dagID, from, to, value);
  }
}

export type FindPathCandidate = {
  path: Path;
  dagId: DagID;
};

class VisitedPathMap {
  private readonly m = new Map<string, NodeID[]>();
  public get(path: NodeID[]): NodeID[] | undefined {
    const key = path.join(",");
    return this.m.get(key);
  }
  public set(path: NodeID[]): void {
    const key = path.join(",");
    this.m.set(key, path);
  }
}

export class VisitedForestPathMap {
  private readonly m = new Map<DagID, VisitedPathMap>();
  public get(dagId: DagID): VisitedPathMap {
    if (!this.m.has(dagId)) {
      this.m.set(dagId, new VisitedPathMap());
    }
    return this.m.get(dagId)!;
  }

  public set(dagId: DagID, path: NodeID[]): void {
    this.get(dagId).set(path);
  }

  public has(dagId: DagID, path: NodeID[]): boolean {
    return this.get(dagId).get(path) !== undefined;
  }
}

export class VisitedForestPathQueue {
  private readonly m = new VisitedForestPathMap();
  private readonly queue: PriorityQueue<FindPathCandidate>;

  constructor(
    priorityMap: DagPriorityMap,
    private maxSize: number,
  ) {
    const sorter: HeapCompareFunction<FindPathCandidate> = (a, b) => {
      // costが大きい方が優先度が高い(=costが小さいものほどqueueに残りやすくなる)
      if (a.path.cost !== b.path.cost) {
        return b.path.cost - a.path.cost;
      }
      // costが同じであれば、priorityが低い方が優先度が高い(=priorityが高いものほどqueueに残りやすくなる)

      const aPriority = priorityMap.get(a.dagId);
      const bPriority = priorityMap.get(b.dagId);
      return aPriority - bPriority;
    };
    this.queue = new PriorityQueue<FindPathCandidate>(
      sorter,
      newPriorityQueueDebugger(debug, "pathQueue:"),
    );
  }

  public push(dagId: DagID, path: Path): void {
    if (this.m.has(dagId, path.path)) {
      return;
    }
    this.queue.push({ dagId, path });
    this.m.set(dagId, path.path);
    if (this.queue.size() > this.maxSize) {
      this.queue.pop();
    }
  }

  public popAll(): FindPathCandidate[] {
    return this.queue.popAll().reverse();
  }
}

export class DagForest<Node, EdgeValue> {
  private readonly _edges: DagForestEdges<Node, EdgeValue>;
  constructor(
    private _nodes: Nodes<Node> = new Nodes(),
    private _dags = new ForestDags<Node, EdgeValue>(_nodes),
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

  public serialize() {
    return {
      nodes: [...this.nodes.nodes.entries()],
      dags: [...this.dags.iterate()].map(({ dag }) => dag.serialize()),
    };
  }

  /**
   * 全ノードから、条件にマッチする部分的なパスを返す
   */
  public *findPartialPath(
    matcher: FindPartialPathMatcher<Node, EdgeValue>,
  ): Generator<FindPartialPathResult, void, FindPartialPathOp | undefined> {
    // FIXME: nodeの取り出し順をいい感じにすると枝刈りもいい感じになるはず
    // いずれ訪問済みのdagをskipするopが必要になるかも
    for (const [nodeID] of this.nodes.nodes.entries()) {
      const dagSet = this.dags.listByNodeID(nodeID);
      for (const dagID of dagSet) {
        const dag = this.dags.get(dagID);
        loop1: for (const path of matcher(nodeID, dag)) {
          const op = yield { path, dagId: dagID };
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

  public *findWaypointPath(
    waypoints: NonEmptyArray<NodeID>,
    options: FindPathOptions<Node, EdgeValue> = defaultFindPathOptions(),
  ) {
    for (const { dag, id } of this.dags.iterate()) {
      for (const path of dag.findWaypointPath(waypoints, options)) {
        yield { path, dagId: id } as ForestFindWaypointsPathResult;
      }
    }
  }

  public findPathByString(
    query: string,
    mapper: (n: Node) => string,
    resultNum = 5,
    costF: CostFunction<Node, EdgeValue>,
    // maxPriority: number
  ) {
    const finder = new StringFinder<Node, EdgeValue>(mapper);
    // queueに残したい候補のpriorityを下げる

    const visitedQueue = new VisitedForestPathQueue(this.dags.priorityMap, 5);
    debug("findPathByString", { query, resultNum });
    for (const partialPath of this.findPartialPath(finder.toMatcher(query))) {
      const dag = this.dags.get(partialPath.dagId);
      for (const path of dag.findWaypointPath(
        NonEmptyArray.parse(partialPath.path),
        { costF },
      )) {
        visitedQueue.push(partialPath.dagId, path);
      }
    }
    return visitedQueue.popAll();
  }
}
