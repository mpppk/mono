import { DAG, FindPartialPathMatcher } from "./graph";
import { NonEmptyArray, unreachable } from "../common";
import { Char, CharsMap } from "../char";
import {
  EmptyStrRange,
  findFromChars,
  IncompleteStrRange,
  StrPos,
  StrRange,
} from "./string";
import { NodeID } from "./values";

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

export class StringFinder<Node, EdgeValue> {
  private readonly charsMap = new CharsMap<NodeID>();
  constructor(private mapper: (node: Node) => string) {}

  public *findFromNode(
    nodeID: NodeID,
    dag: DAG<Node, EdgeValue>,
    query: string
  ): Generator<DagStrRange, undefined> {
    const targetChars = this.charsMap.add(
      nodeID,
      this.mapper(dag.nodes.get(nodeID)!)
    );
    const { target: tRes, remainQueryStartPos } = findFromChars(
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
      for (const result of this.startWithFromNode([child], dag, remainQuery)) {
        yield {
          path: [nodeID, ...result.path],
          startPos: tRes.startPos,
          endPos: result.endPos,
        };
      }
    }
    return;
  }

  public *startWithFromNode(
    path: NonEmptyArray<NodeID>,
    dag: DAG<Node, EdgeValue>,
    query: string
  ): Generator<DagStrPrefix> {
    // nodeIDのノードで完結するケース
    const nodeID = path[path.length - 1];
    const node = dag.nodes.get(nodeID)!;
    this.charsMap.add(nodeID, this.mapper(node));
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
      yield* this.startWithFromNode(
        [...path, child],
        dag,
        query.slice(nodeStr.length)
      );
    }
  }

  public toMatcher(query: string): FindPartialPathMatcher<Node, EdgeValue> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const finder = this;
    return function* (nodeID, dag) {
      for (const range of finder.findFromNode(nodeID, dag, query)) {
        yield range.path;
      }
    };
  }
}
