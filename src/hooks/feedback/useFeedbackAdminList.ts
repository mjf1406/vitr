import { useMemo } from "react";

import type { AdminFeedbackRow } from "@/components/feedback/admin-feedback-columns";
import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import { isSelfHosted } from "@/lib/selfHosted";
import { queryMeta } from "@/lib/instant/queryMeta";

export type FeedbackAdminListArgs = {
  archived: boolean;
};

export function useFeedbackAdminList(args: FeedbackAdminListArgs) {
  const cloud = !isSelfHosted();
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    cloud && user
      ? {
          feedback: {
            $: {
              where: { archivedAt: { $isNull: !args.archived } },
              order: { createdAt: "desc" },
            },
            user: { profile: {} },
            attachments: {},
          },
        }
      : null,
  );

  const data = useMemo<Array<AdminFeedbackRow>>(() => {
    if (!query.data) return [];
    return query.data.feedback.map((row) => {
      const author = first(row.user);
      const profile = author ? first(author.profile) : null;
      return {
        _id: row.id,
        type: row.type as "bug" | "feature" | "concern" | "other",
        title: String(row.title),
        body: String(row.body),
        stepsToReproduce: row.stepsToReproduce ?? undefined,
        expected: row.expected ?? undefined,
        actual: row.actual ?? undefined,
        severity: row.severity as "low" | "medium" | "high" | undefined,
        useCase: row.useCase ?? undefined,
        proposedSolution: row.proposedSolution ?? undefined,
        importance: row.importance as "nice" | "important" | "critical" | undefined,
        impact: row.impact ?? undefined,
        wantReply: row.wantReply,
        createdAt: row.createdAt,
        archivedAt: row.archivedAt ?? undefined,
        isSeed: row.isSeed ?? undefined,
        userId: author?.id ?? "",
        userEmail: author?.email ?? null,
        userName: profile?.name,
        attachments: (row.attachments ?? []).map((file) => ({
          fileId: file.id,
          name: file.path.split("/").pop() ?? file.path,
          contentType: "application/octet-stream",
          url: file.url,
        })),
      };
    });
  }, [query.data]);

  return { data, ...queryMeta(query, isAuthLoading) };
}
