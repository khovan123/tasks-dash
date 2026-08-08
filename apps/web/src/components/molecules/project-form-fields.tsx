import { useFormContext } from "react-hook-form";
import type { ProjectFormValues } from "@/features/projects/schemas/project-form.schema";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProjectFormFieldsProps {
  idPrefix: string;
  descriptionHelp?: string;
}

export function ProjectFormFields({
  idPrefix,
  descriptionHelp,
}: ProjectFormFieldsProps) {
  const form = useFormContext<ProjectFormValues>();

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-key`}>Project key *</FieldLabel>
          <Input
            id={`${idPrefix}-key`}
            {...form.register("key")}
            placeholder="TD"
            aria-invalid={Boolean(form.formState.errors.key)}
          />
          {form.formState.errors.key?.message ? (
            <FieldError>{form.formState.errors.key.message}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Tên dự án *</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            {...form.register("name")}
            placeholder="Tasks Dash"
            aria-invalid={Boolean(form.formState.errors.name)}
          />
          {form.formState.errors.name?.message ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-description`}>Mô tả *</FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          {...form.register("description")}
          placeholder="Mục tiêu và phạm vi dự án…"
          aria-invalid={Boolean(form.formState.errors.description)}
        />
        {descriptionHelp ? (
          <FieldDescription>{descriptionHelp}</FieldDescription>
        ) : null}
        {form.formState.errors.description?.message ? (
          <FieldError>{form.formState.errors.description.message}</FieldError>
        ) : null}
      </Field>

      {form.formState.errors.root?.message ? (
        <FieldError>{form.formState.errors.root.message}</FieldError>
      ) : null}
    </>
  );
}
