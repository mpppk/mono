type Node<T> = {
  data: T;
  index: number;
};

type NoExistNode = {
  data: null;
  index: number;
};

const newNoExistNode = (index: number): NoExistNode => ({
  data: null,
  index,
});

export const isNoExistNode = <T>(
  node: Node<T> | NoExistNode
): node is Node<T> => {
  return node.data !== null;
};

export type HeapCompareFunction<T> = (a: T, b: T) => number;

export class Heap<T> {
  private _data: T[] = [];
  constructor(private sorter: HeapCompareFunction<T>) {}

  public clone(): Heap<T> {
    const clone = new Heap(this.sorter);
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
      index,
    };
  }

  private swap(index: number) {
    const base = this.node(index);
    if (!isNoExistNode(base)) {
      return;
    }
    const leftNode = this.left(index);
    const rightNode = this.right(index);
    const root = this._data[index];
    if (leftNode.data !== null && this.sorter(leftNode.data, base.data) < 0) {
      this._data[leftNode.index] = root;
      this._data[index] = leftNode.data;
    }
    if (rightNode.data !== null && this.sorter(rightNode.data, base.data) < 0) {
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
      return { data: null };
    }
    if (this._data.length === 1) {
      this._data.pop();
      return { data: root.data };
    }
    this._data[0] = this._data.pop()!;
    this.build();
    return { data: root.data };
  }

  public size(): number {
    return this._data.length;
  }

  // public max(): number {
  //   // FIXME: ナイーブな実装
  //   return this._data.reduce(
  //     (acc, cur) => Math.max(acc, this.mapper(cur)),
  //     -Infinity
  //   );
  // }
}
