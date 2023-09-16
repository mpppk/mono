type Node<T> = {
  data: T;
  value: number;
  index: number;
};

type NoExistNode = {
  data: null;
  value: null;
  index: number;
};

const newNoExistNode = (index: number): NoExistNode => ({
  data: null,
  value: null,
  index,
});

export const isNoExistNode = <T>(
  node: Node<T> | NoExistNode
): node is Node<T> => {
  return node.data !== null;
};

type NodeLeftPosition = 0;
type NodeRootPosition = 1;
type NodeRightPosition = 2;
const NodePosition = Object.freeze({
  left: 0 as NodeLeftPosition,
  root: 1 as NodeRootPosition,
  right: 2 as NodeRightPosition,
});
type NodePosition = (typeof NodePosition)[keyof typeof NodePosition];

export type HeapCompareFunction<T> = (a: Node<T>, b: Node<T>) => number;

export class Heap<T> {
  private _data: T[] = [];
  constructor(
    public mapper: (value: T) => number,
    private mode: "asc" | "desc" | HeapCompareFunction<T> = "asc"
  ) {}

  public clone(): Heap<T> {
    const clone = new Heap(this.mapper, this.mode);
    clone._data = [...this._data];
    return clone;
  }

  public root(): Node<T> | NoExistNode {
    return this.node(0);
  }

  public parent(index: number): Node<T> | NoExistNode {
    return this.node(index >> 1);
  }

  public left(index: number): Node<T> | NoExistNode {
    return this.node(index << 1);
  }

  public right(index: number): Node<T> | NoExistNode {
    return this.node((index << 1) + 1);
  }

  public node(index: number): Node<T> | NoExistNode {
    const data = this._data[index];
    if (data === undefined) {
      return newNoExistNode(index);
    }
    return {
      data,
      value: this.mapper(data),
      index,
    };
  }

  private smallest(
    base: Node<T>,
    leftNode: Node<T> | NoExistNode,
    rightNode: Node<T> | NoExistNode
  ) {
    let smallest = base;
    let smallestNodePosition: NodePosition = NodePosition.root;
    if (leftNode.value !== null && leftNode.value < smallest.value) {
      smallest = leftNode;
      smallestNodePosition = NodePosition.left;
    }
    if (rightNode.value !== null && rightNode.value < smallest.value) {
      smallest = rightNode;
      smallestNodePosition = NodePosition.right;
    }
    return { node: smallest, position: smallestNodePosition };
  }

  private largest(
    base: Node<T>,
    leftNode: Node<T> | NoExistNode,
    rightNode: Node<T> | NoExistNode
  ) {
    let largest = base;
    let largestNodePosition: NodePosition = NodePosition.root;
    if (leftNode.value !== null && leftNode.value > largest.value) {
      largest = leftNode;
      largestNodePosition = NodePosition.left;
    }
    if (rightNode.value !== null && rightNode.value > largest.value) {
      largest = rightNode;
      largestNodePosition = NodePosition.right;
    }
    return { node: largest, position: largestNodePosition };
  }

  private swap(index: number) {
    const base = this.node(index);
    if (!isNoExistNode(base)) {
      return;
    }
    const leftNode = this.left(index);
    const rightNode = this.right(index);
    const compare: HeapCompareFunction<T> = (() => {
      switch (this.mode) {
        case "asc":
          return (a: Node<T>, b: Node<T>) => a.value - b.value;
        case "desc":
          return (a: Node<T>, b: Node<T>) => b.value - a.value;
        default:
          return this.mode;
      }
    })();
    const root = this._data[index];
    if (leftNode.value !== null && compare(leftNode, base) < 0) {
      this._data[leftNode.index] = root;
      this._data[index] = leftNode.data;
    }
    if (rightNode.value !== null && compare(rightNode, base) < 0) {
      this._data[rightNode.index] = root;
      this._data[index] = rightNode.data;
    }
  }

  private build() {
    for (let i = this._data.length >> 1; i >= 0; i--) {
      this.swap(i);
    }
  }

  public push(data: T) {
    this._data.push(data);
    this.build();
  }

  public pop(): Omit<Node<T> | NoExistNode, "index"> {
    const root = this.root();
    if (!root) {
      return { data: null, value: null };
    }
    if (this._data.length === 1) {
      this._data.pop();
      return { data: root.data, value: root.value };
    }
    this._data[0] = this._data.pop()!;
    this.build();
    return { data: root.data, value: root.value };
  }

  public size(): number {
    return this._data.length;
  }

  public max(): number {
    // FIXME: ナイーブな実装
    return this._data.reduce(
      (acc, cur) => Math.max(acc, this.mapper(cur)),
      -Infinity
    );
  }
}
