import * as React from "react";
import classNames from "classnames";

function ListItem(props) {
  const { onClick, onOpenPanel } = props;
  const {
    node,
    errorArray,
    ignoredErrorArray,
    activeNodeIds,
    selectedListItems
  } = props;

  const [expanded, setExpanded] = React.useState(false);

  const getErrorNodeId = (err: any) =>
    err.nodeId || (err.node && err.node.id) || err.id;

  // Memoize the calculation of errors for this specific node
  const nodeErrors = React.useMemo(() => {
    if (!Array.isArray(errorArray)) return [];
    return errorArray.filter(e => getErrorNodeId(e) === node.id);
  }, [errorArray, node.id]);

  const errorCount = nodeErrors.length;

  // Recursive function for finding the amount of errors nested within this node's children.
  const findNestedErrors = React.useCallback(
    currentNode => {
      if (!currentNode.children || !Array.isArray(errorArray)) {
        return 0;
      }

      let count = 0;
      const queue = [...currentNode.children];
      const visited = new Set();

      while (queue.length > 0) {
        const child = queue.shift();
        if (!child || visited.has(child.id)) continue;
        visited.add(child.id);

        count += errorArray.filter(e => getErrorNodeId(e) === child.id).length;

        if (child.children) {
          queue.push(...child.children);
        }
      }
      return count;
    },
    [errorArray]
  );

  const childErrorsCount = React.useMemo(() => findNestedErrors(node), [
    node,
    findNestedErrors
  ]);

  const childNodes =
    node.children && node.children.length > 0
      ? node.children.map(function(childNode) {
          return (
            <ListItem
              ignoredErrorArray={ignoredErrorArray}
              activeNodeIds={activeNodeIds}
              selectedListItems={selectedListItems}
              errorArray={errorArray}
              onClick={onClick}
              onOpenPanel={onOpenPanel}
              key={childNode.id}
              node={childNode}
            />
          );
        })
      : null;

  return (
    <li
      id={node.id}
      className={classNames(`list-item`, {
        "list-item--active": activeNodeIds.includes(node.id),
        "list-item--selected": selectedListItems.includes(node.id)
      })}
    >
      <div
        className="list-flex-row"
        style={{ alignItems: "center", position: "relative" }}
        onClick={() => {
          if (node.id) {
            parent.postMessage(
              { pluginMessage: { type: "fetch-layer-data", id: node.id } },
              "*"
            );
          }
        }}
      >
        <span
          className="list-arrow"
          onClick={e => {
            e.stopPropagation();
            setExpanded(exp => !exp);
          }}
        >
          {childNodes ? (
            <img
              className="list-arrow-icon"
              src={require("../assets/caret.svg")}
              style={{
                transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 0.15s"
              }}
            />
          ) : null}
        </span>
        <span
          className={
            "list-icon" +
            (node.type === "COMPONENT" || node.type === "INSTANCE"
              ? " component-node"
              : "")
          }
        >
          {node.type ? (
            <img
              src={require("../assets/" + node.type.toLowerCase() + ".svg")}
            />
          ) : (
            <span
              className="list-icon-placeholder"
              style={{ width: 16, height: 16, display: "inline-block" }}
            />
          )}
        </span>
        <span
          className={
            "list-name" +
            (node.type === "COMPONENT" || node.type === "INSTANCE"
              ? " component-node"
              : "")
          }
        >
          {node.name}
        </span>
        {childErrorsCount >= 1 && <span className="dot"></span>}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: "auto",
            gap: 4,
            position: "relative",
            zIndex: 2
          }}
        >
          {errorCount >= 1 && <span className="badge">{errorCount}</span>}
          {errorCount >= 1 && (
            <button
              className="button--icon"
              style={{ marginLeft: 0 }}
              onClick={e => {
                e.stopPropagation();
                if (onOpenPanel) onOpenPanel(node);
              }}
              title="Abrir detalhes do erro"
              tabIndex={0}
            >
              <img
                src={require("../assets/caret.svg")}
                style={{ transform: "rotate(-90deg)" }}
              />
            </button>
          )}
        </span>
      </div>
      {childNodes && expanded ? (
        <ul className="sub-list">{childNodes}</ul>
      ) : null}
    </li>
  );
}

export default ListItem;
