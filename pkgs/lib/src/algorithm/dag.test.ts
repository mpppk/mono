import { describe, expect, it } from "vitest";
import { DAG, FindPathOptions, Nodes, Path } from "./dag";
import { DagForest, FindPartialPathOp } from "./dag-forest";
import { NodeID } from "./values";

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
