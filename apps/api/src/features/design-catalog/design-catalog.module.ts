import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { DesignCatalogController } from "./design-catalog.controller";
import {
  DesignCatalogDocument,
  DesignCatalogSchema,
} from "./design-catalog.schema";
import { DesignCatalogService } from "./design-catalog.service";

@Module({
  imports: [
    ProjectsModule,
    MongooseModule.forFeature([
      { name: DesignCatalogDocument.name, schema: DesignCatalogSchema },
    ]),
  ],
  controllers: [DesignCatalogController],
  providers: [DesignCatalogService],
  exports: [DesignCatalogService, MongooseModule],
})
export class DesignCatalogModule {}
