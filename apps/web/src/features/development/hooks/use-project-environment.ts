"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  envRowsToRecord,
  parseEnvText,
  recordToEnvRows,
  serializeEnvRows,
} from "@/features/development/lib/env";
import type { DevelopmentEnvVar } from "@/features/development/types";
import { apiRequest } from "@/lib/api/api-request";

export function useProjectEnvironment(
  projectKey: string,
  initialValues: Record<string, string>,
) {
  const [rows, setRows] = useState<DevelopmentEnvVar[]>(() =>
    recordToEnvRows(initialValues),
  );
  const [bulkText, setBulkText] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  function addRow(): void {
    setRows((previous) => [...previous, { key: "", value: "" }]);
  }

  function removeRow(index: number): void {
    setRows((previous) => previous.filter((_, current) => current !== index));
  }

  function updateRow(
    index: number,
    field: keyof DevelopmentEnvVar,
    value: string,
  ): void {
    setRows((previous) =>
      previous.map((row, current) =>
        current === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function importBulk(): void {
    const parsed = parseEnvText(bulkText);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setRows(parsed.rows);
    setBulkMode(false);
    setBulkText("");
    toast.success(`Đã import thành công ${parsed.rows.length} biến môi trường.`);
  }

  async function copyAll(): Promise<void> {
    await navigator.clipboard.writeText(serializeEnvRows(rows));
    setCopied(true);
    toast.success("Đã copy toàn bộ env vào clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyValue(label: string, value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}: ${value}`);
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/api/projects/${projectKey}/env`, {
        method: "POST",
        body: JSON.stringify(envRowsToRecord(rows)),
      });
      toast.success("Lưu cấu hình môi trường thành công");
    } catch {
      toast.error("Gặp lỗi khi lưu biến môi trường");
    } finally {
      setSaving(false);
    }
  }

  return {
    addRow,
    bulkMode,
    bulkText,
    copied,
    copyAll,
    copyValue,
    importBulk,
    removeRow,
    rows,
    save,
    saving,
    setBulkMode,
    setBulkText,
    updateRow,
  };
}
