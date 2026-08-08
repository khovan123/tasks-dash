"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DESIGN_CATALOG_TYPES } from "@tasks-dash/contracts";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { ExternalLink, Figma, Plus, Trash2 } from "lucide-react";
import { FormCard } from "@/components/organisms/form-card";
import {
  type DesignCatalogFormValues,
  designCatalogSchema,
} from "@/features/design-catalog/schemas/design-catalog.schema";
import type { DesignCatalogItem } from "@/features/design-catalog/types";
import { apiRequest } from "@/lib/api/api-request";
import { mutationErrorMessage } from "@/lib/api/mutation-result";
import { parseCommaSeparatedValues } from "@/lib/text-list";
import { useAppDispatch } from "@/lib/store/hooks";
import { replaceDesignCatalog } from "@/lib/store/realtime-slice";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DesignerCatalogManager({
  projectKey,
  items,
  canManageCatalog,
}: {
  projectKey: string;
  items: DesignCatalogItem[];
  canManageCatalog: boolean;
}) {
  const dispatch = useAppDispatch();
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

  async function syncCatalog(): Promise<void> {
    const nextItems = await apiRequest<DesignCatalogItem[]>(
      `/api/projects/${projectKey}/design-catalog`,
    );
    dispatch(replaceDesignCatalog({ projectKey, items: nextItems }));
  }

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
          tags: parseCommaSeparatedValues(values.tags),
        }),
      });
      form.reset({
        name: "",
        type: DESIGN_CATALOG_TYPES.figmaComponent,
        figmaUrl: "",
        description: "",
        tags: "",
      });
      await syncCatalog();
    } catch (cause) {
      form.setError("root", {
        message: mutationErrorMessage(cause, "Không thể thêm Figma vào catalog."),
      });
    }
  }

  async function remove(itemId: string): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(`/api/projects/${projectKey}/design-catalog/${itemId}`, {
        method: "DELETE",
      });
      await syncCatalog();
    } catch (cause) {
      form.setError("root", {
        message: mutationErrorMessage(cause, "Không thể xóa Figma khỏi catalog."),
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canManageCatalog ? (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <FormCard
              eyebrow="Designer catalog"
              title="Liên kết Figma"
              footer={
                <Button disabled={form.formState.isSubmitting}>
                  <Plus data-icon="inline-start" />
                  {form.formState.isSubmitting ? "Đang thêm…" : "Thêm vào catalog"}
                </Button>
              }
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="design-name">Tên</FieldLabel>
                  <Input
                    id="design-name"
                    {...form.register("name")}
                    placeholder="Checkout / Payment Button"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="design-type">Loại</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="design-type" className="w-full">
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(DESIGN_CATALOG_TYPES).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="figma-url">Figma URL</FieldLabel>
                <Input
                  id="figma-url"
                  {...form.register("figmaUrl")}
                  placeholder="https://www.figma.com/design/..."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-description">Mô tả</FieldLabel>
                <Textarea
                  id="design-description"
                  {...form.register("description")}
                  placeholder="Mục đích, state và quy tắc sử dụng"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-tags">Tags</FieldLabel>
                <Input
                  id="design-tags"
                  {...form.register("tags")}
                  placeholder="mobile, checkout, v2"
                />
              </Field>
              {form.formState.errors.root?.message ? (
                <FieldError>{form.formState.errors.root.message}</FieldError>
              ) : null}
            </FormCard>
          </form>
        </FormProvider>
      ) : null}

      {items.length === 0 ? (
        <Empty>
          <Figma className="size-10 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Catalog đang trống</EmptyTitle>
            <EmptyDescription>
              Thêm Figma file, page, component hoặc FigJam board đầu tiên.
            </EmptyDescription>
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
                    disabled={!canManageCatalog || form.formState.isSubmitting}
                    onClick={() => void remove(item._id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.description || "Chưa có mô tả."}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <a href={item.figmaUrl} target="_blank" rel="noreferrer">
                    <ExternalLink data-icon="inline-start" /> Mở trong Figma
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
