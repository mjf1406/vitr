import type { InstantRules } from "@instantdb/react";

const isAuthenticated = "auth.id != null";
const isSelf = "auth.id == data.id";
const isOwnProfile = "auth.id in data.ref('$user.id')";
const isClassMember = "auth.id in data.ref('memberships.user.id')";
const isClassOwner = "auth.id in data.ref('owner.id')";
const isFileOwner = "auth.id in data.ref('owner.id')";
const isFileClassMember = "auth.id in data.ref('class.memberships.user.id')";
const isClassScopeMember = "auth.id in data.ref('class.memberships.user.id')";

const rules = {
  attrs: {
    allow: {
      $default: "false",
    },
  },
  $users: {
    allow: {
      view: "true",
      create: "true",
      update: "false",
    },
    fields: {
      email: isSelf,
    },
  },
  $files: {
    allow: {
      view: `${isAuthenticated} && (data.path.startsWith('users/' + auth.id + '/') || data.path.startsWith('classes/'))`,
      create: `${isAuthenticated} && (data.path.startsWith('users/' + auth.id + '/') || data.path.startsWith('classes/'))`,
      delete: `${isAuthenticated} && data.path.startsWith('users/' + auth.id + '/')`,
      update: "false",
    },
  },
  profiles: {
    allow: {
      view: isAuthenticated,
      create: isOwnProfile,
      update: isOwnProfile,
      delete: "false",
    },
  },
  classes: {
    allow: {
      view: isClassMember,
      create: "false",
      update: isClassOwner,
      delete: "false",
    },
  },
  classMemberships: {
    allow: {
      view: `auth.id in data.ref('user.id') || ${isClassScopeMember}`,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  joinCodes: {
    allow: {
      view: isClassScopeMember,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  trialGrants: {
    allow: {
      view: "auth.id in data.ref('user.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  fileRecords: {
    allow: {
      view: `${isFileOwner} || ${isFileClassMember}`,
      create: isFileOwner,
      update: isFileOwner,
      delete: isFileOwner,
    },
  },
  guardianStudentLinks: {
    allow: {
      view: isClassScopeMember,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  anonymousUsageEvents: {
    allow: {
      view: isAuthenticated,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  githubCloneDays: {
    allow: {
      view: isAuthenticated,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  usageCounters: {
    allow: {
      view: isAuthenticated,
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  subscriptions: {
    allow: {
      view: "auth.id in data.ref('user.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  feedback: {
    allow: {
      view: "auth.id in data.ref('user.id') || auth.ref('$user.profile.isAppAdmin')[0] == true",
      create: `${isAuthenticated} && auth.id in data.ref('user.id')`,
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
