import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import type { Id } from "@/lib/ids";

export const CLASS_PRESENCE_HEARTBEAT_MS = 30_000;

export type PresenceState = {
  userId: string;
  online: boolean;
  lastDisconnected?: number;
  name?: string;
  image?: string;
  data?: { name?: string; image?: string };
};

export function useClassPresence(
  classId: Id<"classes">,
  userId: Id<"users">,
): PresenceState[] | undefined {
  const room = useMemo(() => db.room("class", classId), [classId]);
  const { user, peers } = db.rooms.usePresence(room, {
    initialPresence: { userId },
  });

  return useMemo(() => {
    const self: PresenceState = {
      userId: user?.userId ?? userId,
      online: true,
    };
    const others = Object.values(peers).map((peer) => ({
      userId: peer.userId,
      online: true,
    }));
    return [self, ...others.filter((entry) => entry.userId !== self.userId)];
  }, [peers, user, userId]);
}
