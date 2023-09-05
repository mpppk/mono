import { describe, it, expect } from "vitest";
import { StringFinder } from "./graph-string";
import { DAG, DAGForestBuilder } from "./graph";

describe("StringFinder.findFromDag", () => {
  describe("serial dag", () => {
    const finder = new StringFinder();
    const dag = new DAG<string, number>();
    const abc = dag.nodes.add("abc");
    const def = dag.nodes.add("def");
    const ghi = dag.nodes.add("ghi");
    dag.edges.add(abc, def, 0);
    dag.edges.add(def, ghi, 0);

    it("miss match", () => {
      const res = [...finder.findFromDag(abc, dag, "x")];
      expect(res).toEqual([]);
    });

    it("first char", () => {
      const res = [...finder.findFromDag(abc, dag, "a")];
      expect(res).toEqual([
        {
          endPos: 1,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first 2 chars", () => {
      const res = [...finder.findFromDag(abc, dag, "ab")];
      expect(res).toEqual([
        {
          endPos: 2,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first node", () => {
      const res = [...finder.findFromDag(abc, dag, "abc")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first node, suffix", () => {
      const res = [...finder.findFromDag(abc, dag, "bc")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 1,
        },
      ]);
    });

    it("first node, suffix char", () => {
      const res = [...finder.findFromDag(abc, dag, "c")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 2,
        },
      ]);
    });

    it("2 node", () => {
      const res = [...finder.findFromDag(abc, dag, "abcd")];
      expect(res).toEqual([
        {
          endPos: 1,
          path: [abc, def],
          startPos: 0,
        },
      ]);
    });

    it("2 node, full match", () => {
      const res = [...finder.findFromDag(abc, dag, "abcdef")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc, def],
          startPos: 0,
        },
      ]);
    });

    it("2 node, partial match", () => {
      const res = [...finder.findFromDag(abc, dag, "bcde")];
      expect(res).toEqual([
        {
          endPos: 2,
          path: [abc, def],
          startPos: 1,
        },
      ]);
    });

    it("2 node, miss match", () => {
      const res = [...finder.findFromDag(abc, dag, "abcxxx")];
      expect(res).toEqual([]);
    });

    it("3 node, full match", () => {
      const res = [...finder.findFromDag(abc, dag, "abcdefghi")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc, def, ghi],
          startPos: 0,
        },
      ]);
    });
  });
});

describe("StringFinder.startWithFromDag", () => {
  const finder = new StringFinder();
  const dag = new DAG<string, number>();
  const abc = dag.nodes.add("abc");
  const def = dag.nodes.add("def");
  const ghi = dag.nodes.add("ghi");
  dag.edges.add(abc, def, 0);
  dag.edges.add(def, ghi, 0);

  it("first char", () => {
    const res = [...finder.startWithFromDag([abc], dag, "a")];
    expect(res).toEqual([
      {
        endPos: 1,
        path: [abc],
      },
    ]);
  });

  it("2 chars", () => {
    const res = [...finder.startWithFromDag([abc], dag, "ab")];
    expect(res).toEqual([
      {
        endPos: 2,
        path: [abc],
      },
    ]);
  });

  it("first node all chars", () => {
    const res = [...finder.startWithFromDag([abc], dag, "abc")];
    expect(res).toEqual([
      {
        endPos: 3,
        path: [abc],
      },
    ]);
  });

  it("first node not prefix", () => {
    const res = [...finder.startWithFromDag([abc], dag, "b")];
    expect(res).toEqual([]);
  });

  it("2 node", () => {
    const res = [...finder.startWithFromDag([abc], dag, "abcd")];
    expect(res).toEqual([
      {
        endPos: 1,
        path: [abc, def],
      },
    ]);
  });
});

describe("with findPartialPath", () => {
  const builder = new DAGForestBuilder<string, number>();
  const { id } = builder.newDAG();
  const abc = builder.nodes.add("abc");
  const def = builder.nodes.add("def");
  const ghi = builder.nodes.add("ghi");
  const forest = builder.build();
  forest.addEdge(id, abc, def, 0);
  forest.addEdge(id, def, ghi, 0);

  it("first char", () => {
    const finder = new StringFinder();
    const paths = [...forest.findPartialPath(finder.toMatcher("a"))];
    expect(paths).toEqual([{ dagID: id, path: [abc] }]);
  });

  it("all chars", () => {
    const finder = new StringFinder();
    const paths = [...forest.findPartialPath(finder.toMatcher("abcdefghi"))];
    expect(paths).toEqual([{ dagID: id, path: [abc, def, ghi] }]);
  });

  it("2nd node prefix", () => {
    const finder = new StringFinder();
    const paths = [...forest.findPartialPath(finder.toMatcher("de"))];
    expect(paths).toEqual([{ dagID: id, path: [def] }]);
  });

  it("2nd node match", () => {
    const finder = new StringFinder();
    const paths = [...forest.findPartialPath(finder.toMatcher("efg"))];
    expect(paths).toEqual([{ dagID: id, path: [def, ghi] }]);
  });
});