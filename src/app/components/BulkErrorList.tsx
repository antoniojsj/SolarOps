import * as React from "react";

declare function require(path: string): any;
import { motion } from "framer-motion/dist/framer-motion";
import BulkErrorListItem from "./BulkErrorListItem";
import Banner from "./Banner";
import Modal from "./Modal";
import StylesPanel from "./StylesPanel";
import AnalysisResultsCard from "./AnalysisResultsCard";
import ConformityScoreBar from "./ConformityScoreBar";
import Preloader from "./Preloader";
import "../styles/ui.css";

function BulkErrorList(props) {
  const [currentError, setCurrentError] = React.useState(null);
  const [panelError, setPanelError] = React.useState(null);
  const [panelStyleSuggestion, setPanelStyleSuggestion] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [panelVisible, setPanelVisible] = React.useState(false);
  const [tab, setTab] = React.useState("Geral");

  // Get current date and time for analysis
  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Get project name from Figma or use default
  const [projectName, setProjectName] = React.useState("Documento sem título");

  // Fetch project name when component mounts
  React.useEffect(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "get-project-name"
        }
      },
      "*"
    );
  }, []);

  // Listen for project name response
  React.useEffect(() => {
    const handleMessage = event => {
      const { type, projectName: name } = event.data.pluginMessage;
      if (type === "project-name") {
        setProjectName(name || "Documento sem título");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // const availableFilters = [
  //   "Geral",
  //   "text",
  //   "fill",
  //   "stroke",
  //   "radius",
  //   "effects"
  // ];

  const errorArray = Array.isArray(props.errorArray) ? props.errorArray : [];
  const ignoredErrorArray = Array.isArray(props.ignoredErrorArray)
    ? props.ignoredErrorArray
    : [];

  const ignoredErrorsMap = {};
  ignoredErrorArray.forEach(ignoredError => {
    const nodeId = ignoredError.node.id;
    if (!ignoredErrorsMap[nodeId]) {
      ignoredErrorsMap[nodeId] = new Set();
    }
    ignoredErrorsMap[nodeId].add(ignoredError.value);
  });

  // Filter out ignored errors
  const filteredErrorArray = errorArray.filter(item => {
    const nodeId = item.id;
    const ignoredErrorValues = ignoredErrorsMap[nodeId] || new Set();
    // Protege item.errors
    item.errors = Array.isArray(item.errors) ? item.errors : [];
    item.errors = item.errors.filter(
      error => !ignoredErrorValues.has(error.value)
    );
    return item.errors.length >= 1;
  });

  const createBulkErrorList = (errorArray, ignoredErrorsMap) => {
    console.log("[createBulkErrorList] Iniciando com errorArray:", errorArray);
    console.log("[createBulkErrorList] ignoredErrorsMap:", ignoredErrorsMap);

    if (!Array.isArray(errorArray) || errorArray.length === 0) {
      console.log(
        "[createBulkErrorList] errorArray inválido ou vazio, retornando array vazio"
      );
      return [];
    }

    // Cada erro já é um erro individual, só precisa filtrar ignorados
    return errorArray.filter(error => {
      const nodeId = error.nodeId || (error.node && error.node.id);
      if (!nodeId) return false;
      const ignoredErrorValues = ignoredErrorsMap[nodeId] || new Set();
      return !ignoredErrorValues.has(error.value);
    });
  };

  // Create the bulk error list using the createBulkErrorList function
  const bulkErrorList = createBulkErrorList(
    filteredErrorArray as any[],
    ignoredErrorsMap
  ) as any[];
  bulkErrorList.sort((a: any, b: any) => b.count - a.count);

  // Create an array of errors that have matches
  const errorsWithMatches = bulkErrorList.filter((error: any) => {
    return error.matches && error.matches.length > 0;
  });

  // Calculate the total number of errors with matches
  const totalErrorsWithMatches = errorsWithMatches.reduce(
    (total: number, error: any) => {
      return total + error.count;
    },
    0
  );

  const handleFixAllFromBanner = () => {
    errorsWithMatches.forEach(error => {
      handleFixAll(error);
    });
  };

  function handleIgnoreChange(error) {
    props.onIgnoredUpdate(error);
  }

  function handlePanelVisible(boolean) {
    setPanelVisible(boolean);
  }

  function handleUpdatePanelError(error) {
    setPanelError(error);
  }

  function handleUpdatePanelSuggestion(index) {
    setPanelStyleSuggestion(index);
  }

  function handleBorderRadiusUpdate(value) {
    props.updateBorderRadius(value);
  }

  function handleCreateStyle(error) {
    setCurrentError(error);
    setIsModalOpen(true);
  }

  function handleSelectAll(error) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: error.nodes
        }
      },
      "*"
    );
  }

  function handleFixAll(error) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "apply-styles",
          error: error,
          field: "matches",
          index: 0,
          count: error.count
        }
      },
      "*"
    );
  }

  function handleSuggestion(error, index) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "apply-styles",
          error: error,
          field: "suggestions",
          index: index,
          count: error.count
        }
      },
      "*"
    );
  }

  function handleSelect(error) {
    const nodeId = error.nodeId || (error.node && error.node.id);
    if (nodeId) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "fetch-layer-data",
            id: nodeId
          }
        },
        "*"
      );
    }
  }

  function handleIgnoreAll(error) {
    let errorsToBeIgnored = [];

    filteredErrorArray.forEach(node => {
      if (node && node.errors && Array.isArray(node.errors)) {
        node.errors.forEach(item => {
          if (item && item.value === error.value) {
            if (item.type === error.type) {
              errorsToBeIgnored.push(item);
            }
          }
        });
      }
    });

    if (errorsToBeIgnored.length) {
      props.onIgnoreAll(errorsToBeIgnored);
    }
  }

  const [selectedFilter, setSelectedFilter] = React.useState("Geral");

  // const handleFilterClick = filter => {
  //   setSelectedFilter(filter);
  // };

  // Filter the bulkErrorList based on the selected filter
  const filteredErrorList = bulkErrorList.filter(error => {
    return selectedFilter === "Geral" || selectedFilter === error.type;
  });

  // Map the filtered error list to BulkErrorListItem components
  const errorListItems = filteredErrorList.map((error: any, index: number) => {
    const nodeId =
      error.nodeId || (error.node && error.node.id) || `error-${index}`;
    return (
      <BulkErrorListItem
        error={error}
        index={index}
        key={`${nodeId}-${error.type}-${index}`}
        handleIgnoreChange={handleIgnoreChange}
        handleSelectAll={handleSelectAll}
        handleCreateStyle={handleCreateStyle}
        handleSelect={handleSelect}
        handleIgnoreAll={handleIgnoreAll}
        handleFixAll={handleFixAll}
        handleSuggestion={handleSuggestion}
        handleBorderRadiusUpdate={handleBorderRadiusUpdate}
        handlePanelVisible={handlePanelVisible}
        handleUpdatePanelError={handleUpdatePanelError}
        handleUpdatePanelSuggestion={handleUpdatePanelSuggestion}
      />
    );
  });

  // Drag-to-scroll para tabs
  React.useEffect(() => {
    const pills = document.querySelector(".filter-pills");
    if (!pills) return;
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      pills.classList.add("dragging");
      startX = e.pageX - (pills as HTMLElement).offsetLeft;
      scrollLeft = (pills as HTMLElement).scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      pills.classList.remove("dragging");
    };
    const onMouseUp = () => {
      isDown = false;
      pills.classList.remove("dragging");
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - (pills as HTMLElement).offsetLeft;
      const walk = (x - startX) * 1.5; // scroll speed
      (pills as HTMLElement).scrollLeft = scrollLeft - walk;
    };
    pills.addEventListener("mousedown", onMouseDown);
    pills.addEventListener("mouseleave", onMouseLeave);
    pills.addEventListener("mouseup", onMouseUp);
    pills.addEventListener("mousemove", onMouseMove);
    return () => {
      pills.removeEventListener("mousedown", onMouseDown);
      pills.removeEventListener("mouseleave", onMouseLeave);
      pills.removeEventListener("mouseup", onMouseUp);
      pills.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  // Debug: log da estrutura dos erros
  console.log("BulkErrorList - errors:", errorArray);
  console.log("BulkErrorList - errors length:", errorArray.length);
  console.log("BulkErrorList - filteredErrorArray:", filteredErrorArray);
  console.log(
    "BulkErrorList - filteredErrorArray length:",
    filteredErrorArray.length
  );
  console.log("BulkErrorList - bulkErrorList:", bulkErrorList);
  console.log("BulkErrorList - bulkErrorList length:", bulkErrorList.length);
  console.log("BulkErrorList - errorListItems length:", errorListItems.length);
  console.log(
    "BulkErrorList - props.initialLoadComplete:",
    props.initialLoadComplete
  );

  // Só mostrar estado vazio se não tiver dados de análise ou se não estiver carregado
  if (!props.initialLoadComplete) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%"
        }}
      >
        <Preloader />
      </div>
    );
  }

  // Fallback visual se não houver dados de análise
  if (!Array.isArray(props.errorArray) || props.errorArray.length === 0) {
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 64 }}>
        Nenhum dado de análise encontrado.
        <br />
        Tente refazer a análise ou selecione outros elementos.
      </div>
    );
  }

  // Cálculo dinâmico dos cards principais
  const totalElements = props.errorArray.length;
  const nonConformElements = filteredErrorArray.length;
  const conformElements = totalElements - nonConformElements;

  // Detach de componente: contar erros do tipo 'detach' (ou similar)
  const detachCount = props.errorArray.reduce((acc, item) => {
    if (Array.isArray(item.errors)) {
      return acc + item.errors.filter(e => e.type === "detach").length;
    }
    return acc;
  }, 0);

  // Tipos para os cards de conformidade por item
  const itemTypes = [
    {
      key: "component",
      label: "Componentes",
      icon: require("../assets/component.svg")
    },
    { key: "fill", label: "Cores", icon: require("../assets/palette.svg") },
    { key: "text", label: "Tipografia", icon: require("../assets/text.svg") },
    {
      key: "radius",
      label: "Padding",
      icon: require("../assets/paragraph-spacing.svg")
    },
    { key: "gap", label: "Gap", icon: require("../assets/gap.svg") },
    { key: "stroke", label: "Border", icon: require("../assets/border.svg") },
    {
      key: "stroker",
      label: "Stroker",
      icon: require("../assets/stroker.svg")
    },
    { key: "effects", label: "Efeitos", icon: require("../assets/effects.svg") }
  ];

  // Função para calcular conformidade por tipo
  function getConformityByType(typeKey) {
    let conform = 0;
    let nonConform = 0;
    props.errorArray.forEach(item => {
      const hasTypeError =
        Array.isArray(item.errors) && item.errors.some(e => e.type === typeKey);
      if (hasTypeError) {
        nonConform++;
      } else {
        conform++;
      }
    });
    const percent =
      conform + nonConform > 0
        ? Math.round((conform / (conform + nonConform)) * 100)
        : 100;
    return { conform, nonConform, percent };
  }

  // Listener para receber o JSON exportado e baixar
  React.useEffect(() => {
    function handleExportedJson(event) {
      if (
        event.data &&
        event.data.pluginMessage &&
        event.data.pluginMessage.type === "inspector-json-exported"
      ) {
        if (event.data.pluginMessage.success && event.data.pluginMessage.data) {
          const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(
              JSON.stringify(event.data.pluginMessage.data, null, 2)
            );
          const downloadAnchorNode = document.createElement("a");
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute(
            "download",
            "sherlock-inspector.json"
          );
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
        } else {
          alert(
            event.data.pluginMessage.error ||
              "Erro ao exportar JSON da análise. Nenhum dado encontrado."
          );
        }
      }
    }
    window.addEventListener("message", handleExportedJson);
    return () => window.removeEventListener("message", handleExportedJson);
  }, []);

  return (
    <motion.div className="bulk-errors-list" key="bulk-list">
      {/* Switch de conteúdo */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 4,
          padding: 2,
          margin: "16px 16px 16px 16px",
          width: "auto",
          alignSelf: "flex-start"
        }}
      >
        <button
          onClick={() => setTab("Geral")}
          style={{
            flex: 1,
            background: tab === "Geral" ? "#fff" : "transparent",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 12,
            color: tab === "Geral" ? "#222" : "#fff",
            padding: "6px 18px",
            boxShadow: "none",
            transition: "background 0.2s, color 0.2s",
            cursor: "pointer"
          }}
        >
          Geral
        </button>
        <button
          onClick={() => setTab("Frame")}
          style={{
            flex: 1,
            background: tab === "Frame" ? "#fff" : "transparent",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 12,
            color: tab === "Frame" ? "#222" : "#fff",
            padding: "6px 18px",
            boxShadow: "none",
            transition: "background 0.2s, color 0.2s",
            cursor: "pointer"
          }}
        >
          Frame
        </button>
      </div>
      {tab === "Geral" && (
        <div className="panel-body panel-body-errors">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 0,
              marginLeft: 16
            }}
          >
            <span
              className="chart-icon-animated"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 24
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  className="bar1"
                  x="3"
                  y="12"
                  width="3"
                  height="8"
                  rx="1.5"
                  fill="#18a0fb"
                />
                <rect
                  className="bar2"
                  x="9"
                  y="8"
                  width="3"
                  height="12"
                  rx="1.5"
                  fill="#27ae60"
                />
                <rect
                  className="bar3"
                  x="15"
                  y="5"
                  width="3"
                  height="15"
                  rx="1.5"
                  fill="#fbbf24"
                />
              </svg>
            </span>
            <h2 className="analysis-title" style={{ margin: 0 }}>
              Resultados da análise
            </h2>
          </div>
          <div style={{ height: 8 }} />
          <div
            style={{
              margin: "0 16px 0 16px"
            }}
          >
            <AnalysisResultsCard
              projectName={projectName}
              analysisDate={formattedDate}
            />
          </div>
          {/* Espaço de 16px entre o card de identificação e o score */}
          <div style={{ height: 16 }} />
          {/* Título de seção */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "#fff",
              margin: "0 0 8px 0",
              paddingLeft: 16
            }}
          >
            Conformidade
          </div>
          {/* {!props.initialLoadComplete ? (
            <>
              <PreloaderCSS />
              <div
                style={{
                  color: "yellow",
                  background: "#222",
                  padding: 12,
                  margin: 16,
                  borderRadius: 8,
                  textAlign: "center"
                }}
              >
                <strong>Debug:</strong> initialLoadComplete ={" "}
                {String(props.initialLoadComplete)}
                <br />
                errorArray.length ={" "}
                {Array.isArray(props.errorArray)
                  ? props.errorArray.length
                  : "undefined"}
                <br />
                ignoredErrorArray.length ={" "}
                {Array.isArray(props.ignoredErrorArray)
                  ? props.ignoredErrorArray.length
                  : "undefined"}
                <br />
                <span style={{ fontSize: 12 }}>
                  Se este aviso não sumir, o carregamento não está sendo
                  concluído.
                </span>
              </div>
              {console.log(
                "[DEBUG BulkErrorList] initialLoadComplete:",
                props.initialLoadComplete,
                "errorArray.length:",
                Array.isArray(props.errorArray)
                  ? props.errorArray.length
                  : "undefined",
                "ignoredErrorArray.length:",
                Array.isArray(props.ignoredErrorArray)
                  ? props.ignoredErrorArray.length
                  : "undefined"
              )}
            </>
          ) : ( */}
          <>
            <motion.ul className="errors-list">
              <li style={{ listStyle: "none" }}>
                <div
                  className="system-card"
                  style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
                >
                  <ConformityScoreBar
                    total={props.errorArray.length}
                    errors={filteredErrorArray.length}
                  />
                </div>
              </li>
              <li
                style={{ listStyle: "none", marginTop: 24, marginBottom: 24 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    width: "100%",
                    maxWidth: "100%",
                    margin: "0 auto",
                    justifyContent: "space-between"
                  }}
                >
                  {/* Card 1: Elementos conformes */}
                  <div
                    className="summary-report-card"
                    style={{
                      flex: 1,
                      minWidth: 120,
                      maxWidth: 220,
                      background: "rgba(39, 174, 96, 0.08)",
                      border: "1.5px solid rgba(39, 174, 96, 0.4)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      boxSizing: "border-box"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#fff",
                        lineHeight: 1,
                        marginBottom: 8
                      }}
                    >
                      {conformElements}
                    </span>
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: 12,
                        color: "#fff",
                        marginBottom: 8
                      }}
                    >
                      Elementos conformes
                    </span>
                  </div>
                  {/* Card 2: Elementos não conformes */}
                  <div
                    className="summary-report-card"
                    style={{
                      flex: 1,
                      minWidth: 120,
                      maxWidth: 220,
                      background: "rgba(254, 98, 98, 0.08)",
                      border: "1.5px solid rgba(254, 98, 98, 0.4)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      boxSizing: "border-box"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#fff",
                        lineHeight: 1,
                        marginBottom: 8
                      }}
                    >
                      {nonConformElements}
                    </span>
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: 12,
                        color: "#fff",
                        marginBottom: 8
                      }}
                    >
                      Elementos não conformes
                    </span>
                  </div>
                  {/* Card 3: Detach de componente */}
                  <div
                    className="summary-report-card"
                    style={{
                      flex: 1,
                      minWidth: 120,
                      maxWidth: 220,
                      background: "rgba(251, 191, 36, 0.08)",
                      border: "1.5px solid rgba(251, 191, 36, 0.4)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      boxSizing: "border-box"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#fff",
                        lineHeight: 1,
                        marginBottom: 8
                      }}
                    >
                      {detachCount}
                    </span>
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: 12,
                        color: "#fff",
                        marginBottom: 8
                      }}
                    >
                      Detach de componente
                    </span>
                  </div>
                </div>
              </li>
              <li style={{ listStyle: "none", marginTop: 24 }}>
                {/* Título dos gráficos por item */}
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 400,
                    fontSize: 14,
                    margin: "0 0 8px 0"
                  }}
                >
                  Conformidade por item
                </div>
                {/* Cards de conformidade por item */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    margin: 0,
                    padding: 0
                  }}
                >
                  {itemTypes.map(type => {
                    const {
                      conform,
                      nonConform,
                      percent
                    } = getConformityByType(type.key);
                    return (
                      <div
                        key={type.key}
                        className="system-card"
                        style={{
                          marginBottom: 16,
                          paddingBottom: 20,
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 12,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              <img
                                src={type.icon}
                                alt={type.label}
                                width={20}
                                height={20}
                                style={{ marginRight: 4 }}
                              />
                            </span>
                            {type.label}
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              color: "#b3b3b3"
                            }}
                          >
                            {conform} conforme, {nonConform} não conforme
                          </div>
                          <span
                            className="conformity-score-badge"
                            style={{
                              background:
                                percent >= 70
                                  ? "rgba(39, 174, 96, 0.18)"
                                  : "rgba(254, 98, 98, 0.18)",
                              color: percent >= 70 ? "#27ae60" : "#fe6262",
                              fontSize: 12
                            }}
                          >
                            {percent}%
                          </span>
                        </div>
                        <div
                          className="conformity-score-progress-bg"
                          style={{ margin: "16px 0 0 0" }}
                        >
                          <div
                            className="conformity-score-progress-fill"
                            style={{
                              width: `${percent}%`,
                              background: percent >= 70 ? "#27ae60" : "#fe6262"
                            }}
                          ></div>
                        </div>
                        {/* Principais problemas: pode ser mantido fixo ou melhorado depois */}
                      </div>
                    );
                  })}
                </div>
              </li>
            </motion.ul>
            {/* Lista de erros e banner - mostrar sempre quando há análise completa */}
            {props.initialLoadComplete && (
              <motion.ul className="errors-list">
                {totalErrorsWithMatches > 0 && (
                  <li style={{ listStyle: "none" }} key="banner-item">
                    <Banner
                      totalErrorsWithMatches={totalErrorsWithMatches}
                      handleFixAllErrors={handleFixAllFromBanner}
                    />
                  </li>
                )}
                {errorListItems.length > 0 && errorListItems}
              </motion.ul>
            )}
          </>
        </div>
      )}

      {tab === "Frame" && (
        <div className="panel-body panel-body-errors">
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
            {Array.isArray(props.nodeArray) && props.nodeArray.length > 0 ? (
              props.nodeArray.map((frame, idx) => {
                // Log para depuração da estrutura dos dados
                console.log("Frame:", frame);
                console.log("ErrorArray:", errorArray);
                // Tentar encontrar elementos do frame por vários campos possíveis
                const frameElements = errorArray.filter(
                  e => e.parentFrameId === frame.id
                );
                const frameFilteredElements = filteredErrorArray.filter(
                  e => e.parentFrameId === frame.id
                );
                const totalElements = frameElements.length;
                const nonConformElements = frameFilteredElements.length;
                const conformElements = totalElements - nonConformElements;
                const detachCount = frameElements.reduce((acc, item) => {
                  if (Array.isArray(item.errors)) {
                    return (
                      acc + item.errors.filter(e => e.type === "detach").length
                    );
                  }
                  return acc;
                }, 0);
                // Score de conformidade
                const correct = Math.max(totalElements - nonConformElements, 0);
                // const score =
                //   totalElements > 0
                //     ? Math.round((correct / totalElements) * 100)
                //     : 0;
                // Handler do botão
                const handleVerificarErros = () => {
                  if (props.onSelectedListUpdate && frame.id) {
                    props.onSelectedListUpdate(frame.id);
                  }
                };
                return (
                  <div key={frame.id} style={{ marginBottom: 48 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#fff",
                        margin: "24px 0 8px 0"
                      }}
                    >
                      {frame.name}
                    </div>
                    <div
                      className="system-card"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <ConformityScoreBar
                        total={totalElements}
                        errors={nonConformElements}
                      />
                    </div>
                    <div style={{ height: 24 }} />
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        width: "100%",
                        maxWidth: "100%",
                        margin: "0 auto",
                        justifyContent: "space-between"
                      }}
                    >
                      <div
                        className="summary-report-card"
                        style={{
                          flex: 1,
                          minWidth: 120,
                          maxWidth: 220,
                          background: "rgba(39, 174, 96, 0.08)",
                          border: "1.5px solid rgba(39, 174, 96, 0.4)",
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          boxSizing: "border-box"
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "#fff",
                            lineHeight: 1,
                            marginBottom: 8
                          }}
                        >
                          {conformElements}
                        </span>
                        <span
                          style={{
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#fff",
                            marginBottom: 8
                          }}
                        >
                          Elementos conformes
                        </span>
                      </div>
                      <div
                        className="summary-report-card"
                        style={{
                          flex: 1,
                          minWidth: 120,
                          maxWidth: 220,
                          background: "rgba(254, 98, 98, 0.08)",
                          border: "1.5px solid rgba(254, 98, 98, 0.4)",
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          boxSizing: "border-box"
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "#fff",
                            lineHeight: 1,
                            marginBottom: 8
                          }}
                        >
                          {nonConformElements}
                        </span>
                        <span
                          style={{
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#fff",
                            marginBottom: 8
                          }}
                        >
                          Elementos não conformes
                        </span>
                      </div>
                      <div
                        className="summary-report-card"
                        style={{
                          flex: 1,
                          minWidth: 120,
                          maxWidth: 220,
                          background: "rgba(251, 191, 36, 0.08)",
                          border: "1.5px solid rgba(251, 191, 36, 0.4)",
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          boxSizing: "border-box"
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "#fff",
                            lineHeight: 1,
                            marginBottom: 8
                          }}
                        >
                          {detachCount}
                        </span>
                        <span
                          style={{
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#fff",
                            marginBottom: 8
                          }}
                        >
                          Detach de componente
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 24 }} />
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      <li style={{ marginBottom: 16 }}>
                        <button
                          style={{
                            width: "100%",
                            background: "rgba(24, 160, 251, 0.08)",
                            border: "1.5px solid #18a0fb",
                            color: "#fff",
                            fontWeight: 400,
                            fontSize: 14,
                            borderRadius: 6,
                            padding: "12px 0",
                            cursor: "pointer",
                            transition: "background 0.2s, color 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                          onClick={handleVerificarErros}
                        >
                          <span>Verificar erros</span>
                          <img
                            src={require("../assets/forward-arrow.svg")}
                            alt="Seta para direita"
                            style={{
                              width: 18,
                              height: 18,
                              marginLeft: 8,
                              display: "inline-block"
                            }}
                          />
                        </button>
                      </li>
                    </ul>
                    {idx < props.nodeArray.length - 1 && (
                      <div
                        style={{
                          height: 1,
                          background: "#444",
                          margin: "32px 0 24px 0",
                          border: "none",
                          width: "100%"
                        }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{ color: "#fff", textAlign: "center", marginTop: 32 }}
              >
                Nenhum frame analisado.
              </div>
            )}
          </div>
        </div>
      )}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        error={currentError}
      />
      <StylesPanel
        panelVisible={panelVisible}
        onHandlePanelVisible={handlePanelVisible}
        error={panelError}
        suggestion={panelStyleSuggestion}
      />
      {/* Novo footer após análise */}
      <footer
        className="initial-content-footer analysis-footer"
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center"
        }}
      >
        <button
          className="button button--primary"
          type="button"
          onClick={props.onHandleRunApp}
          disabled={props.disableRefazer}
        >
          Refazer análise
        </button>
        <button
          className="button button--secondary analysis-refazer"
          type="button"
          onClick={props.onExportReport || (() => alert("Exportar relatório!"))}
        >
          Exportar relatório
        </button>
      </footer>
    </motion.div>
  );
}

export default BulkErrorList;
