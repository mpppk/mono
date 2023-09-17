import { describe, it, expect } from "vitest";
import {
  DagForest,
  DagPriorityMap,
  FindPartialPathOp,
  FindPathCandidate,
  ForestFindWaypointsPathResult,
  VisitedForestPathMap,
  VisitedForestPathQueue,
} from "./graph";
import { StringFinder } from "./graph-string";
import { NonEmptyArray } from "../common";
import { DagID, NodeID } from "./values";
import { DAG, FindPathOptions, Nodes, Path } from "./dag";

describe("Graph", () => {
  it("should work", () => {
    const forest = new DagForest<string, number>();
    const { dag, id } = forest.dags.new();
    const a = forest.nodes.add("a");
    const b = forest.nodes.add("b");
    const c = forest.nodes.add("c");
    dag.edges.add(a, b, 0);
    dag.edges.add(b, c, 0);
    expect(dag.edges.get(a)).toEqual({
      parent: [],
      children: [{ from: a, to: b, value: 0 }],
    });
    expect(dag.edges.get(b)).toEqual({
      parent: [{ from: a, to: b, value: 0 }],
      children: [{ from: b, to: c, value: 0 }],
    });
    expect(dag.edges.get(c)).toEqual({
      parent: [{ from: b, to: c, value: 0 }],
      children: [],
    });

    expect(forest.dags.get(id)).toEqual(dag);
    expect(forest.nodes.get(a)).toEqual("a");
  });
});

describe("DAG.findPath", () => {
  const dag = new DAG<string, number>(new Nodes());
  const a = dag.nodes.add("a");
  const b = dag.nodes.add("b");
  const c = dag.nodes.add("c");
  const d = dag.nodes.add("d");
  const e = dag.nodes.add("e");
  dag.edges.add(a, b, 1);
  dag.edges.add(b, c, 2);
  dag.edges.add(b, d, 1);
  dag.edges.add(c, e, 1);
  dag.edges.add(d, e, 1);
  it("simple", () => {
    const paths: Path[] = [];
    const opt: FindPathOptions<string, number> = {
      defaultCost: 1,
      costF: (edge) => edge.value,
    };
    for (const path of dag.findPath({ from: a, to: e, ...opt })) {
      paths.push(path);
    }
    expect(paths).toEqual([
      { path: [a, b, d, e], cost: 4 },
      { path: [a, b, c, e], cost: 5 },
    ]);
  });

  it("same node", () => {
    const opt: FindPathOptions<string, number> = {
      defaultCost: 1,
      costF: (edge) => edge.value,
    };
    expect([...dag.findPath({ from: a, to: a, ...opt })]).toEqual([
      { path: [a], cost: 1 }, // cost = defaultCost
    ]);
  });
});

describe("DAG.findPartialPath", () => {
  it("simple", () => {
    const forest = new DagForest<string, number>();
    const { dag: dag1, id: dagId1 } = forest.dags.new();
    const a1 = dag1.nodes.add("a1");
    const b1 = dag1.nodes.add("b1");
    const c1 = dag1.nodes.add("c1");
    const d1 = dag1.nodes.add("d1");
    const { dag: dag2, id: dagId2 } = forest.dags.new();
    const a2 = dag2.nodes.add("a2");
    const b2 = dag2.nodes.add("b2");
    const c2 = dag2.nodes.add("c2");
    const c3 = dag2.nodes.add("c3");
    forest.edges.add(dagId1, a1, b1, 0);
    forest.edges.add(dagId1, b1, c1, 0);
    forest.edges.add(dagId1, b1, d1, 0);
    forest.edges.add(dagId2, a2, b2, 0);
    forest.edges.add(dagId2, b2, c2, 0);
    forest.edges.add(dagId2, b2, c3, 0);
    // b* -> c*であるようなパスを各DAGから最大1つ探す
    function* matcher(nodeId: NodeID, dag: DAG<string, number>) {
      const node = dag.nodes.get(nodeId);
      if (!node.includes("b")) {
        return;
      }
      const { children } = dag.edges.get(nodeId);
      for (const child of children) {
        const childNode = dag.nodes.get(child.to);
        if (childNode.includes("c")) {
          yield [nodeId, child.to];
        }
      }
    }
    const generator = forest.findPartialPath(matcher);
    const op: FindPartialPathOp = "next-dag";
    const results = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = generator.next(op);
      if (done) {
        break;
      }
      results.push(value);
    }
    expect(results).toEqual([
      { path: [b1, c1], dagId: dagId1 },
      { path: [b2, c2], dagId: dagId2 },
      // 一つのDAGから一つ見つかったら以降は打ち切るので、b2 -> c3はなし
    ]);
  });
});

