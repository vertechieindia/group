"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, Select } from "@vertechie/ui";
import { timesheetApi } from "@/features/timesheets/api";
import { createBrowserSupabaseClient } from "@/features/timesheets/supabase-browser";

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

export function AttachmentUploader({ timesheetId, entityId, employeeId }: { timesheetId: string; entityId: string; employeeId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState("client_approved_timecard");
  const [isUploading, setIsUploading] = useState(false);

  async function upload() {
    if (!file) return;
    if (!allowedTypes.has(file.type)) throw new Error("Unsupported file type.");
    setIsUploading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${entityId}/${employeeId}/${timesheetId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("timesheet-attachments").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      await timesheetApi.attach(timesheetId, {
        fileName: file.name,
        filePath: path,
        fileType: file.type,
        fileSize: file.size,
        attachmentType
      });
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-[1fr_220px_auto]">
      <input
        aria-label="Upload client approved timecard"
        className="text-sm"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
        <option value="client_approved_timecard">Client timecard</option>
        <option value="supporting_document">Supporting document</option>
        <option value="other">Other</option>
      </Select>
      <Button disabled={!file || isUploading} onClick={upload}><Upload className="size-4" />Upload</Button>
    </div>
  );
}
