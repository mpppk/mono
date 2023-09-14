import { describe, it, expect } from "vitest";
import { newPriorityQueueDebugger, PriorityQueue } from "./priority-queue";
import createDebug from "debug";
import { debugPrefix } from "../common";

const debug = createDebug(debugPrefix.alg + ":p-queue-test");

describe("push and pop", () => {
  it("should be able to push and pop", () => {
    const queue = new PriorityQueue<number>(
      (x) => x,
      "asc",
      newPriorityQueueDebugger(debug)
    );
    queue.push(1);
    queue.push(2);
    queue.push(3);
    expect(queue.pop()).toBe(1);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
  });

  it("should be able to push and pop with zero", () => {
    const queue = new PriorityQueue<number>(
      (x) => x,
      "asc",
      newPriorityQueueDebugger(debug)
    );
    queue.push(1);
    queue.push(0);
    expect(queue.pop()).toBe(0);
    expect(queue.pop()).toBe(1);
  });

  it("desc", () => {
    const queue = new PriorityQueue<number>((x) => x, "desc");
    queue.push(1);
    queue.push(2);
    queue.push(3);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(1);
  });

  it("clone", () => {
    const queue = new PriorityQueue<number>((x) => x);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    const clone = queue.clone();
    expect(queue.pop()).toBe(1);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
    expect(clone.pop()).toBe(1);
    expect(clone.pop()).toBe(2);
    expect(clone.pop()).toBe(3);
  });
});