describe("DAG.findWaypointPath", () => {
  const dag = new DAG<string, number>(new Nodes());
  const a = dag.nodes.add("a");
  const b = dag.nodes.add("b");
  const c = dag.nodes.add("c");
  const d = dag.nodes.add("d");
  const e = dag.nodes.add("e");
  dag.edges.add(a, b, 0);
  dag.edges.add(b, c, 0);
  dag.edges.add(b, d, 0);
  dag.edges.add(c, e, 0);
  dag.edges.add(d, e, 0);

  it("a to e", () => {
    // を経由するルートだけを列挙する
    const paths = [...dag.findWaypointPath([a, e])];
    expect(paths).toEqual([
      {
        cost: 0,
        path: [a, b, c, e],
      },
      {
        cost: 0,
        path: [a, b, d, e],
      },
    ]);
  });

  it("via b", () => {
    // bを経由するルートだけを列挙する
    const paths = [...dag.findWaypointPath([a, b, e])];
    expect(paths).toEqual([
      {
        cost: 0,
        path: [a, b, c, e],
      },
      {
        cost: 0,
        path: [a, b, d, e],
      },
    ]);
  });

  it("via c", () => {
    // bを経由するルートだけを列挙する
    const paths = [...dag.findWaypointPath([a, c, e])];
    expect(paths).toEqual([
      {
        cost: 0,
        path: [a, b, c, e],
      },
    ]);
  });
});

describe("DAG.findWaypointPath2", () => {
  const dag = new DAG<string, number>(new Nodes());
  const a = dag.nodes.add("a");
  const b = dag.nodes.add("b");
  const c = dag.nodes.add("c");
  const d = dag.nodes.add("d");
  const e = dag.nodes.add("e");
  dag.edges.add(a, c, 0);
  dag.edges.add(b, c, 0);
  dag.edges.add(c, d, 0);
  dag.edges.add(c, e, 0);

  it("via c", () => {
    const paths = [...dag.findWaypointPath([c])];
    expect(paths).toEqual([
      {
        cost: 0,
        path: [a, c, d],
      },
      {
        cost: 0,
        path: [b, c, d],
      },
      {
        cost: 0,
        path: [a, c, e],
      },
      {
        cost: 0,
        path: [b, c, e],
      },
    ]);
  });
});

describe("DAG.findWaypointPath cost", () => {
  const dag = new DAG<string, number>(new Nodes());
  const a = dag.nodes.add("a");
  const b = dag.nodes.add("b");
  const c = dag.nodes.add("c");
  dag.edges.add(a, b, 1);
  dag.edges.add(a, c, 0);

  it("via a", () => {
    const paths = [...dag.findWaypointPath([a], { costF: (e) => e.value })];
    expect(paths).toEqual([
      {
        cost: 0,
        path: [a, c],
      },
      {
        cost: 1,
        path: [a, b],
      },
    ]);
  });
});

describe("DagForest.findWaypointPath", () => {
  it("should work", () => {
    const forest = new DagForest<string, number>();
    const { id: dag1 } = forest.dags.new();
    const abc = forest.nodes.add("abc1");
    const def = forest.nodes.add("def1");
    forest.edges.add(dag1, abc, def, 0);

    const { id: dag2 } = forest.dags.new(1);
    forest.edges.add(dag2, abc, def, 0);

    const paths = [...forest.findWaypointPath([abc])];
    expect(paths).toEqual([
      { dagId: dag2, path: { cost: 0, path: [abc, def] } },
      { dagId: dag1, path: { cost: 0, path: [abc, def] } },
    ]);
  });
});

