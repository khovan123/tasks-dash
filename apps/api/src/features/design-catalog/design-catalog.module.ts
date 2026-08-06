import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import {
  DesignCatalogItemLogDocument,
  DesignCatalogItemLogSchema,
} from "../integrations/integration.schemas";
import { DesignCatalogController } from "./design-catalog.controller";
import {
  DesignCatalogDocument,
  DesignCatalogSchema,
} from "./design-catalog.schema";
import { DesignCatalogService } from "./design-catalog.service";

@Module({
  imports: [
    ProjectsModule,
    forwardRef(() => IntegrationsModule),
    MongooseModule.forFeature([
      { name: DesignCatalogDocument.name, schema: DesignCatalogSchema },
      { name: DesignCatalogItemLogDocument.name, schema: DesignCatalogItemLogSchema },
    ]),
  ],
  controllers: [DesignCatalogController],
  providers: [DesignCatalogService],
  exports: [DesignCatalogService, MongooseModule],
})
export class DesignCatalogModule {}
