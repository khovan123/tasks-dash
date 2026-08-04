export interface ProjectProps {
  id?: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string;
  color: string;
  leadId?: string;
  repositoryFullName?: string;
}

export class Project {
  private constructor(private readonly props: ProjectProps) {}

  static create(input: ProjectProps): Project {
    const key = input.key.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) {
      throw new Error(
        "Project key must contain 2-10 uppercase letters or numbers.",
      );
    }
    if (!input.name.trim()) throw new Error("Project name is required.");
    return new Project({ ...input, key, name: input.name.trim() });
  }

  toPrimitives(): ProjectProps {
    return { ...this.props };
  }
}
