import { describe, it, expect } from "vitest";
import { Heap, HeapCompareFunction } from "./heap";

describe("Heap", () => {
  it("handle primitive number", () => {
    const heap = new Heap<number>((v) => v);
    heap.push(1);
    heap.push(3);
    heap.push(2);
    expect(heap.pop()).toEqual({ data: 1, value: 1 });
    expect(heap.pop()).toEqual({ data: 2, value: 2 });
    expect(heap.pop()).toEqual({ data: 3, value: 3 });
    expect(heap.pop()).toEqual({ data: null, value: null });
    expect(heap.pop()).toEqual({ data: null, value: null });
  });

  it("asc", () => {
    const heap = new Heap<{ v: number }>((v) => v.v);
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 1 }, value: 1 });
    expect(heap.pop()).toEqual({ data: { v: 2 }, value: 2 });
    expect(heap.pop()).toEqual({ data: { v: 3 }, value: 3 });
    expect(heap.pop()).toEqual({ data: null, value: null });
    expect(heap.pop()).toEqual({ data: null, value: null });
  });

  it("asc with zero", () => {
    const heap = new Heap<{ v: number }>((v) => v.v);
    heap.push({ v: 1 });
    heap.push({ v: 0 });
    expect(heap.pop()).toEqual({ data: { v: 0 }, value: 0 });
    expect(heap.pop()).toEqual({ data: { v: 1 }, value: 1 });
    expect(heap.pop()).toEqual({ data: null, value: null });
  });

  it("desc", () => {
    const heap = new Heap<{ v: number }>((v) => v.v, "desc");
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 3 }, value: 3 });
    expect(heap.pop()).toEqual({ data: { v: 2 }, value: 2 });
    expect(heap.pop()).toEqual({ data: { v: 1 }, value: 1 });
    expect(heap.pop()).toEqual({ data: null, value: null });
    expect(heap.pop()).toEqual({ data: null, value: null });
  });

  it("compare function", () => {
    // 偶数が先頭にくるソート
    const compare: HeapCompareFunction<{ v: number }> = (a, b) =>
      (a.value % 2) - (b.value % 2);
    const heap = new Heap<{ v: number }>((v) => v.v, compare);
    heap.push({ v: 1 });
    heap.push({ v: 3 });
    heap.push({ v: 2 });
    expect(heap.pop()).toEqual({ data: { v: 2 }, value: 2 });
    expect(heap.pop()).toEqual({ data: { v: 3 }, value: 3 });
    expect(heap.pop()).toEqual({ data: { v: 1 }, value: 1 });
    expect(heap.pop()).toEqual({ data: null, value: null });
    expect(heap.pop()).toEqual({ data: null, value: null });
  });
});
