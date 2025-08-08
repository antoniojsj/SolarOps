import * as React from "react";
import classNames from "classnames";

function ListItem(props) {
  const { onClick, onOpenPanel } = props;
  const node = props.node;
  let childNodes = null;
  let errorObject = { errors: [] };
  let childErrorsCount = 0;

  const [expanded, setExpanded] = React.useState(false);

  // Debug logs
  console.log(
    `[ListItem] Renderizando node: ${node.name} (${node.type}) - filhos: ${node
      .children?.length || 0} - expanded: ${expanded}`
  );

  let filteredErrorArray = props.errorArray;

  // Check to see if this node has corresponding errors.
  if (filteredErrorArray.some(e => e.id === node.id)) {
    errorObject = filteredErrorArray.find(e => e.id === node.id);
  }

  // The component calls itself if there are children
  if (node.children && node.children.length) {
    console.log(
      `[ListItem] Node ${node.name} tem ${node.children.length} filhos`
    );

    // Find errors in this node's children.
    childErrorsCount = findNestedErrors(node);

    childNodes = node.children.map(function(childNode) {
      return (
        <ListItem
          ignoredErrorArray={props.ignoredErrorArray}
          activeNodeIds={props.activeNodeIds}
          selectedListItems={props.selectedListItems}
          errorArray={filteredErrorArray}
          onClick={onClick}
          onOpenPanel={onOpenPanel}
          key={childNode.id}
          node={childNode}
        />
      );
    });
  }

  // Recursive function for finding the amount of errors
  // nested within this nodes children.
  function findNestedErrors(node) {
    let errorCount = 0;

    node.children.forEach(childNode => {
      if (filteredErrorArray.some(e => e.id === childNode.id)) {
        let childErrorObject = filteredErrorArray.find(
          e => e.id === childNode.id
        );
        errorCount = errorCount + childErrorObject.errors.length;
      }

      if (childNode.children) {
        errorCount = errorCount + findNestedErrors(childNode);
      }
    });

    return errorCount;
  }

  return (
    <li
      id={node.id}
      className={classNames(`list-item`, {
        "list-item--active": props.activeNodeIds.includes(node.id),
        "list-item--selected": props.selectedListItems.includes(node.id)
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
            console.log(
              `[ListItem] Alternando expansão de ${
                node.name
              } de ${expanded} para ${!expanded}`
            );
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
          {errorObject.errors.length >= 1 && (
            <span className="badge">{errorObject.errors.length}</span>
          )}
          {errorObject.errors.length >= 1 && (
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
        <ul className="sub-list">
          {console.log(
            `[ListItem] Renderizando ${childNodes.length} filhos para ${node.name}`
          )}
          {childNodes}
        </ul>
      ) : null}
    </li>
  );
}

export default ListItem;
