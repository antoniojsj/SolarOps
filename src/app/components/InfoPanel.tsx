import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import "../styles/panel.css";
// Certifique-se de mover logoCompass.png para a pasta public na raiz do projeto

function InfoPanel({ isVisible, onClose }) {
  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  return (
    <React.Fragment>
      <motion.div
        className="panel info-panel-root"
        initial={{ opacity: 0, x: "100%" }}
        animate={isVisible ? "open" : "closed"}
        transition={{ duration: 0.3, type: "tween" }}
        variants={variants}
        key="info-panel"
      >
        <PanelHeader title={"Informações"} handleHide={onClose} />
        <div className="info-panel-content">
          <h3>Sobre o Sherlock</h3>
          <p>
            Este plugin realiza auditoria de conformidade visual em projetos
            Figma, analisando cores, tipografia, espaçamento e muito mais.
          </p>
          <p>
            Utilize a aba Auditoria para iniciar uma análise e veja relatórios
            detalhados após a execução.
          </p>
          <p>
            Para dúvidas, sugestões ou suporte, acesse a documentação ou entre
            em contato com o time de desenvolvimento.
          </p>
        </div>
        <img
          src={"/logoCompass.png"}
          alt="Logo Compass"
          className="info-panel-logo"
        />
      </motion.div>
    </React.Fragment>
  );
}

export default React.memo(InfoPanel);