describe("advanced: find string", () => {
  const forest = new DagForest<string, number>();
  const { id } = forest.dags.new();
  const abc = forest.nodes.add("abc");
  const def = forest.nodes.add("def");
  const ghi = forest.nodes.add("ghi");
  const jkl = forest.nodes.add("jkl");
  forest.edges.add(id, abc, def, 0);
  forest.edges.add(id, def, ghi, 0);
  forest.edges.add(id, def, jkl, 0);

  it("match single node", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("a"))];
    const matchedPaths: Path[] = [];
    for (const path of paths) {
      for (const { dag } of forest.dags.iterate()) {
        matchedPaths.push(
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))]
        );
      }
    }
    expect(matchedPaths).toEqual([
      { path: [abc, def, ghi], cost: 0 },
      { path: [abc, def, jkl], cost: 0 },
    ]);
  });

  it("match multi node", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("abcd"))];
    const matchedPaths: Path[] = [];
    for (const path of paths) {
      for (const { dag } of forest.dags.iterate()) {
        matchedPaths.push(
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))]
        );
      }
    }
    expect(matchedPaths).toEqual([
      { path: [abc, def, ghi], cost: 0 },
      { path: [abc, def, jkl], cost: 0 },
    ]);
  });

  it("match multi node2", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("fj"))];
    const matchedPaths: Path[] = [];
    for (const path of paths) {
      for (const { dag } of forest.dags.iterate()) {
        matchedPaths.push(
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))]
        );
      }
    }
    expect(matchedPaths).toEqual([{ path: [abc, def, jkl], cost: 0 }]);
  });
});

describe("advanced: find string2", () => {
  const forest = new DagForest<string, number>();
  const { id: dag1 } = forest.dags.new();
  const abc = forest.nodes.add("abc");
  const def = forest.nodes.add("def");
  const ghi = forest.nodes.add("ghi");
  const jkl = forest.nodes.add("jkl");
  forest.edges.add(dag1, abc, def, 0);
  forest.edges.add(dag1, def, ghi, 1);
  forest.edges.add(dag1, def, jkl, 0);
  const { id: dag2 } = forest.dags.new();
  forest.edges.add(dag2, abc, def, 1);
  forest.edges.add(dag2, def, ghi, 2);
  forest.edges.add(dag2, def, jkl, 0);
  const { id: dag3 } = forest.dags.new(1);
  forest.edges.add(dag3, abc, def, 1);
  forest.edges.add(dag3, def, ghi, 2);
  forest.edges.add(dag3, def, jkl, 0);

  it("findPathByString", () => {
    const result = forest.findPathByString(
      "abcdef",
      (s) => s,
      5,
      (s) => s.value
    );
    expect(result).toEqual([
      { path: { path: [abc, def, jkl], cost: 0 }, dagId: dag1 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag3 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag2 },
      { path: { path: [abc, def, ghi], cost: 1 }, dagId: dag1 },
      { path: { path: [abc, def, ghi], cost: 3 }, dagId: dag3 },
    ] as ForestFindWaypointsPathResult[]);
  });
});

describe("VisitedForestPathMap", () => {
  it("should works", () => {
    const visited = new VisitedForestPathMap();
    const dagId = DagID.new(0);
    const path = [1, 2] as unknown as NodeID[];
    visited.set(dagId, path);
    expect(visited.has(dagId, path)).toBe(true);
  });
});

describe("VisitedForestPathQueue", () => {
  it("should works", () => {
    const priorityMap = new DagPriorityMap();
    priorityMap.set(DagID.new(0), 0);
    priorityMap.set(DagID.new(1), 1);
    const visited = new VisitedForestPathQueue(priorityMap, 3);
    visited.push(DagID.new(0), {
      path: [1, 2] as unknown as NodeID[],
      cost: 0,
    });
    // duplicated path
    visited.push(DagID.new(0), {
      path: [1, 2] as unknown as NodeID[],
      cost: 0,
    });
    visited.push(DagID.new(0), {
      path: [1, 3] as unknown as NodeID[],
      cost: 1,
    });
    visited.push(DagID.new(1), {
      path: [1, 2] as unknown as NodeID[],
      cost: 0,
    });
    visited.push(DagID.new(1), {
      path: [1, 3] as unknown as NodeID[],
      cost: 1,
    });
    const result = visited.popAll();
    expect(result).toEqual([
      {
        dagId: DagID.new(1),
        path: { path: NodeID.fromArray([1, 2]), cost: 0 },
      },
      {
        dagId: DagID.new(0),
        path: { path: NodeID.fromArray([1, 2]), cost: 0 },
      },
      {
        dagId: DagID.new(1),
        path: { path: NodeID.fromArray([1, 3]), cost: 1 },
      },
      // {
      //   dagId: DagID.new(0),
      //   path: { path: NodeID.fromArray([1, 3]), cost: 1 },
      // },
    ] as FindPathCandidate[]);
  });
});
