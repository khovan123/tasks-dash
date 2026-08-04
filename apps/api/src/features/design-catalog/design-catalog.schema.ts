import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { DesignCatalogType } from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ collection: "design_catalog_items", timestamps: true })
export class DesignCatalogDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  projectKey!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true }) type!: DesignCatalogType;
  @Prop({ required: true, trim: true }) figmaUrl!: string;
  @Prop({ default: "" }) description!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ required: true }) createdByMemberId!: string;
}

export const DesignCatalogSchema = SchemaFactory.createForClass(
  DesignCatalogDocument,
);
DesignCatalogSchema.index({ workspaceId: 1, projectKey: 1, figmaUrl: 1 }, { unique: true });
export type DesignCatalogHydratedDocument = HydratedDocument<DesignCatalogDocument>;
