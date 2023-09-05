import { Char } from "../char";
import { FindStrResult } from "./graph-string";

// eslint-disable-next-line @typescript-eslint/ban-types
export interface StrPos extends Number {
  _strPosBrand: never;
}
export const StrPos = Object.freeze({
  new: (n: number): StrPos => n as unknown as StrPos,
  toNumber: (n: StrPos): number => n as unknown as number,
});

export type StrRange = {
  type: "StrRange:complete";
  startPos: StrPos;
  endPos: StrPos;
};
export const StrRange = Object.freeze({
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
export const IncompleteStrRange = Object.freeze({
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
export const EmptyStrRange = Object.freeze({
  new: (): EmptyStrRange => {
    return {
      type: "StrRange:empty",
    };
  },
});

export const findFromChars = (target: Char[], query: Char[]): FindStrResult => {
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
