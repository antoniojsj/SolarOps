import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import SettingsForm from "./SettingsForm";
import LibraryPage from "./LibraryPage";
import "../styles/panel.css";

function SettingsPanel(props) {
  console.log(
    "[SettingsPanel] Renderizando. Bibliotecas recebidas:",
    props.libraries
  );
  const isVisible = props.panelVisible;
  const safeLocalStyles = props.localStyles || { styles: [] };
  const activeComponentLibraries = props.activeComponentLibraries || [];

  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  function handleHide() {
    props.onHandlePanelVisible(false);
  }

  function handleCheckbox() {
    if (props.lintVectors === false) {
      props.updateLintRules(true);
    } else if (props.lintVectors === true) {
      props.updateLintRules(false);
    }
  }

  function clearIgnoredErrors() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "update-storage-from-settings",
          storageArray: []
        }
      },
      "*"
    );
    props.onHandlePanelVisible(false);
  }

  return (
    <React.Fragment>
      <motion.div
        className="panel info-panel-root settings-panel-root"
        initial={{ opacity: 0, x: "100%" }}
        animate={isVisible ? "open" : "closed"}
        transition={{ duration: 0.3, type: "tween" }}
        variants={variants}
        key="settings-panel"
      >
        <PanelHeader title={"Settings"} handleHide={handleHide} />
        <div className="info-panel-content settings-panel-content">
          <div className="settings-row">
            <h3 className="settings-title">Skipping Layers</h3>
            <div className="settings-label settings-no-padding">
              If you have an illustration or set of layers you want the linter
              to ignore, lock them 🔒 in the layer panel.
            </div>
          </div>
          <SettingsForm borderRadiusValues={props.borderRadiusValues} />
          <div className="settings-row">
            <h3 className="settings-title">Lint Vectors (Default Off)</h3>
            <div className="settings-label settings-no-padding">
              Illustrations, vectors, and boolean shapes often throw a lot of
              errors as they rarely use styles for fills. If you'd like to lint
              them as well, check the box below.
              <div className="settings-checkbox-group" onClick={handleCheckbox}>
                <input
                  name="vectorsCheckbox"
                  type="checkbox"
                  checked={props.lintVectors}
                  onChange={handleCheckbox}
                />
                <label>Lint Vectors and Boolean Shapes</label>
              </div>
            </div>
          </div>
          <div className="settings-row">
            <h3 className="settings-title">Ignored Errors</h3>
            {props.ignoredErrorArray.length > 0 ? (
              <React.Fragment>
                <div className="settings-label">
                  {props.ignoredErrorArray.length} errors are being ignored in
                  selection.
                </div>
                <button
                  className="button button--primary"
                  onClick={clearIgnoredErrors}
                >
                  Reset ignored errors
                </button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="settings-label">
                  You haven't ignored any errors yet.
                </div>
              </React.Fragment>
            )}
          </div>
          <div className="settings-row">
            <h3 className="settings-title">
              Bibliotecas de Componentes Ativas
            </h3>
            {/* Exibição removida, pois LibraryPage já exibe as bibliotecas com layout aprimorado */}
          </div>
          <LibraryPage
            libraries={props.libraries}
            onUpdateLibraries={props.onUpdateLibraries}
            localStyles={safeLocalStyles}
            activeComponentLibraries={activeComponentLibraries}
          />
        </div>
      </motion.div>
    </React.Fragment>
  );
}

export default React.memo(SettingsPanel);
