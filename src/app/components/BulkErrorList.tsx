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

  // --- Memoized Data Processing for Conformity ---
  const {
    conformityStats,
    totalElements,
    nonConformElements,
    conformElements,
    bulkErrorList,
    filteredFlatErrors,
    colorBreakdown
  } = React.useMemo(() => {
    // Passo 1: Criar um mapa de todos os nós escaneados para buscas rápidas.
    // Isso nos dá o universo total de elementos para os cálculos de conformidade.
    const nodeMap = new Map<string, any>();
    const walk = (node: any) => {
      if (!node || !node.id) return;
      nodeMap.set(node.id, node);
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };
    if (Array.isArray(props.nodeArray)) {
      props.nodeArray.forEach(walk);
    }
    const totalScannedElements = nodeMap.size;

    // Passo 2: A prop `props.errorArray` agora é uma lista plana de todos os erros.
    const allErrors: any[] = Array.isArray(props.errorArray)
      ? props.errorArray
      : [];

    // Passo 3: Criar um mapa de erros ignorados para uma filtragem eficiente.
    const ignoredErrorsMap = new Map<string, Set<string>>();
    if (Array.isArray(props.ignoredErrorArray)) {
      props.ignoredErrorArray.forEach(ignoredError => {
        const nodeId = getErrorNodeId(ignoredError);
        if (!nodeId) return;
        if (!ignoredErrorsMap.has(nodeId)) {
          ignoredErrorsMap.set(nodeId, new Set());
        }
        ignoredErrorsMap.get(nodeId)!.add(getErrorValue(ignoredError));
      });
    }

    // Passo 4: Filtrar os erros ignorados para obter a lista de erros ativos.
    const activeErrors = allErrors.filter(err => {
      const nodeId = getErrorNodeId(err);
      if (!nodeId) return false; // Ignora erros sem um nó associado
      const ignoredValues = ignoredErrorsMap.get(nodeId);
      return !ignoredValues || !ignoredValues.has(getErrorValue(err));
    });

    // Passo 5: Calcular as estatísticas de conformidade para cada tipo de item (Cores, Texto, etc.).
    const stats: Record<
      string,
      { applicable: Set<string>; nonConform: Set<string> }
    > = {};
    itemTypes.forEach(type => {
      stats[type.key] = { applicable: new Set(), nonConform: new Set() };
    });

    // 5a: Determinar quais nós são "aplicáveis" para cada tipo de verificação.
    for (const [nodeId, node] of nodeMap.entries()) {
      for (const type of itemTypes) {
        if (isNodeApplicable(node, type.key)) {
          stats[type.key].applicable.add(nodeId);
        }
      }
    }

    // 5b: Determinar quais dos nós aplicáveis estão "não conformes".
    for (const error of activeErrors) {
      const nodeId = getErrorNodeId(error);
      const errorType = getErrorType(error);
      if (!nodeId || !errorType) continue;

      for (const type of itemTypes) {
        const isMatch =
          (type.key === "component" && errorType === "detach") ||
          type.key === errorType;
        if (isMatch && stats[type.key].applicable.has(nodeId)) {
          stats[type.key].nonConform.add(nodeId);
        }
      }
    }

    // Passo 6: Calcular a conformidade geral.
    const nodesWithActiveErrors = new Set(
      activeErrors.map(e => getErrorNodeId(e))
    );
    const totalNonConformElements = nodesWithActiveErrors.size;
    const totalConformElements = totalScannedElements - totalNonConformElements;

    // NOVO: Passo 6.5: Calcular detalhamento de conformidade por cor
    const simpleRgba = (color: any, opacity?: number) => {
      if (!color) return "rgba(0,0,0,0)";
      const r = Math.round((color.r || 0) * 255);
      const g = Math.round((color.g || 0) * 255);
      const b = Math.round((color.b || 0) * 255);
      // Usa a opacidade do preenchimento se disponível, senão usa a da cor, e por último 1.
      const a =
        opacity !== undefined ? opacity : color.a !== undefined ? color.a : 1;
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    };

    const nonConformingColors = activeErrors
      .filter(err => getErrorType(err) === "fill")
      .reduce((acc, err) => {
        const color = getErrorValue(err);
        if (typeof color === "string") {
          if (!acc[color]) {
            acc[color] = 0;
          }
          acc[color]++;
        }
        return acc;
      }, {} as Record<string, number>);

    const allColorUsages = new Map<string, number>();
    for (const node of nodeMap.values()) {
      if (node.fills && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === "SOLID" && fill.visible !== false) {
            // Passa a cor e a opacidade do preenchimento para gerar a string RGBA correta.
            const colorString = simpleRgba(fill.color, fill.opacity);
            allColorUsages.set(
              colorString,
              (allColorUsages.get(colorString) || 0) + 1
            );
          }
        }
      }
    }

    const colorBreakdown = Array.from(allColorUsages.entries())
      .map(([color, totalCount]) => {
        const nonConformCount = nonConformingColors[color] || 0;
        const conformCount = totalCount - nonConformCount;
        return {
          color,
          conform: conformCount,
          nonConform: nonConformCount,
          total: totalCount
        };
      })
      .sort((a, b) => b.total - a.total);

    // Passo 7: Preparar a lista final de erros para exibição.
    const displayableErrorList = [...activeErrors].sort(
      (a, b) => (b.count || 1) - (a.count || 1)
    );

    return {
      conformityStats: stats,
      totalElements: totalScannedElements,
      nonConformElements: totalNonConformElements,
      conformElements: totalConformElements,
      bulkErrorList: displayableErrorList,
      filteredFlatErrors: activeErrors,
      colorBreakdown
    };
  }, [props.nodeArray, props.errorArray, props.ignoredErrorArray]);

  const getFrameErrors = React.useCallback(
    (frameId: string) => {
      if (!frameId) return [];

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

      return filteredFlatErrors.filter((error: any) => {
        const errorNodeId = getErrorNodeId(error);
        return errorNodeId && frameNodeIds.has(errorNodeId);
      });
    },
    [filteredFlatErrors, props.nodeArray, getErrorNodeId]
  );

  const detachCount = bulkErrorList.reduce((acc: number, err: any) => {
    return acc + (getErrorType(err) === "detach" ? err.count || 1 : 0);
  }, 0);

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
    const errorsToBeIgnored = (props.errorArray || []).filter(item => {
      if (
        item &&
        item.value === error.value &&
        getErrorType(item) === getErrorType(error)
      ) {
        return true;
      }
      return false;
    });

    if (
      errorsToBeIgnored.length > 0 &&
      typeof props.onIgnoreAll === "function"
    ) {
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
    nodeArray: props.nodeArray,
    totalElements,
    nonConformElements
  });

  // Função para verificar se um nó é aplicável a um determinado tipo
  function isNodeApplicable(node: any, typeKey: string): boolean {
    if (!node) return false;

    // Um nó de texto é aplicável para múltiplas verificações.
    if (node.type === "TEXT") {
      switch (typeKey) {
        case "text":
          return node.characters && node.characters.length > 0;
        case "fill":
          return (
            Array.isArray(node.fills) &&
            node.fills.some(f => f.visible !== false)
          );
        case "stroke":
          return (
            Array.isArray(node.strokes) &&
            node.strokes.some(s => s.visible !== false)
          );
        case "effects":
          return (
            Array.isArray(node.effects) &&
            node.effects.some(e => e.visible !== false)
          );
        default:
          return false; // Nós de texto não são aplicáveis para gap, radius, etc. diretamente.
      }
    }

    // Lógica para outros tipos de nós.
    switch (typeKey) {
      case "fill":
        return !!(
          node.fillStyleId ||
          node.fills === "figma-mixed-symbol" ||
          (Array.isArray(node.fills) &&
            node.fills.some(f => f.visible !== false))
        );
      case "stroke":
        return !!(
          node.strokeStyleId ||
          node.strokes === "figma-mixed-symbol" ||
          (Array.isArray(node.strokes) &&
            node.strokes.some(s => s.visible !== false))
        );
      case "effects":
        return !!(
          node.effectStyleId ||
          node.effects === "figma-mixed-symbol" ||
          (Array.isArray(node.effects) &&
            node.effects.some(e => e.visible !== false))
        );
      case "gap":
        return (
          (node.layoutMode === "HORIZONTAL" ||
            node.layoutMode === "VERTICAL") &&
          node.itemSpacing > 0
        );
      case "radius":
        if (node.cornerRadius === "figma-mixed-symbol") return true;
        if (typeof node.cornerRadius === "number" && node.cornerRadius > 0)
          return true;
        return (
          node.topLeftRadius > 0 ||
          node.topRightRadius > 0 ||
          node.bottomLeftRadius > 0 ||
          node.bottomRightRadius > 0
        );
      case "component":
        return node.type === "INSTANCE";
      default:
        return false;
    }
  }

  // Função para verificar se um nó é aplicável a um determinado tipo
  function isNodeApplicable_OLD(node: any, typeKey: string): boolean {
    if (!node) return false;

    switch (typeKey) {
      case "fill":
        // Aplicável se tiver um estilo de preenchimento, valores mistos, ou pelo menos um preenchimento visível.
        return !!(
          node.fillStyleId ||
          node.fills === "figma-mixed-symbol" || // Handle mixed values
          (Array.isArray(node.fills) &&
            node.fills.some(f => f.visible !== false))
        );

      case "text":
        // Aplicável se for um nó de texto com caracteres.
        return (
          node.type === "TEXT" && node.characters && node.characters.length > 0
        );

      case "stroke":
        // Aplicável se tiver um estilo de borda, valores mistos, ou pelo menos uma borda visível.
        return !!(
          node.strokeStyleId ||
          node.strokes === "figma-mixed-symbol" || // Handle mixed values
          (Array.isArray(node.strokes) &&
            node.strokes.some(s => s.visible !== false))
        );

      case "effects":
        // Aplicável se tiver um estilo de efeito, valores mistos, ou pelo menos um efeito visível.
        return !!(
          node.effectStyleId ||
          node.effects === "figma-mixed-symbol" || // Handle mixed values
          (Array.isArray(node.effects) &&
            node.effects.some(e => e.visible !== false))
        );

      case "gap":
        // Aplicável se tiver auto-layout com um espaçamento (gap) > 0.
        return (
          (node.layoutMode === "HORIZONTAL" ||
            node.layoutMode === "VERTICAL") &&
          node.itemSpacing > 0
        );

      case "radius":
        // Aplicável se qualquer raio de canto for um número e > 0, ou se for misto.
        if (node.cornerRadius === "figma-mixed-symbol") {
          return true;
        }
        if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
          return true;
        }
        return (
          (node.topLeftRadius && node.topLeftRadius > 0) ||
          (node.topRightRadius && node.topRightRadius > 0) ||
          (node.bottomLeftRadius && node.bottomLeftRadius > 0) ||
          (node.bottomRightRadius && node.bottomRightRadius > 0)
        );

      case "component":
        // Aplicável se for uma instância (para verificar erros de 'detach').
        return node.type === "INSTANCE";

      default:
        return false;
    }
  }

  // Create an array of errors that have matches for the banner
  const errorsWithMatches = bulkErrorList.filter(
    (error: any) => error.matches && error.matches.length > 0
  );
  const totalErrorsWithMatches = errorsWithMatches.reduce(
    (total: number, error: any) => total + (error.count || 1),
    0
  );

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
    <motion.div
      className="bulk-errors-list bulk-errors-container report-container"
      key="bulk-list"
    >
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
                    const stat = conformityStats[type.key];
                    const nonConform = stat.nonConform.size;
                    const conform = stat.applicable.size - nonConform;
                    return (
                      <ConformityItemChart
                        key={type.key}
                        type={type}
                        conform={conform}
                        nonConform={nonConform}
                      />
                    );
                  })}
                </div>
              </li>
              {/* Seção de Detalhamento de Cores */}
              {colorBreakdown && colorBreakdown.length > 0 && (
                <li style={{ listStyle: "none", marginTop: 24 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 400,
                      fontSize: 14,
                      margin: "0 0 8px 0"
                    }}
                  >
                    Detalhamento de Cores (Top 5)
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      margin: 0,
                      padding: 0
                    }}
                  >
                    {colorBreakdown
                      .slice(0, 5)
                      .map(({ color, conform, nonConform }) => {
                        const total = conform + nonConform;
                        const conformPercentage =
                          total > 0 ? Math.round((conform / total) * 100) : 0;
                        const statusColor =
                          conformPercentage >= 80
                            ? "#27AE60"
                            : conformPercentage >= 50
                            ? "#F2C94C"
                            : "#EB5757";

                        return (
                          <div
                            key={color}
                            className="system-card"
                            style={{
                              padding: "12px 16px",
                              border: `1px solid ${statusColor}33`,
                              background: `${statusColor}0D`
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "8px"
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px"
                                }}
                              >
                                <div
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    backgroundColor: color,
                                    border: "1px solid rgba(255,255,255,0.2)"
                                  }}
                                ></div>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    color: "#FFFFFF"
                                  }}
                                >
                                  {color}
                                </span>
                              </div>
                              <div
                                style={{
                                  backgroundColor: `${statusColor}33`,
                                  color: statusColor,
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600
                                }}
                              >
                                {conformPercentage}%
                              </div>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: "6px",
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                borderRadius: "3px",
                                overflow: "hidden"
                              }}
                            >
                              <div
                                style={{
                                  width: `${conformPercentage}%`,
                                  height: "100%",
                                  backgroundColor: statusColor,
                                  borderRadius: "3px",
                                  transition: "width 0.5s ease-in-out"
                                }}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "8px",
                                fontSize: "10px",
                                color: "#B3B3B3"
                              }}
                            >
                              <span>{conform} conforme</span>
                              <span>{nonConform} não conforme</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </li>
              )}
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
                // Calcular elementos do frame por varredura de descendentes
                const frameIds = getFrameNodeIds(frame);
                const totalElements = frameIds.size;
                const frameErrors = filteredFlatErrors.filter(e =>
                  frameIds.has(getErrorNodeId(e))
                );
                const frameNonConformNodeIds = new Set(
                  frameErrors.map(e => getErrorNodeId(e))
                );
                const frameNonConformElements = frameNonConformNodeIds.size;
                const frameConformElements = Math.max(
                  totalElements - frameNonConformElements,
                  0
                );
                const frameDetachCount = frameErrors.filter(
                  e => getErrorType(e) === "detach"
                ).length;
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
                        errors={frameNonConformElements}
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
                          {frameConformElements}
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
                          {frameNonConformElements}
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
                          {frameDetachCount}
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
