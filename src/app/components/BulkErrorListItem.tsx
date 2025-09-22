import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";
import StyleContent from "./StyleContent";
import "../styles/modal.css";

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

function truncate(string) {
  if (!string) return "";
  return string.length > 35 ? string.substring(0, 35) + "..." : string;
}

function BulkErrorListItem(props) {
  const { error } = props;
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<
    number | null
  >(null);
  const [isSelectIconHovered, setIsSelectIconHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useOnClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  function handleSelect(error) {
    props.handleSelect(error);
  }

  function handleSuggestion(error, index) {
    props.handleSuggestion(error, index);
  }

  const handleSelectSuggestion = (index: number) => {
    setSelectedSuggestionIndex(index);
    setIsDropdownOpen(false);
  };

  const variants = {
    initial: { opacity: 0, y: -12, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 12, scale: 1 }
  };

  const nodeId =
    error.nodeId || (error.node && error.node.id) || `error-${props.index}`;
  const clipPathId = `clip_bulk_select_all_${props.index}`;
  // Verifica se há sugestões disponíveis para o erro atual
  const hasSuggestions =
    (error.suggestions && error.suggestions.length > 0) || // Verifica sugestões diretas
    (error.type && ["radius", "gap"].includes(error.type) && error.property); // Verifica se é um erro de radius ou gap com propriedade definida
  const selectedSuggestion =
    selectedSuggestionIndex !== null &&
    error.suggestions &&
    error.suggestions[selectedSuggestionIndex]
      ? error.suggestions[selectedSuggestionIndex]
      : null;

  // Debug: Log para verificar as sugestões e o estado do dropdown
  console.log(`[BulkErrorListItem] Erro tipo: ${error.type}`, {
    hasSuggestions,
    suggestionsCount: error.suggestions ? error.suggestions.length : 0,
    suggestions: error.suggestions
      ? error.suggestions.map((s, i) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          hasPaint: !!s.paint,
          paintType: s.paint ? s.paint.type : "no-paint",
          keys: Object.keys(s),
          index: i
        }))
      : "no-suggestions",
    isDropdownOpen,
    errorKeys: Object.keys(error),
    errorType: typeof error,
    errorString: JSON.stringify(error, null, 2)
  });

  if (hasSuggestions) {
    console.log(
      `[BulkErrorListItem] Detalhes das sugestões para ${error.type}:`,
      {
        firstSuggestion: error.suggestions[0],
        firstSuggestionKeys: error.suggestions[0]
          ? Object.keys(error.suggestions[0])
          : "no-first-suggestion",
        firstSuggestionType: error.suggestions[0]
          ? typeof error.suggestions[0]
          : "no-type",
        firstSuggestionString: error.suggestions[0]
          ? JSON.stringify(error.suggestions[0], null, 2)
          : "no-suggestion-string"
      }
    );
  }

  return (
    <motion.li
      className="error-list-item"
      positionTransition
      key={nodeId + props.index}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{
        display: "block", // Force block display
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "white",
        marginBottom: "8px",
        boxShadow: "none",
        padding: "12px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: "16px" // Force gap
        }}
      >
        <div
          className="error-description__message"
          style={{ fontWeight: 400, color: "white", textAlign: "left" }}
        >
          {error.message}
        </div>
        <button
          onClick={() => handleSelect(error)}
          onMouseEnter={() => setIsSelectIconHovered(true)}
          onMouseLeave={() => setIsSelectIconHovered(false)}
          style={{
            background: isSelectIconHovered
              ? "rgba(255, 255, 255, 0.1)"
              : "none",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path={`url(#${clipPathId})`}>
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M7.5 6V3.025C5.138 3.259 3.26 5.138 3.025 7.5H6V8.5H3.025C3.259 10.862 5.138 12.74 7.5 12.975V10H8.5V12.975C10.862 12.741 12.74 10.862 12.975 8.5H10V7.5H12.975C12.741 5.138 10.862 3.26 8.5 3.025V6H7.5ZM13.98 7.5C13.739 4.585 11.415 2.261 8.5 2.02V0H7.5V2.02C4.585 2.261 2.261 4.585 2.02 7.5H0V8.5H2.02C2.261 11.415 4.585 13.739 7.5 13.98V16H8.5V13.98C11.415 13.739 13.739 11.415 13.98 8.5H16V7.5H13.98Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id={clipPathId}>
                <rect width="16" height="16" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>

      <div style={{ display: "block", width: "100%" }}>
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
          <div
            className="custom-select__trigger"
            onClick={e => {
              // Para erros do tipo 'radius' ou 'gap', verifica se há sugestões disponíveis ou se há uma propriedade definida
              const hasValidSuggestions =
                (error.suggestions && error.suggestions.length > 0) ||
                (error.type &&
                  ["radius", "gap"].includes(error.type) &&
                  error.property);

              console.log(
                `[BulkErrorListItem] Dropdown clicado - Tipo: ${error.type}`,
                {
                  hasValidSuggestions,
                  hasSuggestions,
                  suggestionsCount: error.suggestions
                    ? error.suggestions.length
                    : 0,
                  isDropdownOpen: !isDropdownOpen,
                  errorType: error.type,
                  errorProperty: error.property,
                  errorKeys: Object.keys(error),
                  errorValue: error.value,
                  errorNodeId: error.nodeId,
                  errorNodeName: error.nodeName
                }
              );

              // Permite abrir o dropdown para erros de radius e gap mesmo sem sugestões diretas
              // pois as sugestões serão carregadas do contexto
              if (hasValidSuggestions) {
                console.log(
                  `[BulkErrorListItem] Abrindo dropdown para tipo: ${error.type}`,
                  {
                    suggestions: error.suggestions
                      ? error.suggestions.map(s => ({
                          id: s.id,
                          name: s.name,
                          type: s.type,
                          value: s.value,
                          hasPaint: !!s.paint,
                          paintType: s.paint ? s.paint.type : "no-paint",
                          keys: s ? Object.keys(s) : []
                        }))
                      : "no-suggestions",
                    error: {
                      type: error.type,
                      property: error.property,
                      nodeId: error.nodeId,
                      nodeName: error.nodeName,
                      value: error.value
                    }
                  }
                );
                setIsDropdownOpen(!isDropdownOpen);
              } else {
                console.warn(
                  `[BulkErrorListItem] Nenhuma sugestão disponível para tipo: ${error.type}`,
                  {
                    errorType: error.type,
                    hasSuggestions,
                    errorKeys: Object.keys(error),
                    errorValue: error.value,
                    errorNodeId: error.nodeId,
                    errorNodeName: error.nodeName
                  }
                );
              }
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              border: "1px solid #444",
              borderRadius: "4px",
              cursor: hasSuggestions ? "pointer" : "default",
              height: "32px"
            }}
          >
            {selectedSuggestion ? (
              <StyleContent
                style={selectedSuggestion}
                type={error.type.toLowerCase()}
                error={error}
              />
            ) : (
              <span className="style-name">
                {truncate(error.value) || "Valor inválido"}
              </span>
            )}
            {hasSuggestions && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
              >
                <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" />
              </svg>
            )}
          </div>
          {isDropdownOpen && hasSuggestions && (
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
                border: "1px solid #444",
                maxHeight: "200px",
                overflowY: "auto"
              }}
            >
              {error.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectSuggestion(index)}
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

        {hasSuggestions && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <button
              onClick={() => handleSuggestion(error, selectedSuggestionIndex)}
              disabled={selectedSuggestionIndex === null}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor:
                  selectedSuggestionIndex !== null ? "#3b82f6" : "#555",
                color: "white",
                cursor:
                  selectedSuggestionIndex !== null ? "pointer" : "not-allowed",
                height: "32px",
                flexShrink: 0
              }}
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </motion.li>
  );
}

export default BulkErrorListItem;
