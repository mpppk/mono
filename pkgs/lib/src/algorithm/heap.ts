import { unreachable } from "cli/src/utils";

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

const exists = <T>(node: Node<T> | NoExistNode): node is Node<T> => {
  return node.data !== null;
};

export class Heap<T> {
  private _data: T[] = [];
  constructor(private mapper: (value: T) => number) {}

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
    if (!data) {
      return newNoExistNode(index);
    }
    return {
      data,
      value: this.mapper(data),
      index,
    };
  }

  private swap(index: number) {
    const base = this.node(index);
    if (!exists(base)) {
      return;
    }
    let smallest = base;
    let smallestNodeType: "root" | "left" | "right" = "root";
    const leftNode = this.left(index);
    const rightNode = this.right(index);
    if (leftNode.value && leftNode.value < smallest.value) {
      smallest = leftNode;
      smallestNodeType = "left";
    }
    if (rightNode.value && rightNode.value < smallest.value) {
      smallest = rightNode;
      smallestNodeType = "right";
    }
    const root = this._data[index];
    switch (smallestNodeType) {
      case "root":
        break;
      case "left":
        this._data[leftNode.index] = root;
        this._data[index] = smallest.data;
        break;
      case "right":
        this._data[rightNode.index] = root;
        this._data[index] = smallest.data;
        break;
      default:
        unreachable(smallestNodeType);
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
}
