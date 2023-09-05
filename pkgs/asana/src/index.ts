import { loadEnv } from "./env";
import fs from "fs";
import * as Papa from "papaparse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FixeMeAny = any;

const main = async () => {
  const env = loadEnv();
  const readFile = fs.promises.readFile;
  const contents = await readFile(env.CSV_FILE, "utf8");
  const results = Papa.parse(contents, {
    header: true,
    skipEmptyLines: true,
  });

  const toScrapboxLink = (scrapboxUrl: string) => {
    let link = scrapboxUrl.replace(
      `https://scrapbox.io/${env.SCRAPBOX_PROJECT}/`,
      ""
    );
    link = decodeURI(link);
    return link.replaceAll("%2F", "/").replaceAll("_", " ");
  };

  const rows = results.data
    .filter((row: FixeMeAny) => {
      const completedAtStr = row["Completed At"];
      if (completedAtStr === "") {
        return false;
      }
      const completedAt = new Date(completedAtStr);
      return (
        completedAt > new Date("2023-08-01") &&
        completedAt < new Date("2023-09-01")
      );
    })
    .map((row: FixeMeAny) => ({
      ...row,
      link: toScrapboxLink(row["Scrapbox"]),
    }));

  const toAsanaUrl = (taskID: string) => {
    return `https://app.asana.com/0/0/${taskID}`;
  };

  const isSameTitle = (t1: string, t2: string) => {
    const t1f = t1.replaceAll(" ", "_").replaceAll("　", "_");
    const t2f = t2.replaceAll(" ", "_").replaceAll("　", "_");
    return t1f === t2f;
  };
  const sbText = rows.map((row) => {
    if (row["Scrapbox"] === "") {
      return `Asana:[${row.Name} ${toAsanaUrl(row["Task ID"])}]`;
    }
    if (isSameTitle(row.Name, row.link)) {
      return `[${row.link}]([Asana ${toAsanaUrl(row["Task ID"])}])`;
    }
    return `[${row.link}](Asana:[${row.Name} ${toAsanaUrl(row["Task ID"])}])`;
  });
  console.log(sbText.join("\n"));
};

main();
