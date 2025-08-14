import * as React from "react";
import StyleListItem from "./StyleListItem";

const StylesPage = ({ stylesInUse }) => {
  // const hasStylesInUse = stylesInUse && stylesInUse.length > 0;

  const fills =
    stylesInUse && Array.isArray(stylesInUse.fills) ? stylesInUse.fills : [];
  const text =
    stylesInUse && Array.isArray(stylesInUse.text) ? stylesInUse.text : [];
  const effects =
    stylesInUse && Array.isArray(stylesInUse.effects)
      ? stylesInUse.effects
      : [];
  const strokes =
    stylesInUse && Array.isArray(stylesInUse.strokes)
      ? stylesInUse.strokes
      : [];

  return (
    <div className="styles-overview-wrapper">
      {/* <div>
        <h4>Styles</h4>
        <p>Overview of how styles are used in your page.</p>
      </div> */}
      <div>
        <h4>Fill Styles</h4>
        <ul className="style-overview-list">
          {fills.map((style, index) => (
            <StyleListItem
              style={style}
              index={index}
              key={`style item - ${style.name}-${index}`}
            />
          ))}
        </ul>
        <h4>Text Styles</h4>
        <ul className="style-overview-list">
          {text.map((style, index) => (
            <StyleListItem
              style={style}
              index={index}
              key={`style item - ${style.name}-${index}`}
            />
          ))}
        </ul>
        <h4>Effect Styles</h4>
        <ul className="style-overview-list">
          {effects.map((style, index) => (
            <StyleListItem
              style={style}
              index={index}
              key={`style item - ${style.name}-${index}`}
            />
          ))}
        </ul>
        <h4>Stroke Styles</h4>
        <ul className="style-overview-list">
          {strokes.map((style, index) => (
            <StyleListItem
              style={style}
              index={index}
              key={`style item - ${style.name}-${index}`}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StylesPage;
