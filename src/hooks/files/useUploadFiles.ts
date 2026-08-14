import { useCallback, useMemo, useRef, useState } from "react";

import { adminPost } from "@/lib/api/admin";
import { db } from "@/lib/instant/db";
import { codeFromError } from "@/lib/errors/convexError";
import type { Id } from "@/lib/ids";
import { randomClientId } from "@/lib/optimistic";
import type { UploadPresetKey, UploadPreset } from "@/lib/upload/acceptPresets";
import { getUploadPreset } from "@/lib/upload/acceptPresets";

export type UploadFileStatus = "queued" | "uploading" | "done" | "error" | "aborted";

export type UploadErrorCode =
  | "invalid_type"
  | "invalid_size"
  | "invalid_content"
  | "quota_exceeded"
  | "upload_failed"
  | "finalize_failed"
  | "aborted";

export type UploadFileItem = {
  id: string;
  file: File;
  status: UploadFileStatus;
  progress: number;
  attempt: number;
  storageId?: Id<"_storage">;
  fileId?: Id<"files">;
  errorCode?: UploadErrorCode;
};

function createUploadId() {
  return randomClientId();
}

function getFileExtension(file: File): string | null {
  const name = file.name.toLowerCase();
  const idx = name.lastIndexOf(".");
  if (idx === -1) return null;
  return name.slice(idx);
}

function finalizeErrorCode(error: unknown): UploadErrorCode {
  const code = codeFromError(error);
  if (code === "INVALID_UPLOAD_SIZE") return "invalid_size";
  if (code === "INVALID_UPLOAD_TYPE") return "invalid_type";
  if (code === "INVALID_UPLOAD_CONTENT") return "invalid_content";
  if (code === "QUOTA_EXCEEDED") return "quota_exceeded";
  return "finalize_failed";
}

export function useUploadFiles(
  presetKey: UploadPresetKey = "images",
  options?: { classId?: Id<"classes"> },
) {
  const preset = useMemo<UploadPreset>(() => getUploadPreset(presetKey), [presetKey]);
  const classId = options?.classId;
  const { user } = db.useAuth();

  const [items, setItems] = useState<UploadFileItem[]>([]);
  const itemsRef = useRef<UploadFileItem[]>([]);

  const setItemsSync = useCallback((updater: (prev: UploadFileItem[]) => UploadFileItem[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const processingRef = useRef(false);
  const classIdRef = useRef(classId);
  const presetKeyRef = useRef(presetKey);
  const userIdRef = useRef(user?.id);
  classIdRef.current = classId;
  presetKeyRef.current = presetKey;
  userIdRef.current = user?.id;

  const getNextQueuedItem = () => itemsRef.current.find((item) => item.status === "queued") ?? null;

  const uploadOne = useCallback(
    async (item: UploadFileItem): Promise<void> => {
      setItemsSync((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "uploading", progress: 0, errorCode: undefined }
            : it,
        ),
      );
      try {
        const userId = userIdRef.current;
        if (!userId) {
          throw new Error("Not authenticated");
        }
        const activeClassId = classIdRef.current;
        const path = activeClassId
          ? `classes/${activeClassId}/${userId}/${item.id}-${item.file.name}`
          : `users/${userId}/${item.id}-${item.file.name}`;
        const uploaded = await db.storage.uploadFile(path, item.file, {
          contentType: item.file.type || "application/octet-stream",
        });
        setItemsSync((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, progress: 80 } : it)),
        );
        const finalized = await adminPost<{ id: string; fileId: string }>("/api/files/finalize", {
          fileId: uploaded.data.id,
          name: item.file.name,
          preset: presetKeyRef.current,
          size: item.file.size,
          contentType: item.file.type,
          ...(activeClassId !== undefined ? { classId: activeClassId } : {}),
        });
        setItemsSync((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: "done",
                  storageId: uploaded.data.id,
                  fileId: finalized.fileId,
                  progress: 100,
                }
              : it,
          ),
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "upload_failed";
        let errorCode: UploadErrorCode;
        if (message === "aborted") {
          errorCode = "aborted";
        } else if (codeFromError(e) !== undefined) {
          errorCode = finalizeErrorCode(e);
        } else {
          errorCode = "upload_failed";
        }
        setItemsSync((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: errorCode === "aborted" ? "aborted" : "error",
                  errorCode,
                }
              : it,
          ),
        );
      }
    },
    [setItemsSync],
  );

  const uploadOneRef = useRef(uploadOne);
  uploadOneRef.current = uploadOne;

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (true) {
        const next = getNextQueuedItem();
        if (!next) break;
        await uploadOneRef.current(next);
      }
    } finally {
      processingRef.current = false;
    }
    if (getNextQueuedItem()) {
      void processQueue();
    }
  }, []);

  const validateFile = useCallback(
    (file: File): UploadErrorCode | null => {
      if (file.size > preset.maxSizeBytes) return "invalid_size";
      if (preset.allowedExtensions.length > 0) {
        const ext = getFileExtension(file);
        if (!ext || !preset.allowedExtensions.includes(ext)) return "invalid_type";
      }
      return null;
    },
    [preset],
  );

  const uploadFiles = useCallback(
    (files: readonly File[]) => {
      const newItems: UploadFileItem[] = files.map((file) => {
        const errorCode = validateFile(file);
        const id = createUploadId();
        if (errorCode) {
          return { id, file, status: "error", progress: 0, attempt: 1, errorCode };
        }
        return { id, file, status: "queued", progress: 0, attempt: 1 };
      });
      setItemsSync((prev) => [...prev, ...newItems]);
      void processQueue();
    },
    [processQueue, setItemsSync, validateFile],
  );

  const abortFile = useCallback(
    (id: string) => {
      setItemsSync((prev) =>
        prev.map((it) =>
          it.id === id && it.status === "queued"
            ? { ...it, status: "aborted", errorCode: "aborted" }
            : it,
        ),
      );
    },
    [setItemsSync],
  );

  const retryFile = useCallback(
    (id: string) => {
      setItemsSync((prev) =>
        prev.map((it) =>
          it.id === id && (it.status === "error" || it.status === "aborted")
            ? {
                ...it,
                status: "queued",
                progress: 0,
                attempt: it.attempt + 1,
                errorCode: undefined,
              }
            : it,
        ),
      );
      void processQueue();
    },
    [processQueue, setItemsSync],
  );

  return {
    items,
    uploadFiles,
    abortFile,
    retryFile,
    isUploading: items.some((item) => item.status === "uploading"),
  };
}
