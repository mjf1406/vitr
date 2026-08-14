import { Hono } from "hono";
import { cors } from "hono/cors";

import { startCrons } from "./crons.ts";
import { accountRoutes } from "./routes/account.ts";
import { adminRoutes } from "./routes/admin.ts";
import { billingRoutes } from "./routes/billing.ts";
import { classesRoutes } from "./routes/classes.ts";
import { feedbackRoutes } from "./routes/feedback.ts";
import { filesRoutes } from "./routes/files.ts";
import { joinCodesRoutes } from "./routes/joinCodes.ts";
import { membersRoutes } from "./routes/members.ts";
import { usageRoutes } from "./routes/usage.ts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/account", accountRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/classes", classesRoutes);
app.route("/api/feedback", feedbackRoutes);
app.route("/api/members", membersRoutes);
app.route("/api/join-codes", joinCodesRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/files", filesRoutes);
app.route("/api/usage", usageRoutes);

const port = Number(process.env.ADMIN_PORT ?? process.env.PORT ?? 8787);

startCrons();

export default {
  port,
  fetch: app.fetch,
};

console.log(`Admin server listening on :${port}`);
