import { describe, it, expect } from "vitest";
import { StringFinder } from "./graph-string";
import { DAG, DagForest } from "./graph";

describe("StringFinder.findFromDag", () => {
  describe("serial dag", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const dag = new DAG<string, number>();
    const abc = dag.nodes.add("abc");
    const def = dag.nodes.add("def");
    const ghi = dag.nodes.add("ghi");
    dag.edges.add(abc, def, 0);
    dag.edges.add(def, ghi, 0);

    it("miss match", () => {
      const res = [...finder.findFromNode(abc, dag, "x")];
      expect(res).toEqual([]);
    });

    it("first char", () => {
      const res = [...finder.findFromNode(abc, dag, "a")];
      expect(res).toEqual([
        {
          endPos: 1,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first 2 chars", () => {
      const res = [...finder.findFromNode(abc, dag, "ab")];
      expect(res).toEqual([
        {
          endPos: 2,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first node", () => {
      const res = [...finder.findFromNode(abc, dag, "abc")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 0,
        },
      ]);
    });

    it("first node, suffix", () => {
      const res = [...finder.findFromNode(abc, dag, "bc")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 1,
        },
      ]);
    });

    it("first node, suffix char", () => {
      const res = [...finder.findFromNode(abc, dag, "c")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc],
          startPos: 2,
        },
      ]);
    });

    it("2 node", () => {
      const res = [...finder.findFromNode(abc, dag, "abcd")];
      expect(res).toEqual([
        {
          endPos: 1,
          path: [abc, def],
          startPos: 0,
        },
      ]);
    });

    it("2 node, full match", () => {
      const res = [...finder.findFromNode(abc, dag, "abcdef")];
      expect(res).toEqual([
        {
          endPos: 3,
          path: [abc, def],
          startPos: 0,
        },
      ]);
    });

    it("2 node, partial match", () => {
      const res = [...finder.findFromNode(abc, dag, "bcde")];
      expect(res).toEqual([
        {
          endPos: 2,
          path: [abc, def],
          startPos: 1,
        },
      ]);
    });

    it("2 node, miss match", () => {
      const res = [...finder.findFromNode(abc, dag, "abcxxx")];
      expect(res).toEqual([]);
    });

    it("3 node, full match", () => {
      const res = [...finder.findFromNode(abc, dag, "abcdefghi")];
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
  const finder = new StringFinder<string, number>((s) => s);
  const dag = new DAG<string, number>();
  const abc = dag.nodes.add("abc");
  const def = dag.nodes.add("def");
  const ghi = dag.nodes.add("ghi");
  dag.edges.add(abc, def, 0);
  dag.edges.add(def, ghi, 0);

  it("first char", () => {
    const res = [...finder.startWithFromNode([abc], dag, "a")];
    expect(res).toEqual([
      {
        endPos: 1,
        path: [abc],
      },
    ]);
  });

  it("2 chars", () => {
    const res = [...finder.startWithFromNode([abc], dag, "ab")];
    expect(res).toEqual([
      {
        endPos: 2,
        path: [abc],
      },
    ]);
  });

  it("first node all chars", () => {
    const res = [...finder.startWithFromNode([abc], dag, "abc")];
    expect(res).toEqual([
      {
        endPos: 3,
        path: [abc],
      },
    ]);
  });

  it("first node not prefix", () => {
    const res = [...finder.startWithFromNode([abc], dag, "b")];
    expect(res).toEqual([]);
  });

  it("2 node", () => {
    const res = [...finder.startWithFromNode([abc], dag, "abcd")];
    expect(res).toEqual([
      {
        endPos: 1,
        path: [abc, def],
      },
    ]);
  });
});

describe("with findPartialPath", () => {
  const forest = new DagForest<string, number>();
  const { id } = forest.dags.new();
  const abc = forest.nodes.add("abc");
  const def = forest.nodes.add("def");
  const ghi = forest.nodes.add("ghi");
  // const forest = builder.build();
  forest.edges.add(id, abc, def, 0);
  forest.edges.add(id, def, ghi, 0);

  it("first char", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("a"))];
    expect(paths).toEqual([{ dagId: id, path: [abc] }]);
  });

  it("all chars", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("abcdefghi"))];
    expect(paths).toEqual([{ dagId: id, path: [abc, def, ghi] }]);
  });

  it("2nd node prefix", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("de"))];
    expect(paths).toEqual([{ dagId: id, path: [def] }]);
  });

  it("2nd node match", () => {
    const finder = new StringFinder<string, number>((s) => s);
    const paths = [...forest.findPartialPath(finder.toMatcher("efg"))];
    expect(paths).toEqual([{ dagId: id, path: [def, ghi] }]);
  });
});
