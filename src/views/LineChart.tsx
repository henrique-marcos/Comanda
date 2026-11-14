import { useState } from "react";

const short = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 100) / 100));

function niceMax(max: number) {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

// Gráfico de linha. Toque (ou passe o rato) num ponto para ver o valor.
export default function LineChart({ labels, values, fmt }: { labels: string[]; values: number[]; fmt: (n: number) => string }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 480, H = 240, L = 40, R = 12, T = 12, B = 26;
  const n = labels.length;
  const max = Math.max(0, ...values);
  const nice = niceMax(max);
  const ph = H - T - B;
  const x = (i: number) => (n > 1 ? L + 8 + (i * (W - L - R - 16)) / (n - 1) : L + (W - L - R) / 2);
  const y = (v: number) => T + ph - (ph * v) / nice;
  const step = Math.ceil(n / 10);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${T + ph} L${x(0).toFixed(1)} ${T + ph} Z`;
  const shown = sel !== null && sel < n ? sel : max > 0 ? values.indexOf(max) : null;

  return (
    <>
      <p className="mut lc-read">
        {shown !== null && max > 0
          ? <><b>{labels[shown]}</b>: {fmt(values[shown])}{sel === null ? " (máximo)" : ""}</>
          : "Sem dados neste período."}
      </p>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de linha" onMouseLeave={() => setSel(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const yy = T + ph * (1 - i / 4);
          return (
            <g key={i}>
              <line className="gl" x1={L} x2={W - R} y1={yy} y2={yy} />
              <text x={L - 6} y={yy + 4} textAnchor="end">{short((nice * i) / 4)}</text>
            </g>
          );
        })}
        <path className="lc-area" d={area} />
        <path className="lc-line" d={line} />
        {values.map((v, i) => (
          <g key={i}>
            <circle className={`lc-pt${i === shown ? " sel" : ""}`} cx={x(i)} cy={y(v)} r={i === shown ? 5 : 3} />
            <circle className="lc-hit" cx={x(i)} cy={y(v)} r={11} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)}>
              <title>{`${labels[i]}: ${fmt(v)}`}</title>
            </circle>
            {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle">{labels[i]}</text>}
          </g>
        ))}
      </svg>
    </>
  );
}
