import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyCourses, listMySubmissions } from "../services/evaluations";

export type TaskState = "À faire" | "Brouillon" | "Terminée";

export interface StudentTask {
  /** Identifiant unique de la tâche — un cours avec un prof secondaire produit
   * deux tâches distinctes (`course_id`, `teacher_id` chacune), d'où `${course_id}:${teacher_id}`. */
  task_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  teacher_id: string;
  teacher_name: string;
  is_secondary_teacher: boolean;
  campaign_id: string;
  campaign_title: string;
  state: TaskState;
  tag: string;
  cta: string;
  dueText: string;
  daysLeft: number | null;
  submissionId: string | null;
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Derives each followed course's evaluation state (À faire / Brouillon / Terminée) from real backend data, shared across the student home, todo and report screens. */
export function useStudentTasks() {
  const coursesQuery = useQuery({ queryKey: ["my-courses"], queryFn: getMyCourses });
  const submissionsQuery = useQuery({ queryKey: ["my-submissions"], queryFn: listMySubmissions });

  const tasks = useMemo<StudentTask[]>(() => {
    const courses = coursesQuery.data ?? [];
    const submissions = submissionsQuery.data ?? [];
    const submissionByTask = new Map(
      submissions.filter((s) => s.status === "SUBMITTED").map((s) => [`${s.course}:${s.teacher}`, s])
    );
    const now = Date.now();

    return courses.map((c) => {
      const taskId = `${c.course_id}:${c.teacher_id}`;
      const base = {
        task_id: taskId,
        course_id: c.course_id,
        course_name: c.course_name,
        course_code: c.course_code,
        teacher_id: c.teacher_id,
        teacher_name: c.teacher_name,
        is_secondary_teacher: c.is_secondary_teacher,
        campaign_id: c.campaign_id,
        campaign_title: c.campaign_title,
      };

      if (c.already_submitted) {
        const submission = submissionByTask.get(taskId);
        return {
          ...base,
          state: "Terminée" as const,
          tag: "tag-info",
          cta: "Voir",
          dueText: submission?.submitted_at ? `envoyée le ${fmtShort(submission.submitted_at)}` : "envoyée",
          daysLeft: null,
          submissionId: submission?.id ?? null,
        };
      }

      const daysLeft = Math.ceil((new Date(c.campaign_end_date).getTime() - now) / 86400000);
      return {
        ...base,
        state: (c.has_draft ? "Brouillon" : "À faire") as TaskState,
        tag: c.has_draft ? "tag-surv" : "tag-crit",
        cta: c.has_draft ? "Reprendre" : "Évaluer",
        dueText: daysLeft > 0 ? `clôture dans ${daysLeft} j` : daysLeft === 0 ? "clôture aujourd'hui" : "clôturée",
        daysLeft,
        submissionId: null,
      };
    });
  }, [coursesQuery.data, submissionsQuery.data]);

  return {
    tasks,
    submissions: submissionsQuery.data ?? [],
    isLoading: coursesQuery.isLoading || submissionsQuery.isLoading,
  };
}
