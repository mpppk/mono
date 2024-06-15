import * as fs from "node:fs";

const main = async () => {
  console.log("irasutoya-words");
  const illustrations = JSON.parse(
    await fs.promises.readFile("data/illustrations.json", "utf-8"),
  );
  console.log(illustrations);
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  const wordCount = new Map<string, number>();
  for (const illustration of illustrations) {
    const segments = Array.from(segmenter.segment(illustration.title));
    console.log(segments.map((s) => s.segment));
    for (const segment of segments) {
      if (!segment.isWordLike) continue;
      const word = segment.segment;
      if (/^[ぁ-ん]{1,2}$/.test(word)) {
        continue;
      }
      if (wordCount.has(word)) {
        wordCount.set(word, wordCount.get(word)! + 1);
      } else {
        wordCount.set(word, 1);
      }
    }
  }

  const sortedWordCount = Array.from(wordCount).sort((a, b) => b[1] - a[1]);
  console.log(sortedWordCount);
};

main();
