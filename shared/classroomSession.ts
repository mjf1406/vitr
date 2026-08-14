export type ClassroomSessionStatus = "starting" | "running" | "deploying" | "error" | "stopped";

export type ClassroomSession = {
  status: ClassroomSessionStatus;
  lanBaseUrl: string | null;
  loopbackBaseUrl: string;
  instantApiUri: string;
  adminUrl: string;
  webPort: number;
  instantPort: number;
  adminPort: number;
  lanIp: string | null;
  errorMessage: string | null;
  trustedLanWarning: boolean;
};

export const CLASSROOM_IPC = {
  getSession: "classroom:getSession",
  onSession: "classroom:onSession",
} as const;
