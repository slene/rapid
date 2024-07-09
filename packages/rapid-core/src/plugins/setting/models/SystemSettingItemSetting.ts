import { RpdDataModel } from "~/types";

export default {
  maintainedBy: "settingPlugin",
  namespace: "svc",
  name: "system_setting_item_setting",
  singularCode: "system_setting_item_setting",
  pluralCode: "system_setting_item_settings",
  schema: "public",
  tableName: "system_setting_item_settings",
  properties: [
    {
      name: "id",
      code: "id",
      columnName: "id",
      type: "integer",
      required: true,
      autoIncrement: true,
    },
    {
      name: "group",
      code: "group",
      type: "relation",
      relation: "one",
      targetSingularCode: "system_setting_group_setting",
      targetIdColumnName: "group_id",
      required: true,
    },
    {
      name: "orderNum",
      code: "orderNum",
      columnName: "order_num",
      type: "integer",
      required: true,
      defaultValue: "0",
    },
    {
      name: "type",
      code: "type",
      columnName: "type",
      type: "text",
      required: true,
    },
    {
      name: "code",
      code: "code",
      columnName: "code",
      type: "text",
      required: true,
    },
    {
      name: "name",
      code: "name",
      columnName: "name",
      type: "text",
      required: false,
    },
    {
      name: "description",
      code: "description",
      columnName: "description",
      type: "text",
      required: false,
    },
    {
      name: "config",
      code: "config",
      columnName: "config",
      type: "json",
      required: false,
    },
  ],
} as RpdDataModel;
