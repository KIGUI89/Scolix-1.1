import { NAV_GROUPS } from "./nav";
import { PAGE_META, type PageMeta } from "./pageMeta";

const PATH_TO_ID: Record<string, string> = {};
for (const g of NAV_GROUPS) {
  for (const it of g.items) {
    PATH_TO_ID[it.path] = it.id;
  }
}
// Routes without a dedicated sidebar entry but that still need chrome + a page title.
PATH_TO_ID["/direction"] = "direction";
PATH_TO_ID["/evaluer"] = "eval";

export function metaForPath(pathname: string): PageMeta {
  if (pathname.startsWith("/enseignants/")) return PAGE_META.teacherDetail;
  if (pathname.startsWith("/signalements/")) return PAGE_META.signalements;
  if (pathname.startsWith("/modules-evalues/")) return PAGE_META.teaModules;
  const id = PATH_TO_ID[pathname];
  return (id && PAGE_META[id]) || { kicker: "", title: "Scolix", subtitle: "" };
}
