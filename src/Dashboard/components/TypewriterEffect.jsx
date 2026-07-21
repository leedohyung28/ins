import React, { useEffect, useState } from "react";

const TypewriterEffect = ({ text = "", delay = 30 }) => {
  const [visibleText, setVisibleText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setVisibleText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) return undefined;

    const timer = window.setTimeout(() => {
      setVisibleText((previous) => previous + text[index]);
      setIndex((previous) => previous + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, index, text]);

  return <span>{visibleText}</span>;
};

export default TypewriterEffect;
