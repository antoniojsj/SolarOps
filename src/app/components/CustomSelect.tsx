import * as React from "react";
import { useState, useRef, useEffect } from "react";
import StyleContent from "./StyleContent";

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

const CustomSelect = ({
  error,
  suggestions,
  onSelectSuggestion,
  selectedIndex
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();

  useOnClickOutside(ref, () => setIsOpen(false));

  const handleSelect = (index: number) => {
    onSelectSuggestion(index);
    setIsOpen(false);
  };

  const selectedSuggestion =
    selectedIndex !== null ? suggestions[selectedIndex] : null;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div
        className="custom-select__trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {selectedSuggestion ? (
          <StyleContent
            style={selectedSuggestion}
            type={error.type.toLowerCase()}
            error={error}
          />
        ) : (
          <span>Selecione o token</span>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" />
        </svg>
      </div>
      {isOpen && (
        <ul
          className="custom-select__options"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#2c2c2c",
            borderRadius: "4px",
            padding: "4px",
            margin: "4px 0 0 0",
            listStyle: "none",
            zIndex: 10,
            border: "1px solid #444"
          }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(index)}
              style={{
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
              className="custom-select__option"
            >
              <StyleContent
                style={suggestion}
                type={error.type.toLowerCase()}
                error={error}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
