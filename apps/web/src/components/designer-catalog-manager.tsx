"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DESIGN_CATALOG_TYPES } from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import {
  DesignCatalogFormValues,
  designCatalogSchema,
} from "@/features/design-catalog/schemas/design-catalog.schema";
import { apiRequest } from "@/lib/api/api-request";

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
    <>
      <FormProvider {...form}>
        <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
          <div className="section-heading"><div><span>DESIGNER CATALOG</span><h2>Gắn Figma vào project</h2></div></div>
          <div className="form-grid">
            <label>Tên<input {...form.register("name")} placeholder="Checkout / Payment Button" /></label>
            <label>Loại<select {...form.register("type")}>{Object.values(DESIGN_CATALOG_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label className="wide">Figma URL<input {...form.register("figmaUrl")} placeholder="https://www.figma.com/design/..." /></label>
            <label className="wide">Mô tả<textarea {...form.register("description")} placeholder="Mục đích, state và quy tắc sử dụng" /></label>
            <label className="wide">Tags<input {...form.register("tags")} placeholder="mobile, checkout, v2" /></label>
          </div>
          {form.formState.errors.root?.message ? <p className="error">{form.formState.errors.root.message}</p> : null}
          <button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang thêm…" : "Thêm vào catalog"}</button>
        </form>
      </FormProvider>

      <section className="catalog-grid">
        {items.length === 0 ? <article className="empty-state"><h2>Catalog đang trống</h2><p>Thêm Figma file, page, component hoặc FigJam board đầu tiên.</p></article> : items.map((item) => (
          <article className="catalog-card" key={item._id}>
            <div className="project-card-head"><span className="project-key">{item.type}</span><button className="danger-button" type="button" onClick={() => void remove(item._id)}>Xóa</button></div>
            <h2>{item.name}</h2>
            <p>{item.description || "Chưa có mô tả."}</p>
            <div className="tag-list">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <a className="primary link-button" href={item.figmaUrl} target="_blank" rel="noreferrer">Mở trong Figma</a>
          </article>
        ))}
      </section>
    </>
  );
}
