"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function InlineEditableText({
  value,
  onSave,
  multiline = false,
  placeholder = "Nhấp để chỉnh sửa…",
  className,
  disabled = false,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function commit(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      void commit();
    }
    if (event.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing && !disabled) {
    const shared = {
      value: draft,
      onChange: (
        event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
      ) => setDraft(event.target.value),
      onBlur: () => void commit(),
      onKeyDown,
      disabled: saving,
      className: cn(
        "w-full resize-none rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm ring-2 ring-primary/20 focus:outline-none",
        className,
      ),
    };
    return multiline ? (
      <textarea
        {...shared}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        rows={4}
      />
    ) : (
      <input {...shared} ref={ref as React.Ref<HTMLInputElement>} type="text" />
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setEditing(true)}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setEditing(true);
        }
      }}
      className={cn(
        "group relative rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30",
        disabled ? "cursor-default" : "cursor-text hover:bg-muted/30",
        !value && "italic text-muted-foreground",
        className,
      )}
    >
      {value || placeholder}
      {!disabled ? (
        <Pencil className="absolute right-2 top-2.5 size-3 text-muted-foreground opacity-0 transition group-hover:opacity-60" />
      ) : null}
    </div>
  );
}

export function InlineEditableNumber({
  value,
  onSave,
  placeholder = "—",
  disabled = false,
}: {
  value?: number;
  onSave: (next: number | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value?.toString() ?? ""), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function commit(): Promise<void> {
    const parsed = draft === "" ? null : Number.parseInt(draft, 10);
    setEditing(false);
    await onSave(parsed !== null && Number.isNaN(parsed) ? null : parsed);
  }

  if (editing && !disabled) {
    return (
      <input
        ref={ref}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") {
            setDraft(value?.toString() ?? "");
            setEditing(false);
          }
        }}
        className="w-20 rounded border border-primary/40 bg-background px-2 py-0.5 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setEditing(true)}
      className={cn(
        "rounded px-1 font-mono text-sm font-semibold",
        disabled ? "cursor-default" : "cursor-text hover:bg-muted/40",
      )}
    >
      {value !== undefined ? (
        value
      ) : (
        <span className="text-sm italic text-muted-foreground">{placeholder}</span>
      )}
    </button>
  );
}

export function InlineEditableDate({
  value,
  onSave,
  placeholder = "Chọn ngày",
  disabled = false,
}: {
  value?: string;
  onSave: (next: string | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const dateValue = value ? new Date(value) : undefined;

  if (disabled) {
    return (
      <span
        className={cn(
          "text-sm font-medium",
          !dateValue && "italic text-muted-foreground",
        )}
      >
        {dateValue ? format(dateValue, "PPP", { locale: vi }) : placeholder}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto justify-start rounded px-1 py-0 text-left text-sm font-medium hover:bg-muted/40",
            !dateValue && "italic text-muted-foreground",
          )}
          type="button"
        >
          {dateValue ? format(dateValue, "PPP", { locale: vi }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            void onSave(date ? format(date, "yyyy-MM-dd") : null);
          }}
          defaultMonth={dateValue}
          locale={vi}
        />
      </PopoverContent>
    </Popover>
  );
}
