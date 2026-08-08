"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  parseCommaSeparatedValues,
  serializeCommaSeparatedValues,
} from "@/lib/text-list";

export function TagInput({
  value,
  onChange,
  placeholder = "Nhập tag rồi ấn Enter…",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const tags = useMemo(() => parseCommaSeparatedValues(value), [value]);

  function commit(next: string): void {
    const candidate = next.trim().replaceAll(",", "");
    if (candidate && !tags.includes(candidate)) {
      onChange(serializeCommaSeparatedValues([...tags, candidate]));
    }
    setDraft("");
  }

  function remove(index: number): void {
    onChange(serializeCommaSeparatedValues(tags.filter((_, current) => current !== index)));
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 p-2">
          {tags.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 py-0.5 pl-2.5 pr-1 text-xs"
            >
              {tag}
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Xóa tag ${tag}`}
                  onClick={() => remove(index)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next.endsWith(",")) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          } else if (
            (event.key === "Backspace" || event.key === "Delete") &&
            !draft &&
            tags.length > 0
          ) {
            event.preventDefault();
            remove(tags.length - 1);
          }
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
