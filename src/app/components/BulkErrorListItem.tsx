import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";
import StyleContent from "./StyleContent";
import "../styles/modal.css";

const DEBUG = false;

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = event => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    // Mark touchstart as passive to avoid scroll blocking
    document.addEventListener("touchstart", listener, { passive: true } as any);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener as any);
    };
  }, [ref, handler]);
}

function truncate(string) {
  if (!string) return "";
  return string.length > 35 ? string.substring(0, 35) + "..." : string;
}

function BulkErrorListItem(props) {
  const { error, libraries = [] } = props;
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
  const hasSuggestions = Boolean(
    error.suggestions && error.suggestions.length > 0
  );
  const hasMatches = Boolean(error.matches && error.matches.length > 0);
  // Fallback: busca tokens nas libraries quando não houver suggestions/matches
  const getLibraryOptionsByType = (type: string): any[] => {
    if (!Array.isArray(libraries)) return [];
    const lower = (type || "").toLowerCase();
    // Normaliza sinônimos comuns
    const normalized =
      lower === "color" || lower === "colors"
        ? "fill"
        : lower === "border" || lower === "borders"
        ? "stroke"
        : lower === "typography"
        ? "text"
        : lower === "effect"
        ? "effects"
        : lower;
    try {
      if (normalized === "fill") {
        return libraries
          .flatMap((lib: any) => lib?.fills || [])
          .filter(Boolean);
      }
      if (normalized === "stroke") {
        // Strokes usam PaintStyles também
        return libraries
          .flatMap((lib: any) => lib?.fills || [])
          .filter(Boolean);
      }
      if (normalized === "effects") {
        return libraries
          .flatMap((lib: any) => lib?.effects || [])
          .filter(Boolean);
      }
      if (normalized === "text") {
        return libraries.flatMap((lib: any) => lib?.text || []).filter(Boolean);
      }
    } catch (e) {
      console.warn(
        "[BulkErrorListItem] Falha ao extrair opções das libraries",
        e
      );
    }
    return [];
  };

  const libOptions = React.useMemo(() => getLibraryOptionsByType(error.type), [
    error.type,
    libraries
  ]);
  const initialOptions = hasSuggestions
    ? error.suggestions
    : hasMatches
    ? error.matches
    : libOptions;
  const [options, setOptions] = useState<any[]>(initialOptions);
  const didLoadRef = useRef<boolean>(false);
  // Sincroniza quando o erro muda
  useEffect(() => {
    // Atualiza apenas quando o nó ou o tipo mudarem (evita loops por novas referências de arrays)
    setOptions(initialOptions);
    // Reset flag quando muda o item
    didLoadRef.current = initialOptions && initialOptions.length > 0;
    if (DEBUG)
      console.log("[BulkErrorListItem] Sync options on error change", {
        nodeId: error.nodeId,
        type: error.type,
        initialOptionsCount: initialOptions ? initialOptions.length : 0,
        hasSuggestions,
        hasMatches,
        hasLibOptions: libOptions && libOptions.length > 0
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error.nodeId, error.type]);

  // Removido auto-fetch em massa: sugestões serão buscadas sob demanda (clique)

  // Ouve respostas do plugin com sugestões e atualiza as opções deste item
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event?.data?.pluginMessage;
      if (!msg || !msg.type) return;
      if (msg.type === "fetched-suggestions") {
        const pmError = msg.error || {};
        const sameNode = pmError.nodeId === error.nodeId;
        const sameType = (pmError.type || pmError.errorType) === error.type;
        if (sameNode && sameType) {
          const incoming =
            Array.isArray(msg.suggestions) && msg.suggestions.length > 0
              ? msg.suggestions
              : Array.isArray(msg.matches) && msg.matches.length > 0
              ? msg.matches
              : [];
          if (incoming.length > 0) {
            // Evita setar caso as opções já sejam iguais (shallow check por id/len)
            const sameLength = options && options.length === incoming.length;
            const sameFirstId =
              sameLength &&
              options[0] &&
              incoming[0] &&
              options[0].id === incoming[0].id;
            if (!sameLength || !sameFirstId) {
              setOptions(incoming);
              didLoadRef.current = true;
            }
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [error.nodeId, error.type]);
  // Permite abrir dropdown para mais tipos, mesmo quando sugestões são carregadas de forma dinâmica
  const canOpenDropdown = Boolean(
    hasSuggestions ||
      (options && options.length > 0) ||
      (error.type &&
        [
          "radius",
          "gap",
          "padding",
          "fill",
          "stroke",
          "border",
          "effects",
          "text"
        ].includes((error.type || "").toLowerCase())) ||
      ["color", "colors", "typography", "effect"].includes(
        (error.type || "").toLowerCase()
      )
  );
  const selectedSuggestion =
    selectedSuggestionIndex !== null &&
    options &&
    options[selectedSuggestionIndex]
      ? options[selectedSuggestionIndex]
      : null;

  // Debug: Log para verificar as sugestões e o estado do dropdown
  if (DEBUG)
    console.log(`[BulkErrorListItem] Erro tipo: ${error.type}`, {
      hasSuggestions,
      hasMatches,
      suggestionsCount: error.suggestions ? error.suggestions.length : 0,
      matchesCount: error.matches ? error.matches.length : 0,
      optionsCount: options.length,
      options: options
        ? options.map((s, i) => ({
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

  if (DEBUG && hasSuggestions) {
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
              const hasValidSuggestions = hasSuggestions || hasMatches;

              if (DEBUG)
                console.log(
                  `[BulkErrorListItem] Dropdown clicado - Tipo: ${error.type}`,
                  {
                    hasValidSuggestions,
                    hasSuggestions,
                    hasMatches,
                    suggestionsCount: error.suggestions
                      ? error.suggestions.length
                      : 0,
                    matchesCount: error.matches ? error.matches.length : 0,
                    isDropdownOpen: !isDropdownOpen,
                    errorType: error.type,
                    errorProperty: error.property,
                    errorKeys: Object.keys(error),
                    errorValue: error.value,
                    errorNodeId: error.nodeId,
                    errorNodeName: error.nodeName
                  }
                );
              // Solicita sugestões ao plugin quando não houver opções
              if (
                canOpenDropdown &&
                (!options || options.length === 0) &&
                !didLoadRef.current
              ) {
                parent.postMessage(
                  { pluginMessage: { type: "fetch-suggestions", error } },
                  "*"
                );
              }
              setIsDropdownOpen(!isDropdownOpen);
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              border: "1px solid #444",
              borderRadius: "4px",
              cursor: canOpenDropdown ? "pointer" : "default",
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
            {canOpenDropdown && (
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
          {/* dropdown render está abaixo; bloco duplicado removido */}
          {isDropdownOpen && canOpenDropdown && (
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
              {options && options.length > 0 ? (
                options.map((suggestion, index) => (
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
                ))
              ) : (
                <li
                  style={{
                    padding: "8px",
                    color: "#B3B3B3",
                    fontStyle: "italic"
                  }}
                >
                  Nenhum token disponível para este item
                </li>
              )}
            </ul>
          )}
        </div>

        {canOpenDropdown && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <button
              onClick={() => {
                // Garante que o apply use as opções locais como suggestions
                const errorWithOptions = { ...error } as any;
                if (
                  !errorWithOptions.suggestions ||
                  errorWithOptions.suggestions.length === 0
                ) {
                  errorWithOptions.suggestions = options || [];
                }
                handleSuggestion(errorWithOptions, selectedSuggestionIndex);
              }}
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

export default React.memo(BulkErrorListItem);
