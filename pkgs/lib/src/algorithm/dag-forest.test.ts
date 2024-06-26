import { describe, it, expect } from "vitest";
import {
  DagForest,
  DagForestData,
  DagPriorityMap,
  FindPathCandidate,
  ForestFindWaypointsPathResult,
  VisitedForestPathMap,
  VisitedForestPathQueue,
} from "./dag-forest";
import { StringFinder } from "./graph-string";
import { NonEmptyArray } from "../common";
import { DagID, NodeID } from "./values";
import { Nodes, Path } from "./dag";

describe("DagForest", () => {
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

describe("DagForest.findWaypointPath", () => {
  it("should work", () => {
    const forest = new DagForest<string, number>();
    const { id: dag1 } = forest.dags.new();
    const abc = forest.nodes.add("abc1");
    const def = forest.nodes.add("def1");
    forest.dags.get(dag1).edges.add(abc, def, 0);

    const { id: dag2 } = forest.dags.new(1);
    forest.dags.get(dag2).edges.add(abc, def, 0);

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
  forest.dags.get(id).edges.add(abc, def, 0);
  forest.dags.get(id).edges.add(def, ghi, 0);
  forest.dags.get(id).edges.add(def, jkl, 0);

  it("match single node", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("a"))];
    const matchedPaths: Path[] = [];
    for (const path of paths) {
      for (const { dag } of forest.dags.iterate()) {
        matchedPaths.push(
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))],
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
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))],
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
          ...[...dag.findWaypointPath(NonEmptyArray.parse(path.path))],
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
  forest.dags.get(dag1).edges.add(abc, def, 0);
  forest.dags.get(dag1).edges.add(def, ghi, 1);
  forest.dags.get(dag1).edges.add(def, jkl, 0);
  const { id: dag2 } = forest.dags.new();
  forest.dags.get(dag2).edges.add(abc, def, 1);
  forest.dags.get(dag2).edges.add(def, ghi, 2);
  forest.dags.get(dag2).edges.add(def, jkl, 0);
  const { id: dag3 } = forest.dags.new(1);
  forest.dags.get(dag3).edges.add(abc, def, 1);
  forest.dags.get(dag3).edges.add(def, ghi, 2);
  forest.dags.get(dag3).edges.add(def, jkl, 0);

  it("findPathByString", () => {
    const result = forest.findPathByString(
      "abcdef",
      (s) => s,
      5,
      (s) => s.value,
    );
    expect(result).toEqual([
      { path: { path: [abc, def, jkl], cost: 0 }, dagId: dag1 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag3 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag2 },
      { path: { path: [abc, def, ghi], cost: 1 }, dagId: dag1 },
      { path: { path: [abc, def, ghi], cost: 3 }, dagId: dag3 },
    ] as ForestFindWaypointsPathResult[]);
  });

  it("no match", () => {
    const result = forest.findPathByString(
      "xxx",
      (s) => s,
      5,
      (s) => s.value,
    );
    expect(result).toEqual([] as ForestFindWaypointsPathResult[]);
  });
});

describe("findMinCostPerDag", () => {
  const forest = new DagForest<string, number>();
  const { id: dag1 } = forest.dags.new();
  const abc = forest.nodes.add("abc");
  const def = forest.nodes.add("def");
  const ghi = forest.nodes.add("ghi");
  const jkl = forest.nodes.add("jkl");
  forest.dags.get(dag1).edges.add(abc, def, 0);
  forest.dags.get(dag1).edges.add(def, ghi, 1);
  forest.dags.get(dag1).edges.add(def, jkl, 0);
  const { id: dag2 } = forest.dags.new();
  forest.dags.get(dag2).edges.add(abc, def, 1);
  forest.dags.get(dag2).edges.add(def, ghi, 2);
  forest.dags.get(dag2).edges.add(def, jkl, 0);
  const { id: dag3 } = forest.dags.new(1);
  forest.dags.get(dag3).edges.add(abc, def, 1);
  forest.dags.get(dag3).edges.add(def, ghi, 2);
  forest.dags.get(dag3).edges.add(def, jkl, 0);

  it("ok", () => {
    const results = forest.findMinCostPerDag(
      "abcdef",
      (s) => s,
      (s) => s.value,
      0,
    );
    expect([...results]).toEqual([
      { path: { path: [abc, def, jkl], cost: 0 }, dagId: dag1 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag3 },
      { path: { path: [abc, def, jkl], cost: 1 }, dagId: dag2 },
    ] as ForestFindWaypointsPathResult[]);
  });

  it("no match", () => {
    const result = forest.findMinCostPerDag(
      "xxx",
      (s) => s,
      (s) => s.value,
      0,
    );
    expect([...result]).toEqual([] as ForestFindWaypointsPathResult[]);
  });
});

