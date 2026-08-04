import {
  DESIGN_CATALOG_TYPES,
  type DesignCatalogType,
} from "@tasks-dash/contracts";
import { z } from "zod";

const DESIGN_CATALOG_TYPE_VALUES = Object.values(DESIGN_CATALOG_TYPES) as [
  DesignCatalogType,
  ...DesignCatalogType[],
];

export const designCatalogSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(DESIGN_CATALOG_TYPE_VALUES),
  figmaUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "figma.com" || url.hostname === "www.figma.com")
      );
    }, "Link phải thuộc figma.com."),
  description: z.string().trim().max(2000),
  tags: z.string().trim(),
});

export type DesignCatalogFormValues = z.infer<typeof designCatalogSchema>;
