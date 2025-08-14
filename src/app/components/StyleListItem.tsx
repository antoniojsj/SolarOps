import React, { useState } from "react";
import StyleListItemContent from "./StyleListItemContent";
import { motion } from "framer-motion/dist/framer-motion";

// Duplicate component that matches styleContent but has very small differences to work on the styles page.

function ListItem({ style, index }) {
  const [isOpen, setIsOpen] = useState(false);

  // const handleToggle = () => {
  //   setIsOpen(prevIsOpen => !prevIsOpen);
  // };

  function handleSelectAll(nodeArray) {
    if (!nodeArray) return;

    const arrays = Object.values(nodeArray);

    // Flatten the arrays into a single array using Array.prototype.flat
    const combinedArray = (arrays as any[]).flat();

    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: combinedArray
        }
      },
      "*"
    );
  }

  function handleSelect(nodeArray) {
    if (!nodeArray) return;

    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: nodeArray
        }
      },
      "*"
    );
  }

  function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const listItemClass = isOpen
    ? "overview-list-item"
    : "overview-list-item list-item--open";

  return (
    <li
      className={listItemClass}
      key={`style item - ${style?.name || "unknown"}-${index}`}
    >
      <div className="overview-content">
        <StyleListItemContent
          style={style}
          type={style?.type?.toLowerCase() || "unknown"}
          error={style}
        />
        {style?.groupedConsumers && (
          <motion.img
            whileTap={{ scale: 0.9, opacity: 0.8 }}
            onClick={() => handleSelectAll(style.groupedConsumers)}
            className="overview-icon overview-content-select"
            src={require("../assets/select-all.svg")}
          />
        )}
        {/* <img
          className="overview-icon overview-content-arrow"
          src={require("../assets/chevron.svg")}
        /> */}
      </div>
      {style?.groupedConsumers && (
        <ul className="consumer-sublist">
          {Object.entries(style.groupedConsumers).map(([nodeType, nodeIds]) => (
            <li
              className="consumer-sublist-item"
              key={`${style.name || "unknown"}-${nodeType}`}
              onClick={() => handleSelect(nodeIds)}
            >
              <img
                className="sublist-item-icon"
                src={require(`../assets/${nodeType.toLowerCase()}.svg`)}
              />
              <span className="sublist-item-label">
                <span className="sublist-item-count">
                  {Array.isArray(nodeIds) ? nodeIds.length : 0}
                </span>{" "}
                {capitalizeFirstLetter(nodeType)} Layers
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default ListItem;
