import { z } from "zod";
import fs from "fs";
import * as Papa from "papaparse";
import { ParseResult } from "papaparse";

const toNullishDate = (s: string) => {
  if (s === "") {
    return null;
  }
  return new Date(s);
};

export const AsanaRow = z.object({
  "Task ID": z.string(),
  "Created At": z.coerce.date(),
  "Completed At": z.string().transform(toNullishDate),
  "Last Modified": z.coerce.date(),
  Name: z.string(),
  "Section/Column": z.string(),
  Assignee: z.string(),
  "Assignee Email": z.string(),
  "Start Date": z.string().transform(toNullishDate),
  "Due Date": z.string().transform(toNullishDate),
  Tags: z.string(),
  Notes: z.string(),
  Projects: z.string(),
  "Parent task": z.string(),
  "Blocked By (Dependencies)": z.string(),
  "Blocking (Dependencies)": z.string(),
  Scrapbox: z.string(),
  リリース予定日: z.string().transform(toNullishDate),
  進行状況: z.string(),
  レビュアー: z.string(),
  タスクの進捗: z.string(),
});
export type AsanaRow = z.infer<typeof AsanaRow>;

export type ExtendedAsanaRow = AsanaRow & {
  link: string;
};

export const loadAsanaCsv = async (
  path: string
): Promise<ParseResult<AsanaRow>> => {
  const readFile = fs.promises.readFile;
  const contents = await readFile(path, "utf8");
  const results = Papa.parse<AsanaRow>(contents, {
    header: true,
    skipEmptyLines: true,
  });

  results.data = results.data.map((row) => AsanaRow.parse(row));
  return results;
};

export const writeCsvFile = async <T>(rows: T[], outFilePath: string) => {
  const csvStr = Papa.unparse(rows, {});
  const writeFile = fs.promises.writeFile;
  await writeFile(outFilePath, csvStr);
  return csvStr;
};
