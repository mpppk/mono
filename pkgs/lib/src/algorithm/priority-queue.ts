import { Heap, HeapCompareFunction } from "./heap";
import createDebug from "debug";
import { isPrimitive } from "../common";

type PriorityQueueEventHandler<T> = {
  queued: (value: T, queue: PriorityQueue<T>) => void;
  popped: (value: T, queue: PriorityQueue<T>) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyPriorityQueueEventHandler: PriorityQueueEventHandler<any> = {
  queued: () => {},
  popped: () => {},
};

export const newPriorityQueueDebugger = <T>(
  debug: createDebug.Debugger,
  name = "",
): PriorityQueueEventHandler<T> => ({
  popped: (value: T, queue: PriorityQueue<T>) => {
    const v = isPrimitive(value) ? value : JSON.stringify(value);
    debug(`${name}popped: ${v} (${queue.size() + 1}->${queue.size()})`);
  },
  queued: (value: T, queue: PriorityQueue<T>) => {
    const v = isPrimitive(value) ? value : JSON.stringify(value);
    debug(`${name}queued: ${v} (${queue.size() - 1}->${queue.size()})`);
  },
});

export class PriorityQueue<T> {
  constructor(
    private sorter: HeapCompareFunction<T>,
    private eventHandler: PriorityQueueEventHandler<T> = emptyPriorityQueueEventHandler,
    private heap = new Heap(sorter),
  ) {}

  public static newAsc<T>(
    mapper: (v: T) => number,
    eventHandler: PriorityQueueEventHandler<T> = emptyPriorityQueueEventHandler,
  ): PriorityQueue<T> {
    return new PriorityQueue((a, b) => mapper(a) - mapper(b), eventHandler);
  }

  public static newDesc<T>(
    mapper: (v: T) => number,
    eventHandler: PriorityQueueEventHandler<T> = emptyPriorityQueueEventHandler,
  ): PriorityQueue<T> {
    return new PriorityQueue((a, b) => mapper(b) - mapper(a), eventHandler);
  }

  public push(value: T) {
    this.heap.push(value);
    this.eventHandler.queued(value, this);
  }

  public pop(): T {
    const el = this.heap.pop();
    if (el.data === null) {
      throw new Error("empty queue be popped");
    }
    this.eventHandler.popped(el.data, this);
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

  // public max(): number {
  //   return this.heap.max();
  // }

  public clone(): PriorityQueue<T> {
    return new PriorityQueue(this.sorter, this.eventHandler, this.heap.clone());
  }
}
