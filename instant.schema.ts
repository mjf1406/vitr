import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    profiles: i.entity({
      name: i.string().optional(),
      language: i.string().indexed(),
      isAppAdmin: i.boolean().indexed(),
      createdAt: i.date().indexed(),
    }),
    classes: i.entity({
      name: i.string(),
      year: i.number().indexed(),
      description: i.string().optional(),
      icon: i.string().optional(),
      updatedAt: i.date().indexed(),
      archivedAt: i.date().indexed().optional(),
    }),
    classMemberships: i.entity({
      role: i.string().indexed(),
      suspended: i.boolean().indexed(),
      createdAt: i.date().indexed(),
    }),
    joinCodes: i.entity({
      code: i.string().unique().indexed(),
      role: i.string().indexed(),
      expiresAt: i.number().indexed(),
      maxUses: i.number(),
      useCount: i.number(),
      createdAt: i.date().indexed(),
    }),
    trialGrants: i.entity({
      emailKey: i.string().unique().indexed(),
      startedAt: i.number().indexed(),
      endsAt: i.number().indexed(),
      expiredAt: i.number().indexed().optional(),
    }),
    fileRecords: i.entity({
      name: i.string(),
      contentType: i.string(),
      size: i.number(),
      preset: i.string().indexed(),
      createdAt: i.date().indexed(),
    }),
    guardianStudentLinks: i.entity({
      createdAt: i.date().indexed(),
    }),
    anonymousUsageEvents: i.entity({
      kind: i.string().indexed(),
      os: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
    }),
    githubCloneDays: i.entity({
      dayKey: i.string().unique().indexed(),
      dayStartMs: i.number().indexed(),
      rawCount: i.number(),
      ciSubtracted: i.number(),
      count: i.number(),
      uniques: i.number(),
      syncedAt: i.number(),
    }),
    usageCounters: i.entity({
      bucket: i.string().unique().indexed(),
      count: i.number(),
    }),
    subscriptions: i.entity({
      polarId: i.string().unique().indexed(),
      status: i.string().indexed(),
      productId: i.string().indexed(),
      productKey: i.string().optional(),
      productName: i.string().optional(),
      amount: i.number().optional(),
      currency: i.string().optional(),
      recurringInterval: i.string().optional(),
      currentPeriodStart: i.string().optional(),
      currentPeriodEnd: i.string().optional(),
      startedAt: i.string().optional(),
      cancelAtPeriodEnd: i.boolean(),
      canceledAt: i.string().optional(),
      endsAt: i.string().optional(),
      updatedAt: i.number().indexed(),
    }),
    feedback: i.entity({
      type: i.string().indexed(),
      title: i.string(),
      body: i.string(),
      stepsToReproduce: i.string().optional(),
      expected: i.string().optional(),
      actual: i.string().optional(),
      severity: i.string().optional(),
      useCase: i.string().optional(),
      proposedSolution: i.string().optional(),
      importance: i.string().optional(),
      impact: i.string().optional(),
      wantReply: i.boolean(),
      createdAt: i.number().indexed(),
      archivedAt: i.number().indexed().optional(),
      isSeed: i.boolean().indexed().optional(),
    }),
  },
  links: {
    profileUser: {
      forward: { on: "profiles", has: "one", label: "$user", required: true, onDelete: "cascade" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    profileAvatar: {
      forward: { on: "profiles", has: "one", label: "avatar" },
      reverse: { on: "$files", has: "many", label: "profileAvatars" },
    },
    classOwner: {
      forward: { on: "classes", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "ownedClasses" },
    },
    classBanner: {
      forward: { on: "classes", has: "one", label: "banner" },
      reverse: { on: "$files", has: "many", label: "classBanners" },
    },
    membershipClass: {
      forward: {
        on: "classMemberships",
        has: "one",
        label: "class",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "classes", has: "many", label: "memberships" },
    },
    membershipUser: {
      forward: {
        on: "classMemberships",
        has: "one",
        label: "user",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "$users", has: "many", label: "memberships" },
    },
    joinCodeClass: {
      forward: {
        on: "joinCodes",
        has: "one",
        label: "class",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "classes", has: "many", label: "joinCodes" },
    },
    joinCodeCreator: {
      forward: { on: "joinCodes", has: "one", label: "createdBy", required: true },
      reverse: { on: "$users", has: "many", label: "createdJoinCodes" },
    },
    trialGrantUser: {
      forward: { on: "trialGrants", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "trialGrant" },
    },
    fileRecordFile: {
      forward: {
        on: "fileRecords",
        has: "one",
        label: "file",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "$files", has: "one", label: "record" },
    },
    fileRecordOwner: {
      forward: { on: "fileRecords", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "files" },
    },
    fileRecordClass: {
      forward: { on: "fileRecords", has: "one", label: "class", onDelete: "cascade" },
      reverse: { on: "classes", has: "many", label: "files" },
    },
    guardianLinkClass: {
      forward: {
        on: "guardianStudentLinks",
        has: "one",
        label: "class",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "classes", has: "many", label: "guardianLinks" },
    },
    guardianLinkGuardian: {
      forward: {
        on: "guardianStudentLinks",
        has: "one",
        label: "guardian",
        required: true,
      },
      reverse: { on: "$users", has: "many", label: "guardianOf" },
    },
    guardianLinkStudent: {
      forward: {
        on: "guardianStudentLinks",
        has: "one",
        label: "student",
        required: true,
      },
      reverse: { on: "$users", has: "many", label: "studentsOf" },
    },
    guardianLinkCreatedBy: {
      forward: { on: "guardianStudentLinks", has: "one", label: "createdBy", required: true },
      reverse: { on: "$users", has: "many", label: "createdGuardianLinks" },
    },
    subscriptionUser: {
      forward: {
        on: "subscriptions",
        has: "one",
        label: "user",
        required: true,
        onDelete: "cascade",
      },
      reverse: { on: "$users", has: "many", label: "subscriptions" },
    },
    feedbackAuthor: {
      forward: { on: "feedback", has: "one", label: "user", required: true },
      reverse: { on: "$users", has: "many", label: "feedback" },
    },
    feedbackAttachments: {
      forward: { on: "feedback", has: "many", label: "attachments" },
      reverse: { on: "$files", has: "many", label: "feedbackItems" },
    },
  },
  rooms: {
    class: {
      presence: i.entity({
        userId: i.string(),
      }),
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
