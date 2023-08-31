import { Heap } from "./heap";

export class PriorityQueue<T> {
  private heap: Heap<T>;
  constructor(mapper: (value: T) => number) {
    this.heap = new Heap(mapper);
  }
  public push(value: T) {
    this.heap.push(value);
  }

  public pop(): T | null {
    return this.heap.pop()?.data ?? null;
  }

  public size(): number {
    return this.heap.size();
  }
}
