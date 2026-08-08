"use client";

import type { ComponentProps } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface LinkFieldRow {
  id: string;
}

export function LinkFieldArray({
  title,
  emptyText,
  fields,
  labelPlaceholder,
  urlPlaceholder,
  removeLabel,
  onAppend,
  onRemove,
  labelInputProps,
  urlInputProps,
}: {
  title: string;
  emptyText: string;
  fields: LinkFieldRow[];
  labelPlaceholder: string;
  urlPlaceholder: string;
  removeLabel: string;
  onAppend: () => void;
  onRemove: (index: number) => void;
  labelInputProps: (index: number) => ComponentProps<"input">;
  urlInputProps: (index: number) => ComponentProps<"input">;
}) {
  return (
    <FieldSet>
      <FieldLegend>{title}</FieldLegend>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" type="button" onClick={onAppend}>
          <Plus data-icon="inline-start" /> Thêm link
        </Button>
      </div>
      {fields.length === 0 ? (
        <FieldDescription>{emptyText}</FieldDescription>
      ) : (
        <div className="grid gap-3">
          {fields.map((field, index) => (
            <div
              className="grid gap-2 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.6fr)_auto]"
              key={field.id}
            >
              <Input {...labelInputProps(index)} placeholder={labelPlaceholder} />
              <Input {...urlInputProps(index)} placeholder={urlPlaceholder} />
              <Button
                variant="destructive"
                size="icon"
                type="button"
                aria-label={removeLabel}
                onClick={() => onRemove(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </FieldSet>
  );
}
