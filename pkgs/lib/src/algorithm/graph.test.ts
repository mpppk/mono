import { describe, it, expect } from "vitest";
import { DAG, DAGForestBuilder, FindPathOptions, Nodes, Path } from "./graph";

describe("Graph", () => {
  it("should work", () => {
    const builder = new DAGForestBuilder<string, number>();
    const { dag, index } = builder.newDAG();
    const a = builder.addNode("a");
    const b = builder.addNode("b");
    const c = builder.addNode("c");
    dag.edges.add(a, b, 0);
    dag.edges.add(b, c, 0);
    expect(dag.edges.get(a)).toEqual({ parent: [], children: [b] });
    expect(dag.edges.get(b)).toEqual({ parent: [a], children: [c] });
    expect(dag.edges.get(c)).toEqual({ parent: [b], children: [] });

    const forest = builder.build();
    expect(forest.getDAG(index)).toEqual(dag);
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
