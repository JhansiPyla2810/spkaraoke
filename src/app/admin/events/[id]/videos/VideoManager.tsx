"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestUploadSession, finishUpload, deleteVideo, renameVideo } from "./actions";

type FileItem = { id: string; name: string; mimeType: string; size?: string };

function formatSize(bytes?: string) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (Number.isNaN(n)) return "";
  const mb = n / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function uploadWithProgress(uploadUrl: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

function UploadRow({
  file,
  eventId,
  onDone,
}: {
  file: File;
  eventId: number;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const { uploadUrl } = await requestUploadSession(eventId, file.name, file.type || "video/mp4");
        await uploadWithProgress(uploadUrl, file, setProgress);
        await finishUpload(eventId);
      } catch (e) {
        // The file may well have reached Drive even if this request itself
        // timed out or errored client-side (common for large files, since
        // Drive can take a while to respond after it finishes receiving the
        // bytes) — refresh the list either way so the true state shows up,
        // and phrase this as "check below" rather than a hard failure.
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        onDone();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: ".85rem" }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {file.name}
      </span>
      {error ? (
        <span style={{ color: "#B02A37", flexShrink: 0 }} title={error}>
          {progress === 100
            ? "May not have finished — check list"
            : "Interrupted — try again"}
        </span>
      ) : (
        <span style={{ color: "var(--muted)", flexShrink: 0 }}>{progress}%</span>
      )}
    </div>
  );
}

function FileRow({ file, eventId }: { file: FileItem; eventId: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <tr>
      <td>
        {editing ? (
          <form
            action={(formData) => {
              startTransition(async () => {
                await renameVideo(formData);
                setEditing(false);
                router.refresh();
              });
            }}
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="fileId" value={file.id} />
            <input
              name="newName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{ fontSize: ".85rem", padding: "4px 8px", flex: "1 1 160px", minWidth: 0 }}
            />
            <button className="btn btn-primary" type="submit" disabled={isPending}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          file.name
        )}
      </td>
      <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>{formatSize(file.size)}</td>
      <td>
        {!editing && (
          <>
            <button
              onClick={() => setEditing(true)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, marginRight: 14 }}
            >
              Rename
            </button>
            <form
              action={(formData) => {
                if (!confirm(`Delete "${file.name}"? This can't be undone.`)) return;
                startTransition(async () => {
                  await deleteVideo(formData);
                  router.refresh();
                });
              }}
              style={{ display: "inline" }}
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="fileId" value={file.id} />
              <button
                type="submit"
                disabled={isPending}
                style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
              >
                Delete
              </button>
            </form>
          </>
        )}
      </td>
    </tr>
  );
}

export default function VideoManager({ eventId, files }: { eventId: number; files: FileItem[] }) {
  const [uploading, setUploading] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) setUploading((prev) => [...prev, ...picked]);
            e.target.value = "";
          }}
        />
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Upload videos
        </button>
      </div>

      {uploading.length > 0 && (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {uploading.map((f, i) => (
            <UploadRow
              key={`${f.name}-${i}`}
              file={f}
              eventId={eventId}
              onDone={() => {
                setUploading((prev) => prev.filter((x) => x !== f));
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="emptystate">No files in this folder yet.</div>
                </td>
              </tr>
            ) : (
              files.map((f) => <FileRow key={f.id} file={f} eventId={eventId} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
