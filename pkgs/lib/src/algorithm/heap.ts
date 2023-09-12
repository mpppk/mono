import { unreachable } from "../common";

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

type NodeLeftPosition = 0;
type NodeRootPosition = 1;
type NodeRightPosition = 2;
const NodePosition = Object.freeze({
  left: 0 as NodeLeftPosition,
  root: 1 as NodeRootPosition,
  right: 2 as NodeRightPosition,
});
type NodePosition = (typeof NodePosition)[keyof typeof NodePosition];

export class Heap<T> {
  private _data: T[] = [];
  constructor(
    public mapper: (value: T) => number,
    private mode: "asc" | "desc" = "asc"
  ) {}

  public clone(): Heap<T> {
    const clone = new Heap(this.mapper);
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
    if (!data) {
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
    if (leftNode.value && leftNode.value < smallest.value) {
      smallest = leftNode;
      smallestNodePosition = NodePosition.left;
    }
    if (rightNode.value && rightNode.value < smallest.value) {
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
    if (leftNode.value && leftNode.value > largest.value) {
      largest = leftNode;
      largestNodePosition = NodePosition.left;
    }
    if (rightNode.value && rightNode.value > largest.value) {
      largest = rightNode;
      largestNodePosition = NodePosition.right;
    }
    return { node: largest, position: largestNodePosition };
  }

  private swap(index: number) {
    const base = this.node(index);
    if (!exists(base)) {
      return;
    }
    const leftNode = this.left(index);
    const rightNode = this.right(index);
    const target = (() => {
      switch (this.mode) {
        case "asc":
          return this.smallest(base, leftNode, rightNode);
        case "desc":
          return this.largest(base, leftNode, rightNode);
        default:
          unreachable(this.mode);
      }
    })();
    if (!target) {
      return;
    }
    const root = this._data[index];
    switch (target.position) {
      case NodePosition.root:
        break;
      case NodePosition.left:
        this._data[leftNode.index] = root;
        this._data[index] = target.node.data;
        break;
      case NodePosition.right:
        this._data[rightNode.index] = root;
        this._data[index] = target.node.data;
        break;
      default:
        unreachable(target.position);
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
