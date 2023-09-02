import { DAG, NodeID } from "./graph";
import { NonEmptyArray, unreachable } from "../common";

// eslint-disable-next-line @typescript-eslint/ban-types
export interface Char extends String {
  _charBrand: never;
}
const Char = (() => {
  const segmenter = new Intl.Segmenter("ja", {
    granularity: "grapheme",
  });
  return Object.freeze({
    new: (c: string): Char => {
      return c as unknown as Char;
    },
    fromString: (s: string): Char[] => {
      return Array.from(segmenter.segment(s))
        .map((s) => s.segment)
        .map((s) => Char.new(s));
    },
  });
})();

class CharsMap {
  private readonly charsMap: Map<NodeID, Char[]> = new Map();
  private readonly strMap: Map<NodeID, string> = new Map();

  public add(nodeID: NodeID, str: string): Char[] {
    if (this.charsMap.has(nodeID)) {
      return this.charsMap.get(nodeID)!;
    }

    this.strMap.set(nodeID, str);
    const chars = Char.fromString(str);
    this.charsMap.set(nodeID, chars);
    return chars;
  }

  public get(nodeID: NodeID): Char[] | undefined {
    return this.charsMap.get(nodeID);
  }

  public getStr(nodeID: NodeID): string | undefined {
    return this.strMap.get(nodeID);
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface StrPos extends Number {
  _strPosBrand: never;
}
const StrPos = Object.freeze({
  new: (n: number): StrPos => n as unknown as StrPos,
  toNumber: (n: StrPos): number => n as unknown as number,
});

export type UnknownStrRange = StrRange | IncompleteStrRange | EmptyStrRange;
export type StrRange = {
  type: "StrRange:complete";
  startPos: StrPos;
  endPos: StrPos;
};
const StrRange = Object.freeze({
  new: (startPos: number, endPos: number): StrRange => {
    return {
      type: "StrRange:complete",
      startPos: StrPos.new(startPos),
      endPos: StrPos.new(endPos),
    };
  },
});
export type IncompleteStrRange = {
  type: "StrRange:incomplete";
  startPos: StrPos;
};
const IncompleteStrRange = Object.freeze({
  new: (startPos: number): IncompleteStrRange => {
    return {
      type: "StrRange:incomplete",
      startPos: StrPos.new(startPos),
    };
  },
});
export type EmptyStrRange = {
  type: "StrRange:empty";
};
const EmptyStrRange = Object.freeze({
  new: (): EmptyStrRange => {
    return {
      type: "StrRange:empty",
    };
  },
});

export type FindStrResult =
  | {
      target: EmptyStrRange | StrRange;
      remainQueryStartPos: null;
    }
  | {
      target: IncompleteStrRange;
      remainQueryStartPos: StrPos;
    };

/**
 * 文字列検索の結果
 */
export type DagStrRange = {
  /**
   * 文字列を含むノード群
   */
  path: NodeID[];
  /**
   * path[0]のノードの文字列の、検索対象文字の開始位置
   */
  startPos: StrPos;

  /**
   * path[path.length-1]のノードの文字列の、検索対象文字の終了位置
   */
  endPos: StrPos;
};
export type DagStrPrefix = Omit<DagStrRange, "startPos">;

export class StringFinder {
  private readonly charsMap: CharsMap = new CharsMap();
  constructor() {}

  public *findFromDag<EdgeValue>(
    nodeID: NodeID,
    dag: DAG<string, EdgeValue>,
    query: string
  ): Generator<DagStrRange, undefined> {
    const targetChars = this.charsMap.add(nodeID, dag.nodes.get(nodeID)!);
    const { target: tRes, remainQueryStartPos } = StringFinder.findFromChars(
      targetChars,
      Char.fromString(query)
    );

    switch (tRes.type) {
      case "StrRange:empty":
        return;
      case "StrRange:incomplete":
        break;
      case "StrRange:complete":
        yield {
          path: [nodeID],
          startPos: tRes.startPos,
          endPos: tRes.endPos,
        };
        return;
      default:
        unreachable(tRes);
    }

    // ここでは必ずStrRange:incompleteなので、remainQueryStartPosは必ず存在する
    const remainQuery = query.slice(StrPos.toNumber(remainQueryStartPos!));
    const children = (dag.edges.get(nodeID) ?? []).children.map((c) => c.to);
    for (const child of children) {
      for (const result of this.startWithFromDag([child], dag, remainQuery)) {
        yield {
          path: [nodeID, ...result.path],
          startPos: tRes.startPos,
          endPos: result.endPos,
        };
      }
    }
    return;
  }

  public *startWithFromDag<EdgeValue>(
    path: NonEmptyArray<NodeID>,
    dag: DAG<string, EdgeValue>,
    query: string
  ): Generator<DagStrPrefix> {
    // nodeIDのノードで完結するケース
    const nodeID = path[path.length - 1];
    const node = dag.nodes.get(nodeID)!;
    this.charsMap.add(nodeID, node);
    const nodeStr = this.charsMap.getStr(nodeID)!;
    if (nodeStr.startsWith(query)) {
      yield {
        path: [...path],
        endPos: StrPos.new(query.length),
      };
      return;
    }

    // マッチしないケース。着目ノードがqueryを完全に含まず、かつqueryが着目ノードの文字列のprefixでもない
    if (!query.startsWith(nodeStr)) {
      return;
    }

    // nodeIDのノードで完結しないケース
    const children = (dag.edges.get(nodeID) ?? []).children.map((c) => c.to);
    for (const child of children) {
      yield* this.startWithFromDag(
        [...path, child],
        dag,
        query.slice(nodeStr.length)
      );
    }
  }

  public static findFromChars = (
    target: Char[],
    query: Char[]
  ): FindStrResult => {
    loop1: for (let i = 0; i < target.length; i++) {
      for (let j = 0; j < query.length; j++) {
        if (i + j >= target.length) {
          // クエリのCharが途中まで見つかったが、targetの終端に達した
          return {
            target: IncompleteStrRange.new(i),
            remainQueryStartPos: StrPos.new(j),
          };
        }
        if (target[i + j] !== query[j]) {
          continue loop1;
        }
      }
      // クエリのCharが全て見つかった
      return {
        target: StrRange.new(i, i + query.length),
        remainQueryStartPos: null,
      };
    }
    // クエリがマッチしなかった
    return {
      target: EmptyStrRange.new(),
      remainQueryStartPos: null,
    };
  };
}
