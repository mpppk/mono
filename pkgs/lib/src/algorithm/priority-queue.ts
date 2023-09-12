import { Heap } from "./heap";

export class PriorityQueue<T> {
  private heap: Heap<T>;
  constructor(mapper: (value: T) => number, mode: "asc" | "desc" = "asc") {
    this.heap = new Heap(mapper, mode);
  }
  public push(value: T) {
    this.heap.push(value);
  }

  public pop(): T {
    const el = this.heap.pop();
    if (!el.data) {
      throw new Error("empty queue be popped");
    }
    return el.data;
  }

  public popAll(): T[] {
    const ret = [];
    while (this.heap.size() > 0) {
      ret.push(this.pop());
    }
    return ret;
  }

  public safePop(): T | null {
    return this.heap.pop()?.data ?? null;
  }

  public size(): number {
    return this.heap.size();
  }

  public clone(): PriorityQueue<T> {
    const clone = new PriorityQueue(this.heap.mapper);
    clone.heap = this.heap.clone();
    return clone;
  }
}
