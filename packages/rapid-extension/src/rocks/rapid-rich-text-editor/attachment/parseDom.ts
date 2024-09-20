import { IDomEditor, SlateDescendant, SlateElement } from "@wangeditor/editor";
import { AttachmentElement } from "./types";

// TODO
type DOMElement = any;

function parseHtml(elem: DOMElement, children: SlateDescendant[], editor: IDomEditor): SlateElement {
  const link = elem.getAttribute("href") || "";
  const fileName = elem.getAttribute("download") || "";
  return {
    type: "attachment",
    link,
    fileName,
    children: [{ text: "" }], // void node 必须有一个空白 text
  } as AttachmentElement;
}

const parseHtmlConf = {
  selector: 'a[data-w-e-type="attachment"]',
  parseElemHtml: parseHtml,
};

export default parseHtmlConf;
