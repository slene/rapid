/**
 * Meta manager plugin
 */

import * as _ from "lodash";
import { findEntities } from "~/dataAccess/entityManager";
import {
  IPluginInstance,
  IQueryBuilder,
  QuoteTableOptions,
  RpdApplicationConfig,
  RpdDataModel,
  RpdDataModelProperty,
  RpdDataPropertyTypes,
  RpdEntityCreateEventPayload,
  RpdEntityDeleteEventPayload,
  RpdEntityUpdateEventPayload,
} from "~/types";
import { IRpdServer, RpdConfigurationItemOptions, RpdServerPluginConfigurableTargetOptions, RpdServerPluginExtendingAbilities } from "~/core/server";

import * as listMetaModels from "./httpHandlers/listMetaModels";
import * as getMetaModelDetail from "./httpHandlers/getMetaModelDetail";
import { isRelationProperty } from "~/utilities/rapidUtility";

export const code = "metaManager";
export const description = "metaManager";
export const extendingAbilities: RpdServerPluginExtendingAbilities[] = [];
export const configurableTargets: RpdServerPluginConfigurableTargetOptions[] = [];
export const configurations: RpdConfigurationItemOptions[] = [];

let _plugin: IPluginInstance;

export async function initPlugin(plugin: IPluginInstance, server: IRpdServer) {
  _plugin = plugin;
}

export async function registerHttpHandlers(server: IRpdServer) {
  server.registerHttpHandler(_plugin, listMetaModels);
  server.registerHttpHandler(_plugin, getMetaModelDetail);
}

export async function registerEventHandlers(server: IRpdServer) {
  server.registerEventHandler(
    "entity.create",
    handleEntityCreateEvent.bind(null, server),
  );
  server.registerEventHandler(
    "entity.update",
    handleEntityUpdateEvent.bind(null, server),
  );
  server.registerEventHandler(
    "entity.delete",
    handleEntityDeleteEvent.bind(null, server),
  );
}

async function handleEntityCreateEvent(
  server: IRpdServer,
  sender: IPluginInstance,
  payload: RpdEntityCreateEventPayload,
) {
  if (sender === _plugin) {
    return;
  }

  if (payload.namespace === "meta" && payload.modelSingularCode === "model") {
    return;
    const { queryBuilder } = server;
    const model: Partial<RpdDataModel> = payload.after;
    if (model.tableName) {
      const model: RpdDataModel = payload.after;
      await server.queryDatabaseObject(
        `CREATE TABLE ${queryBuilder.quoteTable(model)} ();`,
        [],
      );
    }
  }
}

async function handleEntityUpdateEvent(
  server: IRpdServer,
  sender: IPluginInstance,
  payload: RpdEntityUpdateEventPayload,
) {
  if (sender === _plugin) {
    return;
  }

  if (payload.namespace === "meta" && payload.modelSingularCode === "model") {
    return;
    const { queryBuilder } = server;
    const modelChanges: Partial<RpdDataModel> = payload.changes;
    if (modelChanges.tableName) {
      const modelBefore: RpdDataModel = payload.before;
      await server.queryDatabaseObject(
        `ALTER TABLE ${queryBuilder.quoteTable(modelBefore)} RENAME TO ${queryBuilder.quoteTable(modelChanges as QuoteTableOptions)}`,
        [],
      );
    }
  }
}

async function handleEntityDeleteEvent(
  server: IRpdServer,
  sender: IPluginInstance,
  payload: RpdEntityDeleteEventPayload,
) {
  if (sender === _plugin) {
    return;
  }

  if (payload.namespace !== "meta") {
    return;
  }

  const { queryBuilder } = server;

  if (payload.modelSingularCode === "model") {
    const deletedModel: RpdDataModel = payload.before;
    await server.queryDatabaseObject(
      `DROP TABLE ${queryBuilder.quoteTable(deletedModel)}`,
      [],
    );
  } else if (payload.modelSingularCode === "property") {
    const deletedProperty: RpdDataModelProperty = payload.before;

    let columnNameToDrop = deletedProperty.columnName || deletedProperty.code;
    if (isRelationProperty(deletedProperty)) {
      if (deletedProperty.relation === "one") {
        columnNameToDrop = deletedProperty.targetIdColumnName || "";
      } else {
        // many relation
        return;
      }
    }

    const dataAccessor = server.getDataAccessor<RpdDataModel>({
      namespace: "meta",
      singularCode: "model",
    });
    const model = await dataAccessor.findById((deletedProperty as any).modelId);
    if (model) {
      await server.queryDatabaseObject(
        `ALTER TABLE ${queryBuilder.quoteTable(model)} DROP COLUMN ${
          queryBuilder.quoteObject(columnNameToDrop)
        }`,
        [],
      );
    }
  }
}

