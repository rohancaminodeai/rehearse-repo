"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", textAlign: "center" }}>
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>문제가 발생했습니다</h2>
      <p style={{ color: "#5c6b62", fontSize: 14, marginBottom: 20 }}>
        일시적인 오류입니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button onClick={reset} style={{ background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        다시 시도
      </button>
    </main>
  );
}
