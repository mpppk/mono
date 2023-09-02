import { describe, it, expect } from "vitest";
import { StringFinder } from "./graph-string";
import { DAG } from "./graph";

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
