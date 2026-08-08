"use client";

import type { RefObject } from "react";
import { Upload } from "lucide-react";
import { SectionHeading } from "@/components/molecules/section-heading";
import { formatBytes } from "@/features/documents/lib/document-tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DocumentUploadPanel({
  channelName,
  maxFileSize,
  file,
  name,
  description,
  tags,
  inputRef,
  busy,
  onFileChange,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
  onUpload,
}: {
  channelName: string;
  maxFileSize: number;
  file: File | null;
  name: string;
  description: string;
  tags: string;
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  onFileChange: (file: File | null) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onUpload: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Upload attachment" title="Thêm tài liệu" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="discord-doc-upload">
            File tối đa {formatBytes(maxFileSize)}
          </FieldLabel>
          <Input
            ref={inputRef}
            id="discord-doc-upload"
            type="file"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Tên hiển thị</FieldLabel>
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={file?.name ?? "Tên tài liệu"}
            />
          </Field>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <Input
              value={tags}
              onChange={(event) => onTagsChange(event.target.value)}
              placeholder="srs, approved, v1"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Mô tả</FieldLabel>
          <Textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </Field>
        <FieldDescription>
          File sẽ được gửi vào #{channelName}; Tasks Dash lưu message ID và attachment
          ID để tải lại hoặc mở đúng message.
        </FieldDescription>
        <Button className="w-fit" disabled={busy || !file} onClick={onUpload}>
          <Upload data-icon="inline-start" /> Upload lên Discord
        </Button>
      </CardContent>
    </Card>
  );
}
