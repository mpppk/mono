import { loadEnv } from "./env";
import { ExtendedAsanaRow, loadAsanaCsv } from "./csv";
import { addToListMap } from "@mpppk/lib";

const main = async () => {
  const env = loadEnv();
  const csv = await loadAsanaCsv(env.CSV_FILE);

  const toScrapboxLink = (scrapboxUrl: string) => {
    let link = scrapboxUrl.replace(
      `https://scrapbox.io/${env.SCRAPBOX_PROJECT}/`,
      ""
    );
    link = decodeURI(link);
    return link.replaceAll("%2F", "/").replaceAll("_", " ");
  };

  const rows: ExtendedAsanaRow[] = csv.data
    .filter((row) => {
      const completedAt = row["Completed At"];
      if (completedAt === null) {
        return false;
      }
      return (
        completedAt > new Date("2023-08-01") &&
        completedAt < new Date("2023-09-01")
      );
    })
    .map((row) => ({
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

  const rowGroups = rows.reduce((acc, row) => {
    addToListMap(acc, row["Section/Column"], row);
    return acc;
  }, new Map<string, ExtendedAsanaRow[]>());

  const rowToSBLine = (row: ExtendedAsanaRow) => {
    if (row["Scrapbox"] === "") {
      return `Asana:[${row.Name} ${toAsanaUrl(row["Task ID"])}]`;
    }
    if (isSameTitle(row.Name, row.link)) {
      return `[${row.link}]([Asana ${toAsanaUrl(row["Task ID"])}])`;
    }
    return `[${row.link}](Asana:[${row.Name} ${toAsanaUrl(row["Task ID"])}])`;
  };

  const sbLines: string[] = [];
  for (const [section, rows] of rowGroups.entries()) {
    sbLines.push(`[* ${section === "" ? "その他" : section}]`);
    sbLines.push(...rows.map(rowToSBLine));
    sbLines.push("");
  }

  console.log(sbLines.join("\n"));
};

main();
