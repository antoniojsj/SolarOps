import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";

import ErrorList from "./ErrorList";
import PanelHeader from "./PanelHeader";
import Preloader from "./Preloader";

import "../styles/panel.css";

// Interface compartilhada entre componentes
interface ErrorItem {
  id: string;
  type?: string;
  message?: string;
  node?: {
    id: string;
    name?: string;
    type?: string;
    [key: string]: any;
  };
  errors?: Array<{
    type: string;
    value?: string;
    message: string;
    [key: string]: any;
  }>;
  property?: string;
  value?: any;
  expected?: any;
  [key: string]: any;
}

interface PanelProps {
  visibility: boolean;
  node: any;
  errorArray: ErrorItem[];
  ignoredErrors: ErrorItem[];
  onIgnoredUpdate: (error: ErrorItem) => void;
  onIgnoreAll: (errors: ErrorItem[]) => void;
  onSelectedListUpdate?: (ids: string[]) => void;
  [key: string]: any;
}

const Panel: React.FC<PanelProps> = props => {
  const isVisible = props.visibility;
  const node = props.node;

  // Filtra os itens que têm erros
  const filteredErrorArray = props.errorArray.filter(
    item => item.errors && item.errors.length >= 1
  );

  // Remove erros que estão na lista de ignorados
  filteredErrorArray.forEach(item => {
    // Verifica se há erros ignorados para este item
    const matchingIgnoredErrors = props.ignoredErrors.filter(
      ignoredError => ignoredError.node?.id === item.id
    );

    if (matchingIgnoredErrors.length > 0 && item.errors) {
      // Para cada erro ignorado, remove-o da lista de erros do item
      matchingIgnoredErrors.forEach(ignoredError => {
        if (ignoredError.value && item.errors) {
          item.errors = item.errors.filter(
            error => error.value !== ignoredError.value
          );
        }
      });
    }
  });

  const activeId = props.errorArray.find(e => e.id === node.id);
  const errors = activeId?.errors || [];

  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  function handlePrevNavigation() {
    if (!activeId || !props.onSelectedListUpdate) return;

    const currentIndex = filteredErrorArray.findIndex(
      item => item.id === activeId?.id
    );

    let nextActiveId: ErrorItem | undefined;

    if (currentIndex === -1) return;

    if (filteredErrorArray[currentIndex + 1] !== undefined) {
      nextActiveId = filteredErrorArray[currentIndex + 1];
    } else if (currentIndex !== 0) {
      nextActiveId = filteredErrorArray[0];
    } else if (currentIndex > 0) {
      nextActiveId = filteredErrorArray[currentIndex - 1];
    }

    if (nextActiveId) {
      props.onSelectedListUpdate([nextActiveId.id]);
      parent.postMessage(
        { pluginMessage: { type: "fetch-layer-data", id: nextActiveId.id } },
        "*"
      );
    }
  }

  function handleNextNavigation() {
    if (!activeId || !props.onSelectedListUpdate) return;

    const currentIndex = filteredErrorArray.findIndex(
      item => item.id === activeId?.id
    );

    if (currentIndex === -1) return;

    const lastIndex = filteredErrorArray.length - 1;
    let nextActiveId: ErrorItem | undefined;

    if (currentIndex > 0) {
      nextActiveId = filteredErrorArray[currentIndex - 1];
    } else if (currentIndex < lastIndex) {
      nextActiveId = filteredErrorArray[lastIndex];
    } else {
      nextActiveId = filteredErrorArray[0];
    }

    if (nextActiveId) {
      props.onSelectedListUpdate([nextActiveId.id]);
      parent.postMessage(
        { pluginMessage: { type: "fetch-layer-data", id: nextActiveId.id } },
        "*"
      );
    }
  }

  // Open and closes the panel.
  function handleChange() {
    props.onClick();
  }

  // Passes the ignored error back to it's parent.
  function handleIgnoreChange(error: ErrorItem) {
    if (props.onIgnoredUpdate) {
      props.onIgnoredUpdate(error);
    }
  }

  // Handles ignoring all errors of the same type
  function handleIgnoreAll(error: ErrorItem) {
    const errorsToBeIgnored: ErrorItem[] = [];

    filteredErrorArray.forEach(node => {
      if (!node.errors) return;

      node.errors.forEach(item => {
        if (item.value === error.value && item.type === error.type) {
          errorsToBeIgnored.push({
            ...error,
            node: {
              id: node.id,
              name: node.node?.name,
              type: node.node?.type
            },
            value: item.value
          });
        }
      });
    });

    if (errorsToBeIgnored.length > 0 && props.onIgnoreAll) {
      props.onIgnoreAll(errorsToBeIgnored);
    }
  }

  // Selects all nodes with the same error
  function handleSelectAll(error: ErrorItem) {
    const nodesToBeSelected: string[] = [];

    filteredErrorArray.forEach(node => {
      if (!node.errors) return;

      node.errors.forEach(item => {
        if (
          item.value === error.value &&
          item.type === error.type &&
          item.node?.id
        ) {
          nodesToBeSelected.push(item.node.id);
        }
      });
    });

    if (nodesToBeSelected.length > 0) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "select-multiple-layers",
            nodeArray: nodesToBeSelected
          }
        },
        "*"
      );
    }
  }

  // We need a conditional statement for rendering in case the user deletes the selected layer.
  return (
    <React.Fragment>
      {activeId !== undefined ? (
        <motion.div
          className="panel panel--fullwidth"
          animate={isVisible ? "open" : "closed"}
          transition={{ duration: 0.3, type: "tween" }}
          variants={variants}
        >
          <PanelHeader
            title={node?.name || "Unnamed Node"}
            handleHide={handleChange}
          />

          <div className="panel-body">
            {errors && errors.length > 0 ? (
              <React.Fragment>
                <div className="error-label">Errors — {errors.length}</div>
                <ErrorList
                  onIgnoredUpdate={handleIgnoreChange}
                  onIgnoreAll={handleIgnoreAll}
                  onSelectAll={handleSelectAll}
                  errors={errors}
                  allErrors={filteredErrorArray}
                  onOpenPanel={(error: ErrorItem) => {
                    if (props.onOpenPanel) props.onOpenPanel(error);
                  }}
                  onFixError={(error: ErrorItem) => {
                    parent.postMessage(
                      {
                        pluginMessage: {
                          type: "apply-styles",
                          error: error,
                          field: "matches",
                          index: 0,
                          count: 1
                        }
                      },
                      "*"
                    );
                  }}
                />
              </React.Fragment>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 1, y: -10, scale: 0 }}
                className="success-message"
              >
                <div className="success-shape">
                  <img
                    className="success-icon"
                    src={require("../assets/smile.svg")}
                  />
                </div>
                All errors fixed in the selection
              </motion.div>
            )}
          </div>

          <div className="panel-footer">
            <button
              onClick={handlePrevNavigation}
              disabled={filteredErrorArray.length <= 1}
              className="button previous button--secondary button--flex"
            >
              ← Previous
            </button>

            <button
              onClick={handleNextNavigation}
              disabled={filteredErrorArray.length <= 1}
              className="button next button--secondary button--flex"
            >
              Next →
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className={`panel panel--fullwidth`}
          animate={isVisible ? "open" : "closed"}
          transition={{ duration: 0.3, type: "tween" }}
          variants={variants}
        >
          <div className="name-wrapper">
            <Preloader />
          </div>
        </motion.div>
      )}
      {isVisible ? (
        <div className="overlay" onClick={handleChange}></div>
      ) : null}
    </React.Fragment>
  );
};

export default React.memo(Panel);