describe("advanced: find string3", () => {
  const nodes = new Nodes<{ t: string }>((n) => n.t);
  const forest = new DagForest<{ t: string }, number>(nodes);
  const { id: dag1 } = forest.dags.new();
  const abc = forest.nodes.add({ t: "abc" });
  const def = forest.nodes.add({ t: "def" });
  const ghi = forest.nodes.add({ t: "ghi" });
  const jkl = forest.nodes.add({ t: "jkl" });
  forest.dags.get(dag1).edges.add(abc, def, 0);
  forest.dags.get(dag1).edges.add(def, ghi, 1);
  forest.dags.get(dag1).edges.add(def, jkl, 0);
  const { id: dag2 } = forest.dags.new();
  forest.dags.get(dag2).edges.add(abc, def, 1);
  forest.dags.get(dag2).edges.add(def, ghi, 2);
  forest.dags.get(dag2).edges.add(def, jkl, 0);
  const { id: dag3 } = forest.dags.new(1);
  forest.dags.get(dag3).edges.add(abc, def, 1);
  forest.dags.get(dag3).edges.add(def, ghi, 2);
  forest.dags.get(dag3).edges.add(def, jkl, 0);

  it("findPathByString", () => {
    const result = forest.findPathByString(
      "abcdef",
      (s) => {
        return s.t;
      },
      5,
      (s) => s.value,
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

describe("many patterns", () => {
  const nodes = new Nodes<{ t: string }>((n) => n.t);
  const forest = new DagForest<{ t: string }, number>(nodes);
  const { id: dag1 } = forest.dags.new();

  let lastNodes = [
    forest.nodes.add({ t: "node0-0" }),
    forest.nodes.add({ t: "node0-1" }),
    forest.nodes.add({ t: "node0-2" }),
    forest.nodes.add({ t: "node0-3" }),
  ];
  for (let i = 1; i < 20; i++) {
    const nodes = [
      forest.nodes.add({ t: `node${i}-0` }),
      forest.nodes.add({ t: `node${i}-1` }),
      forest.nodes.add({ t: `node${i}-2` }),
      forest.nodes.add({ t: `node${i}-3` }),
    ];
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        forest.dags.get(dag1).edges.add(lastNodes[j], nodes[k], 0);
      }
    }
    lastNodes = nodes;
  }

  it("findPathByString", () => {
    const gen = forest.findPathByString2(
      "node10-0node11-0",
      (s) => {
        return s.t;
      },
      (s) => s.value,
    );

    const toPathString = (result: FindPathCandidate) => {
      return result.path.path.map((p) => forest.nodes.get(p).t);
    };

    const results = [];
    for (let r = gen.next(undefined); !r.done; r = gen.next("next-dag")) {
      results.push(r.value);
    }
    expect(results.map((r) => toPathString(r))).toEqual([
      [
        "node0-0",
        "node1-3",
        "node2-3",
        "node3-3",
        "node4-3",
        "node5-3",
        "node6-3",
        "node7-3",
        "node8-3",
        "node9-3",
        "node10-0",
        "node11-0",
        "node12-0",
        "node13-3",
        "node14-3",
        "node15-3",
        "node16-3",
        "node17-3",
        "node18-3",
        "node19-0",
      ],
    ]);
  });
});

describe("partial nodes", () => {
  const nodes = new Nodes<{ t: string }>((n) => n.t);
  const forest = new DagForest<{ t: string }, number>(nodes);
  const { id: dag1 } = forest.dags.new();
  const abc = forest.nodes.add({ t: "abc" });
  const def = forest.nodes.add({ t: "def" });
  const ghi = forest.nodes.add({ t: "ghi" });
  forest.dags.get(dag1).edges.add(abc, def, 0);
  const { id: dag2 } = forest.dags.new();
  forest.dags.get(dag2).edges.add(def, ghi, 0);

  it("findPathByString1", () => {
    const result = forest.findPathByString(
      "abcdef",
      (s) => s.t,
      5,
      (s) => s.value,
    );
    expect(result).toEqual([
      { path: { path: [abc, def], cost: 0 }, dagId: dag1 },
    ] as ForestFindWaypointsPathResult[]);
  });
  it("findPathByString2", () => {
    const result = forest.findPathByString(
      "defghi",
      (s) => s.t,
      5,
      (s) => s.value,
    );
    expect(result).toEqual([
      { path: { path: [def, ghi], cost: 0 }, dagId: dag2 },
    ] as ForestFindWaypointsPathResult[]);
  });
});

describe("single node", () => {
  const nodes = new Nodes<string>((n) => n);
  const forest = new DagForest<string, number>(nodes);
  const { id: dag1 } = forest.dags.new();
  const abc = forest.dags.get(dag1).nodes.add("abc");

  it("findPathByString", () => {
    const result = forest.findPathByString(
      "abc",
      (s) => s,
      5,
      (s) => s.value,
    );
    expect(result).toEqual([
      { path: { path: [abc], cost: 0 }, dagId: dag1 },
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

describe("serialize", () => {
  it("is serializable", () => {
    const forest = new DagForest<string, number>();
    const { id } = forest.dags.new();
    const abc = forest.nodes.add("abc");
    const def = forest.nodes.add("def");
    const ghi = forest.nodes.add("ghi");
    const jkl = forest.nodes.add("jkl");
    forest.dags.get(id).edges.add(abc, def, 0);
    forest.dags.get(id).edges.add(def, ghi, 0);
    forest.dags.get(id).edges.add(def, jkl, 0);
    const { nodes, dags } = forest.serialize();
    expect(nodes).toEqual(["abc", "def", "ghi", "jkl"]);
    expect(dags).toEqual([
      {
        id: 0,
        priority: 0,
        edges: {
          children: [
            [0, [[1, 0]]],
            // prettier-ignore
            [1, [[2,0], [3,0],],],
          ],
          parent: [
            [1, [[0, 0]]],
            [2, [[1, 0]]],
            [3, [[1, 0]]],
          ],
        },
      },
    ]);
  });
});

describe("fromData", () => {
  it("is deserializable", () => {
    const [nodeId0, nodeId1, nodeId2, nodeId3] = [
      NodeID.new(0),
      NodeID.new(1),
      NodeID.new(2),
      NodeID.new(3),
    ];
    const data: DagForestData<string, number> = {
      nodes: ["abc", "def", "ghi", "jkl"],
      dags: [
        {
          id: DagID.new(0),
          priority: 0,
          edges: [
            // prettier-ignore
            [nodeId0, [[nodeId1, 0], [nodeId2, 0],],],
            [nodeId1, [[nodeId3, 0]]],
            [nodeId2, [[nodeId3, 0]]],
          ],
        },
      ],
    };
    const forest = DagForest.fromData(data);
    const { nodes, dags } = forest.serialize();
    expect(nodes).toEqual(["abc", "def", "ghi", "jkl"]);
    expect(dags).toEqual([
      {
        id: 0,
        priority: 0,
        edges: {
          children: [
            // prettier-ignore
            [0, [[1, 0], [2, 0],],],
            [1, [[3, 0]]],
            [2, [[3, 0]]],
          ],
          parent: [
            [1, [[0, 0]]],
            [2, [[0, 0]]],
            // prettier-ignore
            [3, [[1, 0], [2, 0]]],
          ],
        },
      },
    ]);
  });
});
