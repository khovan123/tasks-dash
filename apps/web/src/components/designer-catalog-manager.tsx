"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DESIGN_CATALOG_TYPES } from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { ExternalLink, Figma, Plus, Trash2 } from "lucide-react";
import {
  DesignCatalogFormValues,
  designCatalogSchema,
} from "@/features/design-catalog/schemas/design-catalog.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

interface DesignCatalogItem {
  _id: string;
  name: string;
  type: string;
  figmaUrl: string;
  description: string;
  tags: string[];
}

export function DesignerCatalogManager({
  projectKey,
  items,
}: {
  projectKey: string;
  items: DesignCatalogItem[];
}) {
  const router = useRouter();
  const form = useForm<DesignCatalogFormValues>({
    resolver: zodResolver(designCatalogSchema),
    defaultValues: {
      name: "",
      type: DESIGN_CATALOG_TYPES.figmaComponent,
      figmaUrl: "",
      description: "",
      tags: "",
    },
  });

  async function submit(values: DesignCatalogFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(`/api/projects/${projectKey}/design-catalog`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          figmaUrl: values.figmaUrl,
          description: values.description,
          tags: values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      form.reset({
        name: "",
        type: DESIGN_CATALOG_TYPES.figmaComponent,
        figmaUrl: "",
        description: "",
        tags: "",
      });
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể thêm Figma vào catalog.",
      });
    }
  }

  async function remove(itemId: string): Promise<void> {
    await apiRequest(`/api/projects/${projectKey}/design-catalog/${itemId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <FormCard
            eyebrow="Designer catalog"
            title="Gắn Figma vào project"
            footer={
              <Button disabled={form.formState.isSubmitting}>
                <Plus />
                {form.formState.isSubmitting ? "Đang thêm…" : "Thêm vào catalog"}
              </Button>
            }
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="design-name">Tên</FieldLabel>
                <Input id="design-name" {...form.register("name")} placeholder="Checkout / Payment Button" />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-type">Loại</FieldLabel>
                <NativeSelect id="design-type" {...form.register("type")}>
                  {Object.values(DESIGN_CATALOG_TYPES).map((type) => (
                    <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="figma-url">Figma URL</FieldLabel>
              <Input id="figma-url" {...form.register("figmaUrl")} placeholder="https://www.figma.com/design/..." />
            </Field>
            <Field>
              <FieldLabel htmlFor="design-description">Mô tả</FieldLabel>
              <Textarea id="design-description" {...form.register("description")} placeholder="Mục đích, state và quy tắc sử dụng" />
            </Field>
            <Field>
              <FieldLabel htmlFor="design-tags">Tags</FieldLabel>
              <Input id="design-tags" {...form.register("tags")} placeholder="mobile, checkout, v2" />
            </Field>
            {form.formState.errors.root?.message ? (
              <FieldError>{form.formState.errors.root.message}</FieldError>
            ) : null}
          </FormCard>
        </form>
      </FormProvider>

      {items.length === 0 ? (
        <Empty>
          <Figma className="size-10 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Catalog đang trống</EmptyTitle>
            <EmptyDescription>Thêm Figma file, page, component hoặc FigJam board đầu tiên.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="purple">{item.type}</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    aria-label={`Xóa ${item.name}`}
                    onClick={() => void remove(item._id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.description || "Chưa có mô tả."}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {item.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <a href={item.figmaUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> Mở trong Figma
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
