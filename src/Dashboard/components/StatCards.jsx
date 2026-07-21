import React from "react";
import { formatNumber } from "../utils/formatters";

const cards = [
  {
    id: "population",
    label: "전체 인구수",
    icon: "👥",
    unit: "명",
    accent: "#8B5CF6",
  },
  {
    id: "damage",
    label: "전체 우심피해액",
    icon: "🚨",
    unit: "원",
    accent: "#EF4444",
  },
  {
    id: "sub_housing",
    label: "전체 가입가구",
    icon: "🏠",
    unit: "건",
    accent: "#3B82F6",
  },
];

const StatCards = ({ scopeName, totals }) => (
  <section className="stats-grid" aria-label="주요 지표 요약">
    {cards.map((card) => (
      <article className="stat-card" key={card.id}>
        <div
          className="stat-icon"
          style={{ color: card.accent }}
          aria-hidden="true"
        >
          {card.icon}
        </div>
        <div className="stat-info">
          <p>
            {scopeName} {card.label}
          </p>
          <h2>
            {formatNumber(totals[card.id])} <span>{card.unit}</span>
          </h2>
        </div>
      </article>
    ))}
  </section>
);

export default StatCards;
