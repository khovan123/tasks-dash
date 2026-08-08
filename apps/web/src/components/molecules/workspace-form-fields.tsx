import { useFormContext } from "react-hook-form";
import type { WorkspaceFormValues } from "@/features/workspaces/schemas/workspace-form.schema";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface WorkspaceFormFieldsProps {
  idPrefix: string;
  slugDescription?: string;
}

export function WorkspaceFormFields({
  idPrefix,
  slugDescription,
}: WorkspaceFormFieldsProps) {
  const form = useFormContext<WorkspaceFormValues>();

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Tên workspace *</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          {...form.register("workspaceName")}
          placeholder="Product Delivery"
          autoFocus
          aria-invalid={Boolean(form.formState.errors.workspaceName)}
        />
        {form.formState.errors.workspaceName?.message ? (
          <FieldError>{form.formState.errors.workspaceName.message}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-slug`}>Slug tùy chọn</FieldLabel>
        <Input
          id={`${idPrefix}-slug`}
          {...form.register("workspaceSlug")}
          placeholder="product-delivery"
          aria-invalid={Boolean(form.formState.errors.workspaceSlug)}
        />
        {slugDescription ? (
          <FieldDescription>{slugDescription}</FieldDescription>
        ) : null}
        {form.formState.errors.workspaceSlug?.message ? (
          <FieldError>{form.formState.errors.workspaceSlug.message}</FieldError>
        ) : null}
      </Field>

      {form.formState.errors.root?.message ? (
        <FieldError>{form.formState.errors.root.message}</FieldError>
      ) : null}
    </FieldGroup>
  );
}
