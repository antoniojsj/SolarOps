import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";

import ListItem from "./ListItem";
import TotalErrorCount from "./TotalErrorCount";

function NodeList(props) {
  // Reduce the size of our array of errors by removing
  // nodes with no errors on them.
  let filteredErrorArray = props.errorArray.filter(
    item => item.errors.length >= 1
  );

  filteredErrorArray.forEach(item => {
    // Check each layer/node to see if an error that matches it's layer id
    if (props.ignoredErrorArray.some(x => x.node.id === item.id)) {
      // When we know a matching error exists loop over all the ignored
      // errors until we find it.
      props.ignoredErrorArray.forEach(ignoredError => {
        if (ignoredError.node.id === item.id) {
          // Loop over every error this layer/node until we find the
          // error that should be ignored, then remove it.
          for (let i = 0; i < item.errors.length; i++) {
            if (item.errors[i].value === ignoredError.value) {
              item.errors.splice(i, 1);
              i--;
            }
          }
        }
      });
    }
  });

  const handleNodeClick = id => {
    // Opens the panel if theres an error.
    let activeId = props.errorArray.find(e => e.id === id);

    if (activeId.errors.length) {
      // Pass the plugin the ID of the layer we want to fetch.
      parent.postMessage(
        { pluginMessage: { type: "fetch-layer-data", id: id } },
        "*"
      );

      props.onErrorUpdate(activeId);

      if (props.visibility === true) {
        props.onVisibleUpdate(false);
      } else {
        props.onVisibleUpdate(true);
      }
    }

    props.onSelectedListUpdate(id);
  };

  const handleOpenFirstError = () => {
    const lastItem = filteredErrorArray[filteredErrorArray.length - 1];
    handleNodeClick(lastItem.id);
  };

  if (props.nodeArray.length) {
    let nodes = props.nodeArray;

    const listItems = nodes.map((node, idx) => [
      <div
        key={node.id + "-title"}
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: "#fff",
          marginTop: idx === 0 ? 24 : 16,
          marginBottom: 8,
          paddingLeft: 16
        }}
      >
        {node.name}
      </div>,
      <ListItem
        ignoredErrorArray={props.ignoredErrorArray}
        activeNodeIds={props.activeNodeIds}
        onClick={handleNodeClick}
        onOpenPanel={props.onOpenPanel}
        selectedListItems={props.selectedListItems}
        errorArray={filteredErrorArray}
        key={node.id}
        node={node}
      />,
      idx < nodes.length - 1 && (
        <div
          key={node.id + "-divider"}
          style={{
            height: 1,
            background: "#444",
            margin: "24px 16px 0 16px",
            border: "none"
          }}
        />
      )
    ]);

    const variants = {
      initial: { opacity: 1, y: 0 },
      enter: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 }
    };

    return (
      <motion.div
        className="page"
        key="node-list"
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <ul className="list">{listItems.flat()}</ul>
        <footer
          className="initial-content-footer analysis-footer"
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center"
          }}
        >
          <button
            className="button button--secondary analysis-refazer"
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => {
              const currentIndex = props.nodeArray.findIndex(n =>
                props.activeNodeIds.includes(n.id)
              );
              if (currentIndex > 0) {
                const prevNode = props.nodeArray[currentIndex - 1];
                if (prevNode) {
                  parent.postMessage(
                    {
                      pluginMessage: {
                        type: "fetch-layer-data",
                        id: prevNode.id
                      }
                    },
                    "*"
                  );
                  props.onSelectedListUpdate(prevNode.id);
                  setTimeout(() => {
                    parent.postMessage(
                      {
                        pluginMessage: {
                          type: "select-layer",
                          nodes: [prevNode.id]
                        }
                      },
                      "*"
                    );
                  }, 100);
                }
              }
            }}
            disabled={(() => {
              const currentIndex = props.nodeArray.findIndex(n =>
                props.activeNodeIds.includes(n.id)
              );
              return currentIndex <= 0;
            })()}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.5 3L6.5 8L10.5 13"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Item anterior
          </button>
          <button
            className="button button--secondary analysis-refazer"
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => {
              const currentIndex = props.nodeArray.findIndex(n =>
                props.activeNodeIds.includes(n.id)
              );
              if (
                currentIndex !== -1 &&
                currentIndex < props.nodeArray.length - 1
              ) {
                const nextNode = props.nodeArray[currentIndex + 1];
                if (nextNode) {
                  parent.postMessage(
                    {
                      pluginMessage: {
                        type: "fetch-layer-data",
                        id: nextNode.id
                      }
                    },
                    "*"
                  );
                  props.onSelectedListUpdate(nextNode.id);
                  setTimeout(() => {
                    parent.postMessage(
                      {
                        pluginMessage: {
                          type: "select-layer",
                          nodes: [nextNode.id]
                        }
                      },
                      "*"
                    );
                  }, 100);
                }
              }
            }}
            disabled={(() => {
              const currentIndex = props.nodeArray.findIndex(n =>
                props.activeNodeIds.includes(n.id)
              );
              return (
                currentIndex === -1 ||
                currentIndex >= props.nodeArray.length - 1
              );
            })()}
          >
            Próximo item
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.5 3L9.5 8L5.5 13"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </footer>
      </motion.div>
    );
  } else {
    return (
      <React.Fragment>
        <ul className="list"></ul>
      </React.Fragment>
    );
  }
}

export default React.memo(NodeList);
