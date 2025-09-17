import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import BulkErrorListItem from "./BulkErrorListItem";
import Banner from "./Banner";
import Modal from "./Modal";
import StylesPanel from "./StylesPanel";
import AnalysisResultsCard from "./AnalysisResultsCard";
import ConformityScoreBar from "./ConformityScoreBar";
import ConformityItemChart from "./ConformityItemChart";
import Preloader from "./Preloader";
import FrameErrorsPanel from "./FrameErrorsPanel";
import "../styles/ui.css";

declare function require(path: string): any;

function BulkErrorList(props) {
  const [currentError, setCurrentError] = React.useState(null);
  const [panelError, setPanelError] = React.useState(null);
  const [panelStyleSuggestion, setPanelStyleSuggestion] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [panelVisible, setPanelVisible] = React.useState(false);
  const [tab, setTab] = React.useState("Geral");
  const [selectedFrame, setSelectedFrame] = React.useState<{
    id: string;
    name: string;
    errors: any[];
  } | null>(null);

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
  }, []); // Added closing braces and dependency array

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

  // Helper: normalize error object fields
  const getErrorNodeId = (err: any) =>
    err.nodeId || (err.node && err.node.id) || err.id;
  const getErrorValue = (err: any) => err.value;
  const getErrorType = (err: any) => err.type || err.errorType || err.category;

  // The data is coming flat, so we need to group it by node ID.
  const errorArray = React.useMemo(() => {
    const flatErrorsFromProps = Array.isArray(props.errorArray)
      ? props.errorArray
      : [];
    const errorsByNode = new Map<
      string,
      { id: string; name: string; errors: any[] }
    >();

    flatErrorsFromProps.forEach(error => {
      const nodeId = getErrorNodeId(error);
      const nodeName = error.nodeName || (error.node && error.node.name);

      if (!nodeId) return;

      let nodeWithErrors = errorsByNode.get(nodeId);
      if (!nodeWithErrors) {
        nodeWithErrors = {
          id: nodeId,
          name: nodeName || "Unknown Node",
          errors: []
        };
        errorsByNode.set(nodeId, nodeWithErrors);
      }
      nodeWithErrors.errors.push(error);
    });

    return Array.from(errorsByNode.values());
  }, [props.errorArray]);

  const ignoredErrorArray = Array.isArray(props.ignoredErrorArray)
    ? props.ignoredErrorArray
    : [];

  const ignoredErrorsMap = {} as Record<string, Set<any>>;
  ignoredErrorArray.forEach(ignoredError => {
    const nodeId = ignoredError.node.id;
    if (!ignoredErrorsMap[nodeId]) {
      ignoredErrorsMap[nodeId] = new Set();
    }
    ignoredErrorsMap[nodeId].add(ignoredError.value);
  });

  // Derive a flat list of errors from the node-level structure
  const flatErrors: any[] = React.useMemo(() => {
    const list: any[] = [];
    errorArray.forEach(node => {
      const nid = node?.id;
      if (!nid || !Array.isArray(node?.errors)) return;
      node.errors.forEach((e: any) => {
        list.push({ ...e, nodeId: e.nodeId || nid, node: node });
      });
    });
    return list;
  }, [errorArray]);

  // Filter out ignored errors for flat error list
  const filteredFlatErrors = flatErrors.filter(err => {
    const nodeId = getErrorNodeId(err);
    if (!nodeId) return false;
    const ignoredErrorValues = ignoredErrorsMap[nodeId] || new Set();
    // Always keep 'unvalidated' errors visible unless the exact value was explicitly ignored
    const type = getErrorType(err);
    if (type === "unvalidated") return true;
    return !ignoredErrorValues.has(getErrorValue(err));
  });

  // Filter nodes: keep nodes that still have at least one non-ignored error
  const filteredErrorArray = Array.isArray(errorArray)
    ? errorArray
        .map(node => {
          const id = node.id;
          const ignoredValues = ignoredErrorsMap[id] || new Set();
          const nextErrors = Array.isArray(node.errors)
            ? node.errors.filter(e => {
                const type = getErrorType(e);
                if (type === "unvalidated") return true;
                return !ignoredValues.has(e.value);
              })
            : [];
          return { ...node, errors: nextErrors };
        })
        .filter(node => Array.isArray(node.errors) && node.errors.length > 0)
    : [];

  const createBulkErrorList = (flatErrorArray, ignoredErrorsMap) => {
    console.log(
      "[createBulkErrorList] Iniciando com errorArray:",
      flatErrorArray
    );
    console.log("[createBulkErrorList] ignoredErrorsMap:", ignoredErrorsMap);

    if (!Array.isArray(flatErrorArray) || flatErrorArray.length === 0) {
      console.log(
        "[createBulkErrorList] errorArray inválido ou vazio, retornando array vazio"
      );
      return [];
    }

    // Cada erro já é um erro individual, só precisa filtrar ignorados
    return flatErrorArray.filter(error => {
      const nodeId = getErrorNodeId(error);
      if (!nodeId) return false;
      const ignoredErrorValues = ignoredErrorsMap[nodeId] || new Set();
      const type = getErrorType(error);
      if (type === "unvalidated") return true;
      return !ignoredErrorValues.has(getErrorValue(error));
    });
  };

  // Create the bulk error list using the createBulkErrorList function
  const bulkErrorList = createBulkErrorList(
    filteredFlatErrors as any[],
    ignoredErrorsMap
  ) as any[];
  bulkErrorList.sort((a: any, b: any) => b.count - a.count);

  // ---------------- Conformity calculations by unique nodes ----------------
  // Traverse nodeArray to collect all scanned node IDs
  const allScannedNodeIds: Set<string> = React.useMemo(() => {
    const ids = new Set<string>();
    const walk = (node: any) => {
      if (!node || !node.id) return;
      ids.add(node.id);
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };
    if (Array.isArray(props.nodeArray)) {
      props.nodeArray.forEach(walk);
    }
    return ids;
  }, [props.nodeArray]);

  const nodeById: Record<string, any> = React.useMemo(() => {
    const map: Record<string, any> = {};
    const walk = (node: any) => {
      if (!node || !node.id) return;
      map[node.id] = node;
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };
    if (Array.isArray(props.nodeArray)) {
      props.nodeArray.forEach(walk);
    }
    return map;
  }, [props.nodeArray]);

  // Map nodeId -> has at least one (filtered) error.
  // Ensure 'unvalidated' errors ALWAYS count toward conformity, even if ignored in UI lists.
  const nodesWithErrors: Set<string> = React.useMemo(() => {
    const s = new Set<string>();
    // Include all filtered errors
    filteredFlatErrors.forEach(err => {
      const nid = getErrorNodeId(err);
      if (nid) s.add(nid);
    });
    // Force-include critical error types regardless of ignore state
    flatErrors.forEach(err => {
      const t = getErrorType(err);
      // Treat any "*-unvalidated" as critical
      if (typeof t === "string" && t.endsWith("-unvalidated")) {
        const nid = getErrorNodeId(err);
        if (nid) s.add(nid);
      }
    });
    return s;
  }, [filteredFlatErrors, errorArray]);

  const totalElements = allScannedNodeIds.size;
  const nonConformElements = nodesWithErrors.size;
  const conformElements = Math.max(totalElements - nonConformElements, 0);
  const detachCount = bulkErrorList.reduce((acc: number, err: any) => {
    return acc + (err.type === "detach" ? err.count || 1 : 0);
  }, 0);

  // Helper: collect all descendant ids for a given frame/node
  const getFrameNodeIds = React.useCallback((frame: any): Set<string> => {
    const ids = new Set<string>();
    const walk = (node: any) => {
      if (!node || !node.id) return;
      ids.add(node.id);
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(frame);
    return ids;
  }, []);

  const getFrameErrors = React.useCallback(
    (frameId: string) => {
      if (!frameId || !Array.isArray(props.errorArray)) return [];

      const nodeArray = Array.isArray(props.nodeArray) ? props.nodeArray : [];
      const frameNode = nodeArray.find(node => node.id === frameId) || null;
      if (!frameNode) return [];

      const frameNodeIds = new Set<string>();
      const collectNodeIds = (node: any) => {
        if (!node || !node.id) return;
        frameNodeIds.add(node.id);
        if (Array.isArray(node.children)) {
          node.children.forEach(collectNodeIds);
        }
      };
      collectNodeIds(frameNode);

      return props.errorArray.filter((error: any) => {
        const errorNodeId = error.nodeId || error.id;
        return errorNodeId && frameNodeIds.has(errorNodeId);
      });
    },
    [props.errorArray, props.nodeArray]
  );

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
    const errorsToBeIgnored: any[] = [];

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

    if (errorsToBeIgnored.length && typeof props.onIgnoreAll === "function") {
      props.onIgnoreAll(errorsToBeIgnored as any);
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
    const pillsEl = document.querySelector(
      ".filter-pills"
    ) as HTMLElement | null;
    if (!pillsEl) return;
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      pillsEl.classList.add("dragging");
      startX = e.pageX - pillsEl.offsetLeft;
      scrollLeft = pillsEl.scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      pillsEl.classList.remove("dragging");
    };
    const onMouseUp = () => {
      isDown = false;
      pillsEl.classList.remove("dragging");
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - pillsEl.offsetLeft;
      const walk = (x - startX) * 1.5; // scroll speed
      pillsEl.scrollLeft = scrollLeft - walk;
    };
    pillsEl.addEventListener(
      "mousedown",
      (onMouseDown as unknown) as EventListener
    );
    pillsEl.addEventListener(
      "mouseleave",
      (onMouseLeave as unknown) as EventListener
    );
    pillsEl.addEventListener(
      "mouseup",
      (onMouseUp as unknown) as EventListener
    );
    pillsEl.addEventListener(
      "mousemove",
      (onMouseMove as unknown) as EventListener
    );
    return () => {
      pillsEl.removeEventListener(
        "mousedown",
        (onMouseDown as unknown) as EventListener
      );
      pillsEl.removeEventListener(
        "mouseleave",
        (onMouseLeave as unknown) as EventListener
      );
      pillsEl.removeEventListener(
        "mouseup",
        (onMouseUp as unknown) as EventListener
      );
      pillsEl.removeEventListener(
        "mousemove",
        (onMouseMove as unknown) as EventListener
      );
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

  // Fallback visual se não houver nós para analisar
  if (!Array.isArray(props.nodeArray) || props.nodeArray.length === 0) {
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 64 }}>
        Nenhum dado de análise encontrado.
        <br />
        Tente refazer a análise ou selecione outros elementos.
      </div>
    );
  }

  // Cálculo dinâmico dos cards principais: já computado acima

  // Debug: verificar dados recebidos
  console.log("[BulkErrorList] Props recebidas:", {
    libraries: props.libraries,
    errorArray: props.errorArray,
    ignoredErrorArray: props.ignoredErrorArray,
    nodeArray: props.nodeArray,
    allScannedNodeIds: Array.from(allScannedNodeIds || []),
    nodesWithErrors: Array.from(nodesWithErrors || [])
  });

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
      label: "Radius",
      icon: require("../assets/paragraph-spacing.svg")
    },
    { key: "gap", label: "Gap", icon: require("../assets/gap.svg") },
    { key: "stroke", label: "Border", icon: require("../assets/border.svg") },
    { key: "effects", label: "Efeitos", icon: require("../assets/effects.svg") }
  ];

  // Função para verificar se um nó é aplicável a um determinado tipo
  function isNodeApplicable(node: any, typeKey: string): boolean {
    if (!node) {
      console.log(`[isNodeApplicable] Nó inválido para tipo ${typeKey}`);
      return false;
    }

    switch (typeKey) {
      case "fill":
        return !!(
          node.fillStyleId ||
          (Array.isArray(node.fills) && node.fills.length > 0) ||
          node.backgrounds ||
          node.backgroundColor
        );

      case "text":
        return (
          node.type === "TEXT" ||
          !!node.textStyleId ||
          (node.characters && node.characters.length > 0)
        );

      case "stroke":
        return !!(
          node.strokeStyleId ||
          (Array.isArray(node.strokes) && node.strokes.length > 0)
        );

      case "effects":
        return !!(
          node.effectStyleId ||
          (Array.isArray(node.effects) && node.effects.length > 0)
        );

      case "gap":
        return ["FRAME", "GROUP", "INSTANCE", "COMPONENT"].includes(node.type);

      case "radius":
        return (
          node.cornerRadius !== undefined ||
          node.topLeftRadius !== undefined ||
          node.topRightRadius !== undefined ||
          node.bottomLeftRadius !== undefined ||
          node.bottomRightRadius !== undefined
        );

      case "component":
        return node.type === "COMPONENT" || node.type === "INSTANCE";

      default:
        console.warn(`[isNodeApplicable] Tipo não suportado: ${typeKey}`);
        return false;
    }
  }

  /**
   * Calculates conformity statistics for a specific token type
   * @param typeKey The type of token to check (e.g., 'fill', 'text', 'stroke')
   * @returns Object containing conform/non-conform counts and percentage
   */
  function getConformityByType(
    typeKey: string
  ): {
    conform: number;
    nonConform: number;
    percent: number;
  } {
    const applicableNodeIds = new Set<string>();
    const nonConformantNodeIds = new Set<string>();

    // Helper para percorrer recursivamente a árvore de nós
    const walk = (node: any) => {
      if (!node || !node.id) return;

      if (isNodeApplicable(node, typeKey)) {
        applicableNodeIds.add(node.id);
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };

    // 1. Encontra todos os nós aplicáveis para este tipo a partir do nodeArray completo
    if (Array.isArray(props.nodeArray)) {
      props.nodeArray.forEach(walk);
    }

    // 2. Encontra nós não conformes a partir do errorArray
    // O errorArray já está filtrado para não incluir erros ignorados.
    filteredErrorArray.forEach(nodeWithErrors => {
      if (
        !nodeWithErrors ||
        !nodeWithErrors.id ||
        !Array.isArray(nodeWithErrors.errors)
      )
        return;

      // Verifica se este nó é aplicável para o tipo que estamos calculando
      if (applicableNodeIds.has(nodeWithErrors.id)) {
        // Verifica se algum de seus erros corresponde ao typeKey
        const hasErrorForType = nodeWithErrors.errors.some(error => {
          const errorType = getErrorType(error);
          // Mapeia tipos de erro para tipos de gráfico, se forem diferentes
          if (typeKey === "component" && errorType === "detach") return true;
          // Verifica se o errorType começa com o typeKey para abranger sub-tipos como 'fill-style-library'
          if (typeof errorType === "string" && typeof typeKey === "string") {
            return errorType.startsWith(typeKey);
          }
          return errorType === typeKey;
        });

        if (hasErrorForType) {
          nonConformantNodeIds.add(nodeWithErrors.id);
        }
      }
    });

    const totalApplicable = applicableNodeIds.size;
    const nonConform = nonConformantNodeIds.size;
    const conform = totalApplicable - nonConform;
    const percent =
      totalApplicable > 0 ? Math.round((conform / totalApplicable) * 100) : 100;

    return {
      conform,
      nonConform,
      percent
    };
  }

  function handleVerificarErros(frame) {
    const frameErrors = getFrameErrors(frame.id);
    setSelectedFrame({
      id: frame.id,
      name: frame.name,
      errors: frameErrors
    });
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
            "solarops-inspector.json"
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
            background: tab === "Geral" ? "#3b82f6" : "transparent",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 12,
            color: "#fff",
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
            background: tab === "Frame" ? "#3b82f6" : "transparent",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 12,
            color: tab === "Frame" ? "#fff" : "#fff",
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
                    total={totalElements}
                    errors={nonConformElements}
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
                    gap: "12px",
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
                      <ConformityItemChart
                        key={type.key}
                        type={type}
                        conform={conform}
                        nonConform={nonConform}
                        percent={percent}
                      />
                    );
                  })}
                </div>
              </li>
            </motion.ul>
            {/* Banner - mostrar sempre quando há análise completa */}
            {props.initialLoadComplete && totalErrorsWithMatches > 0 && (
              <motion.ul className="errors-list">
                <li style={{ listStyle: "none" }} key="banner-item">
                  <Banner
                    totalErrorsWithMatches={totalErrorsWithMatches}
                    handleFixAllErrors={handleFixAllFromBanner}
                  />
                </li>
              </motion.ul>
            )}
          </>
        </div>
      )}

      {tab === "Frame" && (
        <div className="panel-body panel-body-errors">
          <div
            style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 16px" }}
          >
            {Array.isArray(props.nodeArray) && props.nodeArray.length > 0 ? (
              props.nodeArray.map((frame, idx) => {
                // Log para depuração da estrutura dos dados
                console.log("Frame:", frame);
                console.log("ErrorArray:", errorArray);
                // Calcular elementos do frame por varredura de descendentes
                const frameIds = getFrameNodeIds(frame);
                const totalElements = frameIds.size;
                const nonConformElements = Array.from(frameIds).filter(id =>
                  nodesWithErrors.has(id)
                ).length;
                const conformElements = Math.max(
                  totalElements - nonConformElements,
                  0
                );
                const detachCount = filteredFlatErrors.filter(
                  e => e.type === "detach" && frameIds.has(getErrorNodeId(e))
                ).length;
                // Score de conformidade
                const correct = conformElements;
                return (
                  <div key={frame.id} style={{ marginBottom: 48 }}>
                    <h2
                      className="analysis-title"
                      style={{ margin: "0 0 8px 0" }}
                    >
                      {frame.name}
                    </h2>
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
                            fontWeight: 500,
                            fontSize: 16,
                            borderRadius: 6,
                            padding: "12px 16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            transition: "all 0.2s ease"
                          }}
                          onClick={() => handleVerificarErros(frame)}
                        >
                          <span style={{ fontSize: "15px" }}>
                            Verificar erros
                          </span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                              marginLeft: 8,
                              flexShrink: 0,
                              color: "#fff"
                            }}
                          >
                            <path
                              d="M9 18L15 12L9 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
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

      {selectedFrame && (
        <FrameErrorsPanel
          frameName={selectedFrame.name}
          frameErrors={selectedFrame.errors}
          onBack={() => setSelectedFrame(null)}
          isVisible={!!selectedFrame}
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
