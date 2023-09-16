import { describe, it, expect } from "vitest";
import { Heap, HeapCompareFunction } from "./heap";

describe("Heap", () => {
  it("handle primitive number", () => {
    const compare = (a: number, b: number) => a - b;
    const heap = new Heap<number>(compare);
    heap.push(1);
    heap.push(3);
    heap.push(2);
    expect(heap.pop()).toEqual({ data: 1 });
    expect(heap.pop()).toEqual({ data: 2 });
    expect(heap.pop()).toEqual({ data: 3 });
    expect(heap.pop()).toEqual({ data: null });
    expect(heap.pop()).toEqual({ data: null });
  });

  it("asc", () => {
    const compare = (a: { v: number }, b: { v: number }) => a.v - b.v;
    const heap = new Heap<{ v: number }>(compare);
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 1 } });
    expect(heap.pop()).toEqual({ data: { v: 2 } });
    expect(heap.pop()).toEqual({ data: { v: 3 } });
    expect(heap.pop()).toEqual({ data: null });
    expect(heap.pop()).toEqual({ data: null });
  });

  it("asc with zero", () => {
    const compare = (a: { v: number }, b: { v: number }) => a.v - b.v;
    const heap = new Heap<{ v: number }>(compare);
    heap.push({ v: 1 });
    heap.push({ v: 0 });
    expect(heap.pop()).toEqual({ data: { v: 0 } });
    expect(heap.pop()).toEqual({ data: { v: 1 } });
    expect(heap.pop()).toEqual({ data: null });
  });

  it("desc", () => {
    const compare = (a: { v: number }, b: { v: number }) => b.v - a.v;
    const heap = new Heap<{ v: number }>(compare);
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 3 } });
    expect(heap.pop()).toEqual({ data: { v: 2 } });
    expect(heap.pop()).toEqual({ data: { v: 1 } });
    expect(heap.pop()).toEqual({ data: null });
    expect(heap.pop()).toEqual({ data: null });
  });

  it("compare function", () => {
    // 偶数が先頭にくるソート
    const compare: HeapCompareFunction<{ v: number }> = (a, b) =>
      (a.v % 2) - (b.v % 2);
    const heap = new Heap<{ v: number }>(compare);
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 2 } });
    expect(heap.pop()).toEqual({ data: { v: 3 } });
    expect(heap.pop()).toEqual({ data: { v: 1 } });
    expect(heap.pop()).toEqual({ data: null });
    expect(heap.pop()).toEqual({ data: null });
  });
});
