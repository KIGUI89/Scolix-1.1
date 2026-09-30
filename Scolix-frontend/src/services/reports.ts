import { apiClient } from "../lib/apiClient";

async function downloadBlob(url: string, params: Record<string, string | undefined>, filename: string) {
  const res = await apiClient.get(url, { params, responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export function downloadRankingCsv(semesterId?: string) {
  return downloadBlob("/reports/ranking/csv/", { semester_id: semesterId }, "classement-enseignants.csv");
}

export function downloadTeacherPdf(teacherId: string, teacherName: string, semesterId?: string) {
  return downloadBlob(`/reports/teachers/${teacherId}/pdf/`, { semester_id: semesterId }, `fiche-${teacherName}.pdf`);
}

export function downloadRankingExcel(semesterId?: string) {
  return downloadBlob("/reports/ranking/excel/", { semester_id: semesterId }, "classement-enseignants.xlsx");
}
