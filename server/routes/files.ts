import { Hono } from "hono";
import { id } from "@instantdb/admin";

import { APP_CONFIG } from "../../shared/appConfig.ts";
import {
  detectContentType,
  isEnabledUploadPreset,
  validateDetectedContentType,
  validateUploadAgainstPreset,
  type UploadPresetKey,
} from "../../shared/uploadPresets.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { requirePermission } from "../membership.ts";
import { consumeRateLimit } from "../rateLimit.ts";

export const filesRoutes = new Hono();

filesRoutes.post("/finalize", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    consumeRateLimit("fileFinalize", user.id);
    consumeRateLimit("fileFinalizeGlobal", "global");
    const body = await readJson<{
      fileId: string;
      name: string;
      preset: UploadPresetKey;
      classId?: string;
      size: number;
      contentType?: string;
    }>(c.req.raw);
    if (!isEnabledUploadPreset(body.preset)) {
      throw new AppError("INVALID_UPLOAD_TYPE", "Unsupported upload type");
    }
    const sizeError = validateUploadAgainstPreset(body.preset, {
      size: body.size,
      contentType: body.contentType,
    });
    if (sizeError === "invalid_size") {
      throw new AppError("INVALID_UPLOAD_SIZE", "File is too large");
    }
    if (sizeError === "invalid_type") {
      throw new AppError("INVALID_UPLOAD_TYPE", "Unsupported file type");
    }
    if (body.classId) {
      await requirePermission(body.classId, user.id, "files:create");
    }
    const owned = await adminDb.query({
      fileRecords: { $: { where: { "owner.id": user.id } } },
    });
    const used = owned.fileRecords.reduce((sum, row) => sum + row.size, 0);
    if (used + body.size > APP_CONFIG.uploads.quotaBytes) {
      throw new AppError("QUOTA_EXCEEDED", "Storage quota exceeded");
    }
    const recordId = id();
    const tx = adminDb.tx.fileRecords[recordId]
      .update({
        name: body.name,
        contentType: body.contentType ?? "application/octet-stream",
        size: body.size,
        preset: body.preset,
        createdAt: Date.now(),
      })
      .link({ file: body.fileId, owner: user.id });
    await adminDb.transact(body.classId ? tx.link({ class: body.classId }) : tx);
    return c.json({ id: recordId, fileId: body.fileId });
  } catch (error) {
    return jsonError(error);
  }
});

filesRoutes.post("/validate-bytes", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ preset: UploadPresetKey; bytesBase64: string }>(c.req.raw);
    void user;
    const bytes = Uint8Array.from(atob(body.bytesBase64), (ch) => ch.charCodeAt(0));
    const detected = detectContentType(bytes);
    const invalid = validateDetectedContentType(body.preset, detected);
    if (invalid) {
      throw new AppError("INVALID_UPLOAD_CONTENT", "File content does not match the expected type");
    }
    return c.json({ contentType: detected });
  } catch (error) {
    return jsonError(error);
  }
});

filesRoutes.post("/delete", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ fileRecordId: string }>(c.req.raw);
    const data = await adminDb.query({
      fileRecords: {
        $: { where: { id: body.fileRecordId } },
        owner: {},
        file: {},
      },
    });
    const record = data.fileRecords[0];
    const owner = record ? (Array.isArray(record.owner) ? record.owner[0] : record.owner) : null;
    if (!record || owner?.id !== user.id) {
      throw new AppError("FORBIDDEN", "You cannot delete this file", 403);
    }
    const file = Array.isArray(record.file) ? record.file[0] : record.file;
    await adminDb.transact(adminDb.tx.fileRecords[record.id].delete());
    if (file?.path) {
      await adminDb.storage.delete(file.path);
    }
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});
