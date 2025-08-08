import * as React from "react";
import { useState, useRef, useEffect } from "react";

function ErrorListItem(props) {
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

  function handleIgnoreChange(error) {
    props.handleIgnoreChange(error);
  }

  function handleSelectAll(error) {
    props.handleSelectAll(error);
  }

  function handleIgnoreAll(error) {
    props.handleIgnoreAll(error);
  }

  return (
    <li className="error-list-item" ref={ref} style={{ userSelect: "none" }}>
      <div
        className="flex-row"
        style={{ alignItems: "center", position: "relative" }}
      >
        <span className="error-type">
          <img
            src={require("../assets/error-type/" +
              error.type.toLowerCase() +
              ".svg")}
          />
        </span>
        <span className="error-description">
          <div className="error-description__message">{error.message}</div>
          {error.value ? (
            <div className="current-value">{error.value}</div>
          ) : null}
        </span>
        <button
          className="auto-fix-button"
          style={{ marginLeft: "auto" }}
          onClick={e => {
            e.stopPropagation();
            if (props.onFixError) props.onFixError(error);
          }}
        >
          Ajustar
        </button>
      </div>
    </li>
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

export default ErrorListItem;
