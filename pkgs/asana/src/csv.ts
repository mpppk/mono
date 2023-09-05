import { z } from "zod";
import fs from "fs";
import * as Papa from "papaparse";
import { ParseResult } from "papaparse";

export const AsanaRow = z.object({
  "Task ID": z.string(),
  "Created At": z.string(),
  "Completed At": z.string(),
  "Last Modified": z.string(),
  Name: z.string(),
  "Section/Column": z.string(),
  Assignee: z.string(),
  "Assignee Email": z.string(),
  "Start Date": z.string(),
  "Due Date": z.string(),
  Tags: z.string(),
  Notes: z.string(),
  Projects: z.string(),
  "Parent task": z.string(),
  "Blocked By (Dependencies)": z.string(),
  "Blocking (Dependencies)": z.string(),
  Scrapbox: z.string(),
  リリース予定日: z.string(),
  進行状況: z.string(),
  レビュアー: z.string(),
  タスクの進捗: z.string(),
});
export type AsanaRow = z.infer<typeof AsanaRow>;

export const loadAsanaCsv = async (
  path: string
): Promise<ParseResult<AsanaRow>> => {
  const readFile = fs.promises.readFile;
  const contents = await readFile(path, "utf8");
  const results = Papa.parse<AsanaRow>(contents, {
    header: true,
    skipEmptyLines: true,
  });

  results.data.forEach((row) => AsanaRow.parse(row));
  return results;
};

export const writeCsvFile = async <T>(rows: T[], outFilePath: string) => {
  const csvStr = Papa.unparse(rows, {});
  const writeFile = fs.promises.writeFile;
  await writeFile(outFilePath, csvStr);
  return csvStr;
};
