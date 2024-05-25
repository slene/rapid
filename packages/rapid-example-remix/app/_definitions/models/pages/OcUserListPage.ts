import { cloneDeep } from 'lodash';
import type { RapidPage, RapidEntityFormConfig } from '@ruiapp/rapid-extension';

const formConfig: Partial<RapidEntityFormConfig> = {
  items: [
    {
      type: 'auto',
      code: 'name',
    },
    {
      type: 'auto',
      code: 'login',
    },
    {
      type: 'auto',
      code: 'email',
    },
    {
      type: 'treeSelect',
      code: 'department',
      formControlProps: {
        listDataSourceCode: "departments",
        listParentField: "parent.id"
      }
    },
    {
      type: 'auto',
      code: 'roles',
      formControlType: "rapidCheckboxListFormInput",
      listDataFindOptions: {
        orderBy: [
          {
            field: 'orderNum'
          }
        ]
      }
    },
    {
      type: 'auto',
      code: 'state',
    },
  ],
}

const page: RapidPage = {
  code: 'oc_user_list',
  name: '用户列表',
  title: '用户管理',
  permissionCheck: {any: []},
  view: [
    {
      $type: "sonicEntityList",
      entityCode: "OcUser",
      viewMode: "table",
      listActions: [
        {
          $type: "sonicToolbarNewEntityButton",
          text: "新建",
          icon: "PlusOutlined",
          actionStyle: "primary",
        }
      ],
      extraActions: [
        {
          $type: "sonicToolbarFormItem",
          formItemType: "search",
          placeholder: "Search",
          actionEventName: "onSearch",
          filterMode: "contains",
          filterFields: ["login", "name"],
        }
      ],
      pageSize: 20,
      columns: [
        {
          type: 'auto',
          code: 'name',
          fixed: 'left',
        },
        {
          type: 'auto',
          code: 'login',
          fixed: 'left',
        },
        {
          type: 'auto',
          code: 'email',
          width: '200px',
        },
        {
          type: 'auto',
          code: 'department',
          fieldName: 'department.name',
          width: '150px',
        },
        {
          type: 'auto',
          code: 'roles',
          width: '250px',
          rendererProps: {
            item: {
              $type: "rapidLinkRenderer",
              url: "/pages/oc_role_details?id={{id}}",
              text: "{{name}}",
            }
          },
        },
        {
          type: 'auto',
          code: 'state',
          width: '100px',
        },
        {
          type: 'auto',
          code: 'createdBy',
          width: '150px',
          rendererProps: {
            format: "{{name}}"
          }
        },
        {
          type: 'auto',
          code: 'createdAt',
          width: '150px',
        },
      ],
      actions: [
        {
          $type: "sonicRecordActionEditEntity",
          code: 'edit',
          actionType: "edit",
          actionText: '修改',
        },
        {
          $type: "rapidTableAction",
          code: "disable",
          actionText: '禁用',
          $exps: {
            _hidden: "$slot.record.state !== 'enabled'"
          },
          onAction: [
            {
              $action: "sendHttpRequest",
              method: "PATCH",
              data: {state: 'disabled'},
              $exps: {
                url: `"/api/app/oc_users/" + $event.sender['data-record-id']`,
              }
            },
            {
              $action: "loadStoreData",
              storeName: "list",
            }
          ]
        },
        {
          $type: "rapidTableAction",
          code: "enable",
          actionText: '启用',
          $exps: {
            _hidden: "$slot.record.state === 'enabled'"
          },
          onAction: [
            {
              $action: "sendHttpRequest",
              method: "PATCH",
              data: {state: 'enabled'},
              $exps: {
                url: `"/api/app/oc_users/" + $event.sender['data-record-id']`,
              }
            },
            {
              $action: "loadStoreData",
              storeName: "list",
            }
          ]
        },
        {
          $type: "sonicRecordActionDeleteEntity",
          code: 'delete',
          actionType: 'delete',
          actionText: '删除',
          dataSourceCode: "list",
          entityCode: "OcUser",
        },
      ],
      newForm: cloneDeep(formConfig),
      editForm: cloneDeep(formConfig),
      searchForm: {
        entityCode: 'OcUser',
        items: [
          {
            type: 'auto',
            code: 'login',
            filterMode: 'contains',
          },
          {
            type: 'auto',
            code: 'name',
            filterMode: 'contains',
          },
          {
            type: 'auto',
            code: 'state',
            filterMode: 'eq',
          },
        ],
      },
      stores: [
        {
          type: "entityStore",
          name: "departments",
          entityCode: "OcDepartment",
          properties: ["id", "code", "name", "parent", "orderNum", "createdAt"],
          filters: [
          ],
          orderBy: [
            {
              field: 'orderNum',
            }
          ],
        }
      ],
    },
  ],
};

export default page;
