// eslint-disable-next-line @typescript-eslint/ban-types
export interface Char extends String {
  _charBrand: never;
}
export const Char = (() => {
  const segmenter = new Intl.Segmenter("ja", {
    granularity: "grapheme",
  });
  return Object.freeze({
    new: (c: string): Char => {
      return c as unknown as Char;
    },
    fromString: (s: string): Char[] => {
      return Array.from(segmenter.segment(s))
        .map((s) => s.segment)
        .map((s) => Char.new(s));
    },
  });
})();

export class CharsMap<Key> {
  private readonly charsMap: Map<Key, Char[]> = new Map();
  private readonly strMap: Map<Key, string> = new Map();

  public add(key: Key, str: string): Char[] {
    if (this.charsMap.has(key)) {
      return this.charsMap.get(key)!;
    }

    this.strMap.set(key, str);
    const chars = Char.fromString(str);
    this.charsMap.set(key, chars);
    return chars;
  }

  public get(key: Key): Char[] | undefined {
    return this.charsMap.get(key);
  }

  public getStr(key: Key): string | undefined {
    return this.strMap.get(key);
  }
}
