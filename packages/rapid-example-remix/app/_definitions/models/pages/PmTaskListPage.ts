import { cloneDeep } from 'lodash';
import type { RapidPage, RapidEntityFormConfig } from '@ruiapp/rapid-extension';

const formConfig: Partial<RapidEntityFormConfig> = {
  items: [
    {
      type: 'auto',
      code: 'title',
    },
    {
      type: 'textarea',
      code: 'description',
    },
    {
      type: 'auto',
      code: 'state',
    },
  ],
}

const page: RapidPage = {
  code: 'pm_task_list',
  name: 'Task列表',
  title: 'Task列表',
  permissionCheck: {any: []},
  view: [
    {
      $type: "sonicEntityList",
      entityCode: "PmTask",
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
          filterFields: ["title", "description"],
        }
      ],
      orderBy: [
        {
          field: 'id',
        }
      ],
      pageSize: 20,
      columns: [
        {
          type: 'auto',
          code: 'code',
          width: '100px',
        },
        {
          type: 'auto',
          code: 'taskType',
          width: '100px',
        },
        {
          type: 'link',
          code: 'title',
          fixed: 'left',
          width: '300px',
          rendererProps: {
            url: "/pages/pm_bug_issue_details?id={{id}}",
          },
        },
        {
          type: 'auto',
          code: 'description',
        },
        {
          type: 'auto',
          code: 'state',
          width: '100px',
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
          $type: "sonicRecordActionDeleteEntity",
          code: 'delete',
          actionType: 'delete',
          actionText: '删除',
          dataSourceCode: "list",
          entityCode: "PmTask",
        },
      ],
      newForm: cloneDeep(formConfig),
      editForm: cloneDeep(formConfig),
      $exps: {
        "newForm.fixedFields.taskType": "'bug'",
      },
    },
  ],
};

export default page;
