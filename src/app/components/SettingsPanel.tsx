import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import AnalysisResultsCard from "./AnalysisResultsCard";
import "../styles/panel.css";

function SettingsPanel(props) {
  const [loading, setLoading] = React.useState(false);
  const [libs, setLibs] = React.useState(props.activeComponentLibraries || []);

  React.useEffect(() => {
    setLibs(props.activeComponentLibraries || []);
  }, [props.activeComponentLibraries]);

  function handleHide() {
    if (props.onHandlePanelVisible) {
      props.onHandlePanelVisible(false);
    }
  }

  // Handler para buscar bibliotecas de tokens
  function handleFetchLibraries() {
    setLoading(true);
    function handler(event) {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === "fetched-token-libraries") {
        setLibs(pluginMessage.tokenLibraries || []);
        setLoading(false);
        window.removeEventListener("message", handler);
      }
    }
    window.addEventListener("message", handler);
    parent.postMessage(
      { pluginMessage: { type: "fetch-token-libraries" } },
      "*"
    );
  }

  // Função utilitária para agrupar tokens por subcategoria (antes da barra)
  function groupTokensBySubcategory(tokens) {
    const groups = {};
    tokens.forEach(token => {
      const [group, ...rest] = token.name.split("/");
      if (rest.length > 0) {
        if (!groups[group]) groups[group] = [];
        // Remove o prefixo do nome para exibir só o nome do token
        groups[group].push({ ...token, name: rest.join("/").trim() });
      } else {
        if (!groups["__root__"]) groups["__root__"] = [];
        groups["__root__"].push(token);
      }
    });
    return groups;
  }

  // Accordion para tokens por categoria (estilo Figma, com subcategorias e layout refinado)
  function TokenAccordion({ category, tokens, level = 0 }) {
    const [open, setOpen] = React.useState(false);
    const grouped = groupTokensBySubcategory(tokens);
    const groupKeys = Object.keys(grouped).filter(k => k !== "__root__");
    return (
      <div style={{ width: "100%", paddingLeft: level * 18 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            background: "none",
            border: "none",
            color: "#fff",
            padding: 0,
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 500,
            minHeight: 36,
            marginBottom: 0,
            borderRadius: 0,
            outline: "none",
            transition: "background 0.2s",
            justifyContent: "flex-start"
          }}
        >
          <span
            style={{ display: "flex", alignItems: "center", marginRight: 8 }}
          >
            <img
              src={require("../assets/chevron.svg")}
              alt="expand"
              style={{
                width: 16,
                height: 16,
                filter: "invert(80%)",
                marginRight: 8,
                transition: "transform 0.2s",
                // Chevron right: fechado (rotate(-90deg)), aberto para baixo (rotate(0deg))
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                display: "inline-block",
                verticalAlign: "middle"
              }}
            />
            <span style={{ color: "#bdbdbd", fontWeight: 600 }}>
              {category}
            </span>
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ color: "#aaa", fontWeight: 400, fontSize: 14 }}>
            {tokens.length}
          </span>
        </button>
        {open && (
          <ul style={{ listStyle: "none", margin: 0, padding: "0 0 8px 0" }}>
            {/* Tokens sem grupo (sem barra) */}
            {grouped["__root__"] &&
              grouped["__root__"].map((token, i) => {
                // Detecta tipo do token para ícone
                const isTokenText =
                  token.style || token.fontSize || token.fontFamily;
                const isTokenEffect =
                  token.effects ||
                  (category && category.toLowerCase().includes("effect"));
                const isTokenStroke =
                  token.strokeWeight !== undefined ||
                  (category && category.toLowerCase().includes("stroke"));
                const isTokenColor =
                  !isTokenText &&
                  !isTokenEffect &&
                  (token.value !== undefined || token.color !== undefined);
                return (
                  <li
                    key={token.name + i}
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 28,
                      padding: "2px 0",
                      paddingLeft: (level + 1) * 18 // recuo visual para tokens conforme o nível
                    }}
                  >
                    {isTokenText && (
                      <img
                        src={require("../assets/text.svg")}
                        alt="text token"
                        style={{
                          width: 18,
                          height: 18,
                          opacity: 0.8,
                          marginRight: 8
                        }}
                      />
                    )}
                    {isTokenColor && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: (() => {
                            if (typeof token.value === "string")
                              return token.value;
                            if (typeof token.color === "string")
                              return token.color;
                            const c = token.value || token.color;
                            if (
                              c &&
                              typeof c === "object" &&
                              c.r !== undefined &&
                              c.g !== undefined &&
                              c.b !== undefined
                            ) {
                              const r = Math.round((c.r ?? 0) * 255);
                              const g = Math.round((c.g ?? 0) * 255);
                              const b = Math.round((c.b ?? 0) * 255);
                              const a = c.a !== undefined ? c.a : 1;
                              return `rgba(${r},${g},${b},${a})`;
                            }
                            return "#fff";
                          })(),
                          border: "1.5px solid #222",
                          marginRight: 8
                        }}
                      />
                    )}
                    {isTokenStroke && !isTokenColor && (
                      <img
                        src={require("../assets/stroke.svg")}
                        alt="stroke token"
                        style={{
                          width: 18,
                          height: 18,
                          opacity: 0.8,
                          marginRight: 8,
                          filter: "invert(80%)"
                        }}
                      />
                    )}
                    {isTokenEffect &&
                      !isTokenText &&
                      !isTokenColor &&
                      !isTokenStroke && (
                        <img
                          src={require("../assets/drop-shadow.svg")}
                          alt="effect token"
                          style={{
                            width: 18,
                            height: 18,
                            opacity: 0.8,
                            marginRight: 8,
                            filter: "invert(80%)"
                          }}
                        />
                      )}
                    <span>{token.name}</span>
                    {token.info && (
                      <span
                        style={{
                          color: "#bdbdbd",
                          fontSize: 12,
                          marginLeft: 8
                        }}
                      >
                        {token.info}
                      </span>
                    )}
                  </li>
                );
              })}
            {/* Grupos de subcategoria (accordion aninhado) */}
            {groupKeys.map(group => (
              <li key={group} style={{ padding: 0, margin: 0 }}>
                <TokenAccordion
                  category={group}
                  tokens={grouped[group]}
                  level={level + 1}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <React.Fragment>
      <motion.div
        className="panel info-panel-root settings-panel-root"
        initial={{ opacity: 0, x: "100%" }}
        animate={props.panelVisible ? "open" : "closed"}
        transition={{ duration: 0.3, type: "tween" }}
        variants={{
          open: { opacity: 1, x: 0 },
          closed: { opacity: 0, x: "100%" }
        }}
        key="settings-panel"
      >
        <PanelHeader
          title={"Bibliotecas de Tokens Detectadas"}
          handleHide={handleHide}
        />
        <div
          className="info-panel-content settings-panel-content"
          style={{ padding: "24px 16px 0 16px" }}
        >
          {/* Card de identificação do projeto e resumo de tokens */}
          {libs.length > 0 && (
            <div style={{ marginBottom: 20, width: "100%" }}>
              <AnalysisResultsCard
                projectName={libs[0].name}
                analysisDate={(
                  (libs[0].fills?.length || 0) +
                  (libs[0].text?.length || 0) +
                  (libs[0].effects?.length || 0) +
                  (libs[0].strokes?.length || 0)
                ).toString()}
              />
            </div>
          )}
          {libs.length > 0 ? (
            <ul
              className="library-list"
              style={{ width: "100%", padding: 0, margin: 0 }}
            >
              {libs.map((lib, idx) => (
                <li
                  key={lib.name + idx}
                  className="library-list-item"
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    background: "none",
                    borderRadius: 0,
                    marginBottom: 0,
                    padding: 0,
                    width: "100%",
                    border: "none"
                  }}
                >
                  <div
                    className="library-list-item-content"
                    style={{ color: "#fff", width: "100%", padding: 0 }}
                  >
                    <div style={{ width: "100%" }}>
                      {lib.text && lib.text.length > 0 && (
                        <TokenAccordion
                          category="Text styles"
                          tokens={lib.text}
                        />
                      )}
                      {lib.fills && lib.fills.length > 0 && (
                        <TokenAccordion
                          category="Color styles"
                          tokens={lib.fills}
                        />
                      )}
                      {lib.effects && lib.effects.length > 0 && (
                        <TokenAccordion
                          category="Effect styles"
                          tokens={lib.effects}
                        />
                      )}
                      {lib.strokes && lib.strokes.length > 0 && (
                        <TokenAccordion
                          category="Stroke styles"
                          tokens={lib.strokes}
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
              Nenhuma biblioteca de tokens detectada neste arquivo.
            </div>
          )}
        </div>
        <footer
          className="initial-content-footer"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            background: "#2a2a2a",
            borderTop: "1px solid #4f4f4f",
            zIndex: 100,
            padding: "16px"
          }}
        >
          <button
            className="button button--primary button--full"
            style={{ width: "100%", fontWeight: 600, fontSize: 15, margin: 0 }}
            onClick={handleFetchLibraries}
            disabled={loading}
          >
            {loading ? "Buscando..." : "Buscar bibliotecas de tokens"}
          </button>
        </footer>
      </motion.div>
    </React.Fragment>
  );
}

export default React.memo(SettingsPanel);
