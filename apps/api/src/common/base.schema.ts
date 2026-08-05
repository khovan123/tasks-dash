import { Prop } from "@nestjs/mongoose";
export abstract class BaseMongoDocument {
  @Prop({ required: true }) workspaceId!: string;
  @Prop({ default: () => new Date() }) createdAt!: Date;
  @Prop({ default: () => new Date() }) updatedAt!: Date;
}
