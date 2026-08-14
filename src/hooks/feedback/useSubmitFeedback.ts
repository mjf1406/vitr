import { id } from "@instantdb/react";
import { useTranslation } from "react-i18next";

import { db } from "@/lib/instant/db";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { toast } from "@/components/ui/toast-manager";
import { messageFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import type {
  FeedbackType,
  FeedbackImportance,
  FeedbackSeverity,
} from "@/lib/feedback/feedbackFormSchema";

export type SubmitFeedbackArgs = {
  type: FeedbackType;
  title: string;
  body: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  severity?: FeedbackSeverity;
  useCase?: string;
  proposedSolution?: string;
  importance?: FeedbackImportance;
  impact?: string;
  wantReply: boolean;
  attachmentFileIds: Id<"files">[];
};

export function useSubmitFeedback() {
  const { t } = useTranslation("feedback");
  const { t: tCommon } = useTranslation("common");
  const { user } = db.useAuth();

  return useAsyncAction(
    async (args: SubmitFeedbackArgs) => {
      if (!user) throw new Error("Not authenticated");
      const feedbackId = id();
      await db.transact(
        db.tx.feedback[feedbackId]
          .update({
            type: args.type,
            title: args.title,
            body: args.body,
            stepsToReproduce: args.stepsToReproduce,
            expected: args.expected,
            actual: args.actual,
            severity: args.severity,
            useCase: args.useCase,
            proposedSolution: args.proposedSolution,
            importance: args.importance,
            impact: args.impact,
            wantReply: args.wantReply,
            createdAt: Date.now(),
          })
          .link({
            user: user.id,
            ...(args.attachmentFileIds.length > 0 ? { attachments: args.attachmentFileIds } : {}),
          }),
      );
    },
    {
      onError: (error) => {
        toast.add({
          title: messageFromError(error, t("submitFailed"), tCommon("rateLimited")),
          type: "error",
        });
      },
    },
  );
}