export async function configureModels(
  server: IRpdServer,
  applicationConfig: RpdApplicationConfig,
) {
  try {
    const models = await listCollections(server, applicationConfig);
    applicationConfig.models.push(...models);
  } catch (ex) {
    console.warn("Failed to loading existing meta of models.", ex.message);
  }
}

function listCollections(
  server: IRpdServer,
  applicationConfig: RpdApplicationConfig,
) {
  const dataAccessor = server.getDataAccessor({
    namespace: "meta",
    singularCode: "model",
  });
  const model = dataAccessor.getModel();

  return findEntities(server, dataAccessor, {
    properties: model.properties.map((item) => item.code),
  });
}

export async function onApplicationLoaded(
  server: IRpdServer,
  applicationConfig: RpdApplicationConfig,
) {
  console.log("metaManager.onApplicationLoaded");
  await syncDatabaseSchema(server, applicationConfig);
}

type TableInformation = {
  table_schema: string;
  table_name: string;
}

type ColumnInformation = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string;
  character_maximum_length: number;
  numeric_precision: number;
  numeric_scale: number;
}

async function syncDatabaseSchema(
  server: IRpdServer,
  applicationConfig: RpdApplicationConfig,
) {
  console.log("Synchronizing database schema...");
  const sqlQueryTableInformations = `SELECT table_schema, table_name FROM information_schema.tables`;
  const tablesInDb: TableInformation[] = await server.queryDatabaseObject(sqlQueryTableInformations);
  const { queryBuilder } = server;

  for (const model of applicationConfig.models) {
    console.debug(`Checking data table for '${model.namespace}.${model.singularCode}'...`);

    const expectedTableSchema = model.schema || server.databaseConfig.dbDefaultSchema;
    const expectedTableName = model.tableName;
    const tableInDb = _.find(tablesInDb, { table_schema: expectedTableSchema, table_name: expectedTableName});
    if (!tableInDb) {
      await server.queryDatabaseObject(`CREATE TABLE IF NOT EXISTS ${queryBuilder.quoteTable(model)} ()`, []);
    }
  }

  const sqlQueryColumnInformations = `SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
  FROM information_schema.columns;`;
  const columnsInDb: ColumnInformation[] = await server.queryDatabaseObject(sqlQueryColumnInformations, []);

  for (const model of applicationConfig.models) {
    console.debug(`Checking data columns for '${model.namespace}.${model.singularCode}'...`);

    for (const property of model.properties) {
      let columnDDL;
      if (isRelationProperty(property)) {
        if (property.relation === "one") {
          const targetModel = applicationConfig.models.find(item => item.singularCode === property.targetSingularCode);
          if (!targetModel) {
            console.warn(`Cannot find target model with singular code "${property.targetSingularCode}".`)
          }

          const columnInDb: ColumnInformation | undefined = _.find(columnsInDb, {
            table_schema: model.schema || "public",
            table_name: model.tableName,
            column_name: property.targetIdColumnName!,
          });

          if (!columnInDb) {
            columnDDL = generateCreateColumnDDL(queryBuilder, {
              schema: model.schema,
              tableName: model.tableName,
              name: property.targetIdColumnName!,
              type: "integer",
              autoIncrement: false,
              notNull: property.required,
            });
          }
        } else if (property.relation === "many") {
          if (property.linkTableName) {
            const tableInDb = _.find(tablesInDb, { table_schema: property.linkSchema || server.databaseConfig.dbDefaultSchema, table_name: property.linkTableName});
            if (!tableInDb) {
              columnDDL = generateLinkTableDDL(queryBuilder, {
                linkSchema: property.linkSchema,
                linkTableName: property.linkTableName,
                targetIdColumnName: property.targetIdColumnName!,
                selfIdColumnName: property.selfIdColumnName!,
              });
            }
          } else {
            const targetModel = applicationConfig.models.find(item => item.singularCode === property.targetSingularCode);
            if (!targetModel) {
              console.warn(`Cannot find target model with singular code "${property.targetSingularCode}".`)
              continue;
            }

            const columnInDb: ColumnInformation | undefined = _.find(columnsInDb, {
              table_schema: targetModel.schema || "public",
              table_name: targetModel.tableName,
              column_name: property.selfIdColumnName!,
            });

            if (!columnInDb) {
              columnDDL = generateCreateColumnDDL(queryBuilder, {
                schema: targetModel.schema,
                tableName: targetModel.tableName,
                name: property.selfIdColumnName || "",
                type: "integer",
                autoIncrement: false,
                notNull: property.required,
              });
            }
          }
        } else {
          continue;
        }

        if (columnDDL) {
          await server.tryQueryDatabaseObject(columnDDL);
        }
      } else {
        const columnName = property.columnName || property.code;
        const columnInDb: ColumnInformation | undefined = _.find(columnsInDb, {
          table_schema: model.schema || "public",
          table_name: model.tableName,
          column_name: columnName,
        });

        if (!columnInDb) {
          // create column if not exists
          columnDDL = generateCreateColumnDDL(queryBuilder, {
            schema: model.schema,
            tableName: model.tableName,
            name: columnName,
            type: property.type,
            autoIncrement: property.autoIncrement,
            notNull: property.required,
            defaultValue: property.defaultValue,
          });
          await server.tryQueryDatabaseObject(columnDDL);
        } else {
          const expectedColumnType = pgPropertyTypeColumnMap[property.type];
          if (columnInDb.udt_name !== expectedColumnType) {
            const sqlAlterColumnType = `alter table ${queryBuilder.quoteTable(model)} alter column ${queryBuilder.quoteObject(columnName)} type ${expectedColumnType}`;
            await server.tryQueryDatabaseObject(sqlAlterColumnType);
          }

          if (property.defaultValue) {
            if (!columnInDb.column_default) {
              const sqlSetColumnDefault = `alter table ${queryBuilder.quoteTable(model)} alter column ${queryBuilder.quoteObject(columnName)} set default ${property.defaultValue}`;
              await server.tryQueryDatabaseObject(sqlSetColumnDefault);
            }
          } else {
            if (columnInDb.column_default && !property.autoIncrement) {
              const sqlDropColumnDefault = `alter table ${queryBuilder.quoteTable(model)} alter column ${queryBuilder.quoteObject(columnName)} drop default`;
              await server.tryQueryDatabaseObject(sqlDropColumnDefault);
            }
          }

          if (property.required) {
            if (columnInDb.is_nullable === "YES") {
              const sqlSetColumnNotNull = `alter table ${queryBuilder.quoteTable(model)} alter column ${queryBuilder.quoteObject(columnName)} set not null`;
              await server.tryQueryDatabaseObject(sqlSetColumnNotNull);
            }
          } else {
            if (columnInDb.is_nullable === "NO") {
              const sqlDropColumnNotNull = `alter table ${queryBuilder.quoteTable(model)} alter column ${queryBuilder.quoteObject(columnName)} drop not null`;
              await server.tryQueryDatabaseObject(sqlDropColumnNotNull);
            }
          }
        }
      }
    }
  }
}

