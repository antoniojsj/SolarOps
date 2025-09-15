import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";

import ListItem from "./ListItem";

interface NodeError {
  id: string;
  errors: Array<{
    type: string;
    value?: string;
    message: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface IgnoredError {
  node?: {
    id: string;
  };
  value?: string;
  [key: string]: any;
}

interface NodeListProps {
  errorArray: NodeError[];
  ignoredErrorArray: IgnoredError[];
  activeNodeIds: string[];
  selectedListItems: string[];
  onOpenPanel: (node: { id: string; [key: string]: any }) => void;
  [key: string]: any;
}

const NodeList: React.FC<NodeListProps> = props => {
  // Reduce the size of our array of errors by removing
  // nodes with no errors on them.
  let filteredErrorArray = props.errorArray.filter(
    item => item && item.errors && item.errors.length >= 1
  );

  filteredErrorArray.forEach(item => {
    // Check each layer/node to see if an error that matches it's layer id
    if (
      item &&
      item.id &&
      props.ignoredErrorArray &&
      props.ignoredErrorArray.some(x => x && x.node && x.node.id === item.id)
    ) {
      // When we know a matching error exists loop over all the ignored
      // errors until we find it.
      props.ignoredErrorArray.forEach(ignoredError => {
        if (
          ignoredError &&
          ignoredError.node &&
          ignoredError.node.id === item.id
        ) {
          // Loop over every error this layer/node until we find the
          // error that should be ignored, then remove it.
          for (let i = 0; i < item.errors.length; i++) {
            if (item.errors[i] && item.errors[i].value === ignoredError.value) {
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

    if (activeId && activeId.errors && activeId.errors.length) {
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

    // Atualizar selectedListItems como um array
    props.onSelectedListUpdate([id]);
  };

  // const handleOpenFirstError = () => {
  //   const lastItem = filteredErrorArray[filteredErrorArray.length - 1];
  //   handleNodeClick(lastItem.id);
  // };

  if (props.nodeArray && props.nodeArray.length) {
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
      </motion.div>
    );
  } else {
    return (
      <React.Fragment>
        <ul className="list"></ul>
      </React.Fragment>
    );
  }
};

export default React.memo(NodeList);
