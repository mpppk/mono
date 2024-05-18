import { ApiEndpoints, MergeApiResponses, Method } from "./index";

interface TRequestInit<M extends Method> extends RequestInit {
  method?: M;
}

type UrlSchema = "http" | "https" | "about" | "blob" | "data" | "file";
type UrlPrefix = `${UrlSchema}://` | "";
type URL = `${UrlPrefix}${string}`;
export type TFetch<Origin extends URL, E extends ApiEndpoints> = <
  Path extends keyof E & string,
  M extends Method,
>(
  input: `${Origin}${Path}`,
  init?: TRequestInit<M>,
  // FIXME: NonNullable
) => Promise<MergeApiResponses<NonNullable<E[Path][M]>["res"]>>;