function generateCreateColumnDDL(queryBuilder: IQueryBuilder, options: {
  schema?: string;
  tableName: string;
  name: string;
  type: RpdDataPropertyTypes;
  autoIncrement?: boolean;
  notNull?: boolean;
  defaultValue?: string;
}) {
  let columnDDL = `ALTER TABLE ${queryBuilder.quoteTable(options)} ADD`;
  columnDDL += ` ${queryBuilder.quoteObject(options.name)}`;
  if (options.type === "integer" && options.autoIncrement) {
    columnDDL += ` serial`;
  } else {
    const columnType = pgPropertyTypeColumnMap[options.type];
    if (!columnType) {
      console.log('options', options);
      throw new Error(`Property type "${options.type}" is not supported.`);
    }
    columnDDL += ` ${columnType}`;
  }
  if (options.notNull) {
    columnDDL += " NOT NULL";
  }

  if (options.defaultValue) {
    columnDDL += ` DEFAULT ${options.defaultValue}`;
  }

  return columnDDL;
}


function generateLinkTableDDL(queryBuilder: IQueryBuilder, options: {
  linkSchema?: string;
  linkTableName: string;
  targetIdColumnName: string;
  selfIdColumnName: string;
}) {
  let columnDDL = `CREATE TABLE ${queryBuilder.quoteTable({
    schema: options.linkSchema,
    tableName: options.linkTableName,
  })} (`;
  columnDDL += `id serial not null,`;
  columnDDL += `${queryBuilder.quoteObject(options.selfIdColumnName)} integer not null,`;
  columnDDL += `${queryBuilder.quoteObject(options.targetIdColumnName)} integer not null)`;

  return columnDDL;
}


const pgPropertyTypeColumnMap: Partial<Record<RpdDataPropertyTypes, string>> = {
  integer: "int4",
  long: "int8",
  float: "float4",
  double: "float8",
  decimal: "decimal",
  text: "text",
  boolean: "bool",
  date: "date",
  datetime: "timestamptz",
  json: "jsonb",
  option: "text",
};
