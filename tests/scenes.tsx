import { createRoot } from "react-dom/client";
import { useState } from "react";
import { CourtScene } from "../src/CourtScene";
import { SCENARIOS } from "../src/scenarios";
import { DEFAULT_TEST } from "../src/model";
import "../src/styles.css";
function Catalogue() {
  const [index, setIndex] = useState(0);
  return (
    <>
      <select
        aria-label="Ситуация"
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
      >
        {SCENARIOS.map((s, i) => (
          <option key={s.id} value={i}>
            {s.id}
          </option>
        ))}
      </select>
      <div style={{ height: "28rem", width: "100%" }}>
        <CourtScene
          scenario={SCENARIOS[index]}
          settings={DEFAULT_TEST}
          onReady={() =>
            (document.documentElement.dataset.ready = String(index))
          }
        />
      </div>
      <p>{SCENARIOS[index].explanation}</p>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Catalogue />);
