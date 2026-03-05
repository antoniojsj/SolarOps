import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import AIRlogo from "./AIRlogo";
import "../styles/panel.css";

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
        <PanelHeader title={"Sobre o SolarOps"} handleHide={onClose} />
        <div className="info-panel-content">
          <p>
            O SolarOps é uma iniciativa do Studio de UX na AI/R Company pela
            Compass UOL, que oferece aos clientes parceiros diversas ações para
            aprimorar seus processos e potencializar os ganhos operacionais em
            design.
          </p>
          <p>
            Este plugin tem como objetivo facilitar e escalar a qualidade nos
            projetos de design, atuando como um assistente multifuncional ao
            longo de todo o processo.
          </p>
          <p>
            Ele possibilita a identificação e correção rápida de falhas ainda na
            fase de projeto, além de permitir a realização de auditorias de
            conformidade. O plugin também disponibiliza uma ferramenta de
            análise de contraste para verificar a aplicação de critérios de
            acessibilidade por meio da checagem de cores. Oferece ainda consulta
            simplificada às documentações de acessibilidade da WCAG, facilitando
            sua aplicação prática nos projetos.
          </p>
          <p>
            Além disso, conta com um recurso de inspeção de elementos, que
            auxilia os desenvolvedores ao fornecer as propriedades necessárias
            para implementação.
          </p>
          <p>
            Com o recurso Import Design, é possível importar código e gerar a
            interface no Figma, facilitando o processo de prototipação, testes e
            pesquisa.
          </p>
        </div>
        <div className="logo-container">
          <AIRlogo />
        </div>
      </motion.div>
    </React.Fragment>
  );
}

export default React.memo(InfoPanel);
