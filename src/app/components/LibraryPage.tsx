import * as React from "react";
import { motion, AnimatePresence } from "framer-motion/dist/framer-motion";
import "../styles/library.css";
import { useState, useEffect, useCallback } from "react";

const LibraryPage = ({
  libraries = [],
  onUpdateLibraries,
  localStyles,
  activeComponentLibraries = []
}) => {
  console.log("[LibraryPage] Renderizando. Bibliotecas recebidas:", libraries);
  // const hasLibraries = libraries && libraries.length > 0;

  const onLibraryImport = () => {
    parent.postMessage({ pluginMessage: { type: "save-library" } }, "*");
  };

  const removeLibrary = async index => {
    // Remove the library from the libraries array
    const updatedLibraries = [...libraries];
    updatedLibraries.splice(index, 1);

    // Update the state with the new libraries array
    onUpdateLibraries(updatedLibraries);

    // Send a message to the plugin layer to remove the library from client storage
    parent.postMessage(
      {
        pluginMessage: {
          type: "remove-library",
          index: index,
          storageArray: updatedLibraries
        }
      },
      "*"
    );
  };

  const variants = {
    initial: { opacity: 0, y: -12, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 1 }
  };

  const styles = localStyles && localStyles.styles ? localStyles.styles : [];

  const [localActiveLibs, setLocalActiveLibs] = useState(
    activeComponentLibraries
  );

  useEffect(() => {
    setLocalActiveLibs(activeComponentLibraries);
  }, [activeComponentLibraries]);

  // Função para buscar apenas as bibliotecas ativas
  const handleFetchLibraries = useCallback(() => {
    const handler = event => {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === "fetched-active-libraries") {
        setLocalActiveLibs(pluginMessage.activeComponentLibraries || []);
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
    parent.postMessage(
      { pluginMessage: { type: "fetch-active-libraries" } },
      "*"
    );
  }, []);

  // Agora cada item tem: name, count, componentKeys
  const sortedLibraries = [...localActiveLibs].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  // Função para copiar o key da biblioteca
  // const [copiedKey, setCopiedKey] = useState("");
  // const handleCopyKey = key => {
  //   navigator.clipboard.writeText(key);
  //   setCopiedKey(key);
  //   setTimeout(() => setCopiedKey(""), 1500);
  // };

  // Função para rodar a análise
  // const handleRunAnalysis = () => {
  //   parent.postMessage({ pluginMessage: { type: "run-app" } }, "*");
  // };

  return (
    <div className="library-wrapper" style={{ color: "#fff" }}>
      <div className="library-description">
        <h4 className="library-title">Local Styles</h4>
        <p>
          Design Lint uses styles found in your file for suggestions and
          automatic fixes first.
        </p>
      </div>
      <ul className="library-list">
        <li className="library-list-item" key="local-styles">
          <div className="library-icon-wrapper">
            <img
              className="library-icon"
              src={require("../assets/map-marker.svg")}
            />
          </div>
          <div className="library-list-item-content" style={{ color: "#fff" }}>
            <h3 className="item-content-title">Local Styles</h3>
            <span className="item-content-styles">{styles.length} styles</span>
          </div>
        </li>
      </ul>
      <div className="library-description library-saved-section">
        <h4 className="library-title">Bibliotecas de Componentes Ativas</h4>
        {sortedLibraries.length > 0 ? (
          <div>
            {/* Renderizar cada biblioteca remota única como card */}
            {sortedLibraries.length > 0 && (
              <ul className="library-list">
                {sortedLibraries.map(lib => (
                  <li
                    className="library-list-item"
                    key={lib.name}
                    style={{ alignItems: "center" }}
                  >
                    <div className="library-icon-wrapper">
                      <img
                        className="library-icon"
                        src={require("../assets/library.svg")}
                        alt={lib.name}
                      />
                    </div>
                    <div
                      className="library-list-item-content"
                      style={{ color: "#fff", flex: 1 }}
                    >
                      <h3
                        className="item-content-title"
                        style={{ fontSize: 15 }}
                      >
                        {lib.name}
                      </h3>
                      <span
                        className="item-content-styles"
                        style={{ fontSize: 13, color: "#aaa" }}
                      >
                        {lib.count} instância{lib.count === 1 ? "" : "s"}
                      </span>
                      {lib.componentKeys && lib.componentKeys.length > 0 && (
                        <span
                          className="item-content-styles"
                          style={{
                            fontSize: 11,
                            color: "#888",
                            display: "block",
                            marginTop: 4
                          }}
                        >
                          Keys:{" "}
                          {lib.componentKeys.map(key => (
                            <span
                              key={key}
                              style={{
                                fontFamily: "monospace",
                                marginRight: 6
                              }}
                              title={key}
                            >
                              {key.slice(0, 8)}...
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div
            style={{
              color: "#aaa",
              fontSize: 13,
              marginBottom: 8,
              textAlign: "center",
              padding: 24
            }}
          >
            <img
              src={require("../assets/library.svg")}
              style={{ opacity: 0.2, width: 48, marginBottom: 8 }}
            />
            <div style={{ marginBottom: 12 }}>
              Nenhuma biblioteca de componentes remotos detectada neste arquivo.
            </div>
            <button
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 8
              }}
              onClick={handleFetchLibraries}
              type="button"
              tabIndex={0}
            >
              Buscar bibliotecas ativas
            </button>
            <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
              Clique para buscar as bibliotecas de componentes ativas deste
              arquivo.
            </div>
          </div>
        )}
      </div>

      <ul className="library-list">
        <AnimatePresence mode="popLayout">
          {libraries.map((library, index) => (
            <motion.li
              className="library-list-item"
              key={index}
              positionTransition
              variants={variants}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <div className="library-icon-wrapper">
                <img
                  className="library-icon"
                  src={require("../assets/library.svg")}
                />
              </div>
              <div
                className="library-list-item-content"
                style={{ color: "#fff" }}
              >
                <h3 className="item-content-title">{library.name}</h3>
                <span className="item-content-styles">
                  {library.styles} styles
                </span>
              </div>
              <motion.button
                onClick={() => removeLibrary(index)}
                className="icon icon--button library-remove"
                whileTap={{ scale: 0.9, opacity: 0.8 }}
              >
                <img src={require("../assets/subtract.svg")} />
              </motion.button>
            </motion.li>
          ))}
          <motion.li
            className="library-list-item save-library"
            key="import"
            positionTransition
            onClick={onLibraryImport}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
            variants={variants}
            initial="enter"
            animate="enter"
            exit="exit"
          >
            <div className="library-icon-wrapper">
              <img
                className="library-icon"
                src={require("../assets/add-blue.svg")}
              />
            </div>
            <h3 className="save-library-label" style={{ color: "#fff" }}>
              Save Library
            </h3>
          </motion.li>
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default LibraryPage;
