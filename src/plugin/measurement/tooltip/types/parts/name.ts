import { createTooltipTextNode } from "../../../helper";

export const name = (node, parent, { fontColor = "", fontSize = 0 }) => {
  if (!node.name) return;

  const iconNode = figma.createNodeFromSvg(
    `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z"/></svg>`
  );
  const textNode = createTooltipTextNode({
    fontColor,
    fontSize
  });
  textNode.x += 20;
  textNode.y += 1.5;
  textNode.characters = node.name;

  const g = figma.group([iconNode, textNode], parent);
  g.expanded = false;
};
