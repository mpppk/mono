import { describe, expect, it } from "vitest";
import { DAG, FindPathOptions, Nodes, Path } from "./dag";
import { DagForest, FindPartialPathOp } from "./dag-forest";
import { NodeID } from "./values";

describe("Nodes.getFromHex", () => {
  it("string", () => {
    const nodes = new Nodes<string>();
    nodes.add("a");
    expect(nodes.getByHex("a")).toEqual("a");
  });

  it("number", () => {
    const nodes = new Nodes<number>();
    nodes.add(1);
    expect(nodes.getByHex("1")).toEqual(1);
  });

  it("object", () => {
    const nodes = new Nodes<{ a: number }>((n) => n.a.toString());
    nodes.add({ a: 1 });
    expect(nodes.getByHex("1")).toEqual({ a: 1 });
  });
});

describe("Nodes.getId", () => {
  it("string", () => {
    const nodes = new Nodes<string>();
    const nodeId = nodes.add("a");
    expect(nodes.getId("a")).toEqual(nodeId);
  });

  it("number", () => {
    const nodes = new Nodes<number>();
    const nodeId = nodes.add(1);
    expect(nodes.getId(1)).toEqual(nodeId);
  });

  it("object", () => {
    const nodes = new Nodes<{ a: number }>((n) => n.a.toString());
    const nodeId = nodes.add({ a: 1 });
    expect(nodes.getId({ a: 1 })).toEqual(nodeId);
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
    forest.dags.get(dagId1).edges.add(a1, b1, 0);
    forest.dags.get(dagId1).edges.add(b1, c1, 0);
    forest.dags.get(dagId1).edges.add(b1, d1, 0);
    forest.dags.get(dagId2).edges.add(a2, b2, 0);
    forest.dags.get(dagId2).edges.add(b2, c2, 0);
    forest.dags.get(dagId2).edges.add(b2, c3, 0);
    // b* -> c*であるようなパスを各DAGから最大1つ探す
    function* matcher(nodeId: NodeID, dag: DAG<string, number>) {
      const node = dag.nodes.get(nodeId);
      if (!node.includes("b")) {
        return;
      }
      const edge = dag.edges.get(nodeId);
      if (edge === undefined) {
        throw new Error("children not found");
      }
      for (const child of edge.children) {
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

describe("roots", () => {
  it("should return empty array if does not have any node", () => {
    const nodes = new Nodes<string>();
    nodes.add("a");
    const dag1 = new DAG<string, number>(nodes);
    // dag1は一つもedgeを持たないため、rootもない
    expect(dag1.roots.length).toBe(0);
  });

  it("should return one root node", () => {
    const nodes = new Nodes<string>();
    nodes.add("a");
    const dag1 = new DAG<string, number>(nodes);
    const b = dag1.nodes.add("b");
    const c = dag1.nodes.add("c");
    dag1.edges.add(b, c, 0);
    // dag1は一つもedgeを持たないため、rootもない
    expect(dag1.roots).toEqual([b]);
  });
});

describe("leafs", () => {
  it("should return empty array if does not have any node", () => {
    const nodes = new Nodes<string>();
    nodes.add("a");
    const dag1 = new DAG<string, number>(nodes);
    // dag1は一つもedgeを持たないため、rootもない
    expect(dag1.leafs.length).toBe(0);
  });

  it("should return one leaf node", () => {
    const nodes = new Nodes<string>();
    nodes.add("a");
    const dag1 = new DAG<string, number>(nodes);
    const b = dag1.nodes.add("b");
    const c = dag1.nodes.add("c");
    dag1.edges.add(b, c, 0);
    // dag1は一つもedgeを持たないため、rootもない
    expect(dag1.leafs).toEqual([c]);
  });
});

describe("dfs", () => {
  it("return all path", () => {
    const dag1 = new DAG<string, number>();
    const a = dag1.nodes.add("a");
    const b = dag1.nodes.add("b");
    const c = dag1.nodes.add("c");
    const d = dag1.nodes.add("d");
    dag1.edges.add(a, b, 0);
    dag1.edges.add(b, c, 0);
    dag1.edges.add(b, d, 0);
    expect([...dag1.dfs()]).toEqual([[0], [0, 1], [0, 1, 2], [0, 1, 3]]);
  });
  it("skip", () => {
    const dag1 = new DAG<string, number>();
    const a = dag1.nodes.add("a");
    const b = dag1.nodes.add("b");
    const c = dag1.nodes.add("c");
    const c2 = dag1.nodes.add("c2");
    const d = dag1.nodes.add("d");
    dag1.edges.add(a, b, 0);
    dag1.edges.add(b, c, 0);
    dag1.edges.add(c, c2, 0);
    dag1.edges.add(b, d, 0);

    const g = dag1.dfs();
    let op: undefined | "skip" = undefined;
    const paths = [];
    for (let v = g.next(); !v.done; v = g.next(op)) {
      const path = v.value;
      paths.push(path);
      const last = path[path.length - 1];
      if (last === c) {
        op = "skip";
      }
    }
    expect(paths).toEqual([[a], [a, b], [a, b, c], [a, b, d]]);
  });
  it("single node", () => {
    const dag1 = new DAG<string, number>();
    dag1.nodes.add("a");
    expect([...dag1.dfs()]).toEqual([[0]]);
  });
});

describe("detectCycle", () => {
  it("should return empty array if does not have cycle", () => {
    const dag = new DAG<string, number>();
    const a = dag.nodes.add("a");
    const b = dag.nodes.add("b");
    dag.edges.add(a, b, 0);
    expect(dag.detectCycle()).toBeNull();
  });

  it("should return path array if have cycle", () => {
    const dag = new DAG<string, number>();
    const a = dag.nodes.add("a");
    const b = dag.nodes.add("b");
    const c = dag.nodes.add("c");
    dag.edges.add(a, b, 0);
    dag.edges.add(b, c, 0);
    dag.edges.add(c, b, 0);
    expect(dag.detectCycle()).toEqual({ reason: "cycle", path: [a, b, c, b] });
  });
  it("should return path array if does not have roots", () => {
    const dag = new DAG<string, number>();
    const a = dag.nodes.add("a");
    const b = dag.nodes.add("b");
    dag.edges.add(a, b, 0);
    dag.edges.add(b, a, 0);
    expect(dag.detectCycle()).toEqual({ reason: "no roots", path: [] });
  });

  it("single node", () => {
    const dag = new DAG<string, number>();
    dag.nodes.add("a");
    expect(dag.detectCycle()).toBeNull();
  });

  it("check each path", () => {
    const dag = new DAG<string, number>();
    const a = dag.nodes.add("a");
    const b = dag.nodes.add("b");
    const c = dag.nodes.add("c");
    const d = dag.nodes.add("d");
    dag.edges.add(a, b, 0);
    dag.edges.add(a, c, 0);
    dag.edges.add(b, d, 0);
    dag.edges.add(c, d, 0);
    expect(dag.detectCycle()).toBeNull();
  });
});
