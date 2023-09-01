import { describe, it, expect } from "vitest";
import {
  DAG,
  DAGForestBuilder,
  FindPartialPathOp,
  FindPathOptions,
  NodeID,
  Nodes,
  Path,
} from "./graph";

describe("Graph", () => {
  it("should work", () => {
    const builder = new DAGForestBuilder<string, number>();
    const { dag, id } = builder.newDAG();
    const a = builder.addNode("a");
    const b = builder.addNode("b");
    const c = builder.addNode("c");
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

    const forest = builder.build();
    expect(forest.getDag(id)).toEqual(dag);
    expect(forest.nodes.get(a)).toEqual("a");
  });
});

describe("DAG.findPath", () => {
  it("simple", () => {
    const dag = new DAG<string, number>(new Nodes());
    const a = dag.nodes.add("a");
    const b = dag.nodes.add("b");
    const c = dag.nodes.add("c");
    const d = dag.nodes.add("d");
    const e = dag.nodes.add("e");
    dag.edges.add(a, b, 0);
    dag.edges.add(b, c, 1);
    dag.edges.add(b, d, 0);
    dag.edges.add(c, e, 0);
    dag.edges.add(d, e, 0);
    const paths: Path[] = [];
    const opt: FindPathOptions<string, number> = {
      defaultCost: 1,
      costF: (edge) => edge.value,
    };
    for (const path of dag.findPath(a, e, opt)) {
      paths.push(path);
    }
    expect(paths).toEqual([
      { path: [a, b, d, e], cost: 1 }, // cost = defaultCost
      { path: [a, b, c, e], cost: 2 }, // cost = defaultCost + 1(b→c)
    ]);
  });
});

describe("DAG.findPartialPath", () => {
  it("simple", () => {
    const builder = new DAGForestBuilder<string, number>();
    const { dag: dag1, id: dagId1 } = builder.newDAG();
    const a1 = dag1.nodes.add("a1");
    const b1 = dag1.nodes.add("b1");
    const c1 = dag1.nodes.add("c1");
    const d1 = dag1.nodes.add("d1");
    const { dag: dag2, id: dagId2 } = builder.newDAG();
    const a2 = dag2.nodes.add("a2");
    const b2 = dag2.nodes.add("b2");
    const c2 = dag2.nodes.add("c2");
    const c3 = dag2.nodes.add("c3");
    const forest = builder.build();
    forest.addEdge(dagId1, a1, b1, 0);
    forest.addEdge(dagId1, b1, c1, 0);
    forest.addEdge(dagId1, b1, d1, 0);
    forest.addEdge(dagId2, a2, b2, 0);
    forest.addEdge(dagId2, b2, c2, 0);
    forest.addEdge(dagId2, b2, c3, 0);
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
      { path: [b1, c1], dagID: dagId1 },
      { path: [b2, c2], dagID: dagId2 },
      // 一つのDAGから一つ見つかったら以降は打ち切るので、b2 -> c3はなし
    ]);
  });
});
