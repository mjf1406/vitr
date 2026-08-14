import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { first } from "@/lib/instant/first";
import type { Id } from "@/lib/ids";
import type { ClassMemberPublic, MemberListRole } from "@/lib/members/members";
import { sanitizeAvatarUrl } from "../../../shared/avatarUrl";
import { queryMeta } from "@/lib/instant/queryMeta";

function matchesListRole(role: string, listRole: MemberListRole): boolean {
  if (listRole === "teacher") return role === "owner" || role === "teacher";
  return role === listRole;
}

export function useClassMembersByRole(classId: Id<"classes">, role: MemberListRole) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classMemberships: {
            $: { where: { "class.id": classId } },
            user: { profile: { avatar: {} } },
          },
          guardianStudentLinks: {
            $: { where: { "class.id": classId } },
            guardian: {},
            student: { profile: {} },
          },
        }
      : null,
  );

  const data = useMemo<Array<ClassMemberPublic>>(() => {
    if (!query.data) return [];
    const linksByGuardian = new Map<string, ClassMemberPublic["linkedStudents"]>();
    for (const link of query.data.guardianStudentLinks) {
      const guardian = first(link.guardian);
      const student = first(link.student);
      if (!guardian || !student) continue;
      const studentProfile = first(student.profile);
      const list = linksByGuardian.get(guardian.id) ?? [];
      list.push({
        userId: student.id,
        name: studentProfile?.name ?? undefined,
        email: student.email,
      });
      linksByGuardian.set(guardian.id, list);
    }

    return query.data.classMemberships.flatMap((membership) => {
      if (!matchesListRole(membership.role, role) || membership.suspended) return [];
      const member = first(membership.user);
      if (!member) return [];
      const profile = first(member.profile);
      const avatar = profile ? first(profile.avatar) : null;
      const memberRole = membership.role as ClassMemberPublic["role"];
      return [
        {
          userId: member.id,
          name: profile?.name ?? undefined,
          image: sanitizeAvatarUrl(avatar?.url) ?? undefined,
          email: member.email,
          role: memberRole,
          linkedStudents:
            memberRole === "guardian" ? (linksByGuardian.get(member.id) ?? []) : undefined,
        },
      ];
    });
  }, [query.data, role]);

  return { data, ...queryMeta(query, isAuthLoading) };
}
