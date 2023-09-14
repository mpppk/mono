import { Heap } from "./heap";
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
  debug: createDebug.Debugger
): PriorityQueueEventHandler<T> => ({
  popped: (value: T, queue: PriorityQueue<T>) => {
    const v = isPrimitive(value) ? value : JSON.stringify(value);
    debug(`popped: ${v} (${queue.size() + 1}->${queue.size()})`);
  },
  queued: (value: T, queue: PriorityQueue<T>) => {
    const v = isPrimitive(value) ? value : JSON.stringify(value);
    debug(`queued: ${v} (${queue.size() - 1}->${queue.size()})`);
  },
});

export class PriorityQueue<T> {
  private heap: Heap<T>;
  constructor(
    mapper: (value: T) => number,
    mode: "asc" | "desc" = "asc",
    private eventHandler: PriorityQueueEventHandler<T> = emptyPriorityQueueEventHandler
  ) {
    this.heap = new Heap(mapper, mode);
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

  public clone(): PriorityQueue<T> {
    const clone = new PriorityQueue(this.heap.mapper);
    clone.heap = this.heap.clone();
    return clone;
  }
}
