import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";

function PanelHeader(props) {
  return (
    <div className="panel-header">
      <div className="panel-header__action">
        <motion.button
          className="button--icon"
          onClick={props.handleHide}
          whileTap={{ scale: 0.9, opacity: 0.8 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 16L7 10L13 4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>
      <div className="panel-header__title">{props.title}</div>
    </div>
  );
}

export default PanelHeader;
