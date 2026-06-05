import React from "react";
import "./Card.css";

function Card({
  children,
  className = "",
  padding = "20px",
  shadow = true,
  as: Tag = "div",
  ...rest
}) {
  const classes = [
    "card-ui",
    shadow ? "card-ui-shadow" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} style={{ padding }} {...rest}>
      {children}
    </Tag>
  );
}

export default Card;
