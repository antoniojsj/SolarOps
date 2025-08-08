import * as React from "react";

function Preloader() {
  return (
    <div
      className="preloader"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%"
      }}
    >
      <svg
        className="spinner"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="#18a0fb"
          strokeWidth="4"
          opacity="0.2"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="#18a0fb"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="100 60"
          strokeDashoffset="0"
          style={{
            transformOrigin: "center",
            animation: "spinner-rotate 1s linear infinite"
          }}
        />
      </svg>
      <style>{`
        @keyframes spinner-rotate {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Preloader;
