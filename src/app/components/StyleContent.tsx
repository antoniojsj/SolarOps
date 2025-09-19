import * as React from "react";

function truncateStyle(string) {
  if (!string) return "";
  return string.length > 28 ? string.substring(0, 28) + "..." : string;
}

const StyleContent = ({ style, type, error }) => {
  if (!style) {
    return null;
  }

  const getEffectIcon = effectType => {
    switch (effectType) {
      case "DROP_SHADOW":
        return require("../assets/drop-shadow.svg");
      case "INNER_SHADOW":
        return require("../assets/inner-shadow.svg");
      case "LAYER_BLUR":
        return require("../assets/layer-blur.svg");
      case "BACKGROUND_BLUR":
        return require("../assets/background-blur.svg");
      default:
        return "";
    }
  };

  const renderStylePreview = () => {
    // This function needs to be very defensive, as `style` can be anything.
    switch (type) {
      case "fill":
      case "stroke": {
        const paint =
          style.paint || (Array.isArray(style.paints) && style.paints[0]);
        if (paint && paint.type === "SOLID" && paint.color) {
          const { r, g, b, a } = paint.color;
          const bgColor = `rgba(${Math.round(r * 255)}, ${Math.round(
            g * 255
          )}, ${Math.round(b * 255)}, ${a !== undefined ? a : 1})`;
          return (
            <div
              className="style-preview fill-preview"
              style={{ background: bgColor }}
            ></div>
          );
        }
        // Fallback for gradients, images, or missing color data
        return (
          <div className="style-preview generic-preview">
            <img
              className="style-icon"
              src={require("../assets/palette.svg")}
              alt="color"
            />
          </div>
        );
      }
      case "text": {
        // A text style object from Figma has `fontName.style` (e.g., "Bold", "Regular").
        // We need to convert this to a `fontWeight` number.
        const styleString =
          style.fontName?.style || style.style?.fontStyle || "Normal";
        const weightMap = {
          thin: 100,
          extralight: 200,
          light: 300,
          regular: 400,
          normal: 400,
          medium: 500,
          semibold: 600,
          demibold: 600,
          bold: 700,
          extrabold: 800,
          black: 900,
          heavy: 900
        };
        const fontWeight =
          weightMap[styleString.toLowerCase().replace(/[\s-]/g, "")] || 400;

        return (
          <div className="style-preview text-preview">
            <span style={{ fontWeight: fontWeight }}>Ag</span>
          </div>
        );
      }
      case "effects": {
        const effectType =
          style.effects &&
          Array.isArray(style.effects) &&
          style.effects.length > 0
            ? style.effects[0].type
            : null;
        if (effectType) {
          return (
            <div className="style-preview effect-preview">
              <img
                className="effect-icon"
                src={getEffectIcon(effectType)}
                alt={effectType}
              />
            </div>
          );
        }
        return null;
      }
      case "radius":
        return (
          <div
            className="style-preview generic-preview"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              className="style-icon"
              src={require("../assets/paragraph-spacing.svg")}
              alt="radius"
              style={{ opacity: 0.6, width: 12, height: 12 }}
            />
          </div>
        );
      case "gap":
        return (
          <div
            className="style-preview generic-preview"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              className="style-icon"
              src={require("../assets/gap.svg")}
              alt="gap"
              style={{ opacity: 0.6, width: 12, height: 12 }}
            />
          </div>
        );
      default:
        // For any other type, or if the data is malformed, don't show a preview.
        return null;
    }
  };

  return (
    <div className="style-list-item">
      {renderStylePreview()}
      <span className="style-name">{truncateStyle(style.name)}</span>
    </div>
  );
};

export default StyleContent;
