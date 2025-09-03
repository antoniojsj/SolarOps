import * as React from "react";
import StyleContent from "./StyleContent";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";
import SuggestionButton from "./SuggestionButton";
import "../styles/modal.css";

function BulkErrorListItem(props) {
  const ref = useRef();
  const [menuState, setMenuState] = useState(false);
  let error = props.error;

  useOnClickOutside(ref, () => hideMenu());

  const showMenu = () => {
    setMenuState(true);
  };

  const hideMenu = () => {
    setMenuState(false);
  };

  function handlePanelVisible(boolean, error, index) {
    props.handlePanelVisible(boolean, error, index);
  }

  function handleIgnoreChange(error) {
    props.handleIgnoreChange(error);
  }

  function handleSelectAll(error) {
    props.handleSelectAll(error);
  }

  function handleSelect(error) {
    props.handleSelect(error);
  }

  function handleIgnoreAll(error) {
    props.handleIgnoreAll(error);
  }

  function handleBorderRadiusUpdate(value) {
    props.handleBorderRadiusUpdate(value);
  }

  function handleCreateStyle(error) {
    if (error.value !== "Mixed values") {
      props.handleCreateStyle(error);
    } else {
      parent.postMessage(
        {
          pluginMessage: {
            type: "notify-user",
            message: "Sorry! You can't create styles from mixed fill values."
          }
        },
        "*"
      );
    }
  }

  function handleSuggestion(error, index) {
    props.handleSuggestion(error, index);
  }

  function truncate(string) {
    if (!string) return "";
    return string.length > 46 ? string.substring(0, 46) + "..." : string;
  }

  const variants = {
    initial: { opacity: 0, y: -12, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 12, scale: 1 }
  };

  const hasNoMatches = !error.matches || error.matches.length === 0;
  const errorTypeIsNotRadius = error.type !== "radius";

  const nodeId =
    error.nodeId || (error.node && error.node.id) || `error-${props.index}`;

  const errorType = error.type || "unknown";
  const errorMessage = error.message || "Erro desconhecido";
  const errorValue = error.value || "";
  const errorNodes = error.nodes || [];
  const errorCount = error.count || 1;

  return (
    <motion.li
      className="error-list-item"
      positionTransition
      key={nodeId + props.index}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      type={errorType.toLowerCase()}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "white"
      }}
    >
      <div className="flex-row" ref={ref} onClick={showMenu}>
        <span className="error-description">
          {errorNodes.length > 1 ? (
            <div
              className="error-description__message"
              style={{ fontWeight: 400, color: "white" }}
            >
              {errorMessage}{" "}
              <span className="error-description__count">· ({errorCount})</span>
            </div>
          ) : (
            <div
              className="error-description__message"
              style={{ fontWeight: 400, color: "white" }}
            >
              {errorMessage}
            </div>
          )}
          {errorValue ? (
            <div
              className="current-value tooltip"
              data-text="Tooltip"
              style={{ color: "white" }}
            >
              {truncate(errorValue)}
            </div>
          ) : null}
        </span>
        <motion.span
          whileTap={{ scale: 0.98, opacity: 0.8 }}
          className="context-icon"
        >
          <div className="menu" ref={ref}>
            <div className="menu-trigger" onClick={showMenu}>
              <img src={require("../assets/context.svg")} />
            </div>
          </div>
        </motion.span>

        {errorNodes.length > 1 ? (
          <ul
            className={
              "menu-items select-menu__list " +
              (menuState ? "select-menu__list--active" : "")
            }
          >
            <li
              className="select-menu__list-item"
              key="list-item-1"
              onClick={event => {
                event.stopPropagation();
                handleSelectAll(error);
                hideMenu();
              }}
            >
              Select All ({errorCount})
            </li>
            <li
              className="select-menu__list-item"
              key="list-item-3"
              onClick={event => {
                event.stopPropagation();
                handleIgnoreAll(error);
                hideMenu();
              }}
            >
              Ignore All
            </li>
            {errorTypeIsNotRadius && hasNoMatches && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-create-style"
                onClick={event => {
                  event.stopPropagation();
                  handleCreateStyle(error);
                  hideMenu();
                }}
              >
                Create Style
              </li>
            )}
            {errorType === "radius" && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-radius"
                onClick={event => {
                  event.stopPropagation();
                  handleBorderRadiusUpdate(errorValue);
                  hideMenu();
                }}
              >
                Allow This Radius
              </li>
            )}
          </ul>
        ) : (
          <ul
            className={
              "menu-items select-menu__list " +
              (menuState ? "select-menu__list--active" : "")
            }
          >
            <li
              className="select-menu__list-item"
              key="list-item-1"
              onClick={event => {
                event.stopPropagation();
                handleSelect(error);
                hideMenu();
              }}
            >
              Select
            </li>
            <li
              className="select-menu__list-item"
              key="list-item-2"
              onClick={event => {
                event.stopPropagation();
                handleIgnoreChange(error);
                hideMenu();
              }}
            >
              Ignore
            </li>
            {errorTypeIsNotRadius && hasNoMatches && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-create-style"
                onClick={event => {
                  event.stopPropagation();
                  handleCreateStyle(error);
                  hideMenu();
                }}
              >
                Create Style
              </li>
            )}
            {errorType === "radius" && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-radius"
                onClick={event => {
                  event.stopPropagation();
                  handleBorderRadiusUpdate(errorValue);
                  hideMenu();
                }}
              >
                Allow This Radius
              </li>
            )}
          </ul>
        )}
      </div>
      {error.suggestions && (
        <>
          <span
            className="suggestion-label"
            style={{ fontSize: "12px", color: "white" }}
          >
            Sugestões
          </span>
          <div
            className="auto-fix-suggestion"
            style={{
              backgroundColor: "transparent",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <div
              className="auto-fix-style auto-fix-style-clickable"
              onClick={event => {
                event.stopPropagation();
                handlePanelVisible(true, error, 0);
              }}
            >
              <StyleContent
                style={error.suggestions[0]}
                type={errorType.toLowerCase()}
                error={error}
              />
            </div>
            <SuggestionButton
              error={error}
              index={0}
              applyStyle={handleSuggestion}
            />
          </div>
          {error.suggestions[1] && (
            <div
              className="auto-fix-suggestion suggestion-last"
              style={{
                backgroundColor: "transparent",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <div
                className="auto-fix-style auto-fix-style-clickable"
                onClick={event => {
                  event.stopPropagation();
                  handlePanelVisible(true, error, 1);
                }}
              >
                <StyleContent
                  style={error.suggestions[1]}
                  type={errorType.toLowerCase()}
                  error={error}
                />
              </div>
              <SuggestionButton
                error={error}
                index={1}
                applyStyle={handleSuggestion}
              />
            </div>
          )}
        </>
      )}
    </motion.li>
  );
}

// React hook click outside the component
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = event => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default BulkErrorListItem;
