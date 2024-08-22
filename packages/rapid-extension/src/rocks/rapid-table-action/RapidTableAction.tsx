import { Rock, RockConfig, RockEvent, handleComponentEvent } from "@ruiapp/move-style";
import RapidToolbarMeta from "./RapidTableActionMeta";
import { renderRock } from "@ruiapp/react-renderer";
import { RapidTableActionRockConfig } from "./rapid-table-action-types";
import { Modal } from "antd";

import "./style.css";

export default {
  $type: "rapidTableAction",

  Renderer(context, props) {
    const { record, recordId, actionText, confirmText, onAction, disabled, disabledTooltipText } = props;
    let rockConfig: RockConfig = {
      $id: `${props.$id}-anchor`,
      $type: "anchor",
      className: "rui-table-action-link",
      "data-record-id": recordId,
      children: {
        $type: "text",
        text: actionText,
      },
    };

    if (disabled) {
      rockConfig = {
        $id: `${props.$id}-tooltip`,
        $type: "antdTooltip",
        title: disabledTooltipText,
        color: "rgba(0,0,0,0.5)",
        children: {
          $id: `${props.$id}-anchor`,
          $type: "htmlElement",
          htmlTag: "span",
          attributes: {
            className: "rui-table-action-link rui-table-action-link--disabled",
            "data-record-id": recordId,
          },
          children: {
            $type: "text",
            text: actionText,
          },
        },
      };

      if (!disabledTooltipText) {
        rockConfig.open = false;
      }
    }

    if (onAction && !disabled) {
      rockConfig.onClick = [
        {
          $action: "script",
          script: (event: RockEvent) => {
            if (confirmText) {
              Modal.confirm({
                title: confirmText,
                onOk: async () => {
                  handleComponentEvent("onAction", event.framework, event.page as any, event.scope, event.sender, onAction, [record]);
                },
              });
            } else {
              handleComponentEvent("onAction", event.framework, event.page as any, event.scope, event.sender, onAction, [record]);
            }
          },
        },
      ];
    }

    return renderRock({ context, rockConfig });
  },

  ...RapidToolbarMeta,
} as Rock<RapidTableActionRockConfig>;
