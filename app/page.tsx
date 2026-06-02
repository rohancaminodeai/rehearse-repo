import { cookies } from "next/headers";
import { getCustomer, getRecordsByCustomer } from "@/lib/db";
import { withDeltas } from "@/lib/measurement";
import { verify } from "@/lib/session";
import { customerLogin, customerLogout, toggleReactionAction } from "./actions";
import { ALLOWED_EMOJI } from "@/lib/reactions";

export const dynamic = "force-dynamic";

const card = { background: "#fff", border: "1px solid #e3e6e0", borderRadius: 14, padding: "1.25rem", margin: "1rem 0", boxShadow: "0 1px 3px rgba(0,0,0,.06)" };
const metricBox = { border: "1px solid #e3e6e0", borderRadius: 10, padding: "10px 14px", minWidth: 90 };
const inp = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, width: "100%" };

function Delta({ v }: { v: number | null | undefined }) {
  if (v == null) return null;
  const up = v > 0;
  const color = up ? "#dc2626" : "#16a34a"; // fat up = bad (red), down = good (green)
  return <span style={{ fontSize: 11, fontWeight: 700, color }}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}</span>;
}

function Sparkline({ records }: { records: { body_fat_pct: number | null }[] }) {
  const vals = records.slice(0, 7).reverse().map(r => r.body_fat_pct).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = max - min || 1;
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: "#5c6b62", fontWeight: 600, marginBottom: 10 }}>체지방률 추이</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 48 }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, background: i === vals.length - 1 ? "#16a34a" : "#34d399", borderRadius: 3, height: `${Math.round(((v - min) / range) * 80 + 20)}%`, opacity: 0.85 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8b988f", marginTop: 4, fontFamily: "monospace" }}>
        <span>{vals[0].toFixed(1)}%</span><span>{vals[vals.length - 1].toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default async function Portal({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const id = verify((await cookies()).get("cust")?.value);
  const customer = id ? await getCustomer(id) : undefined;

  if (!customer) {
    const { error } = await searchParams;
    return (
      <main style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
        <h1 style={{ fontWeight: 800, marginBottom: 4 }}>InBody 결과 확인</h1>
        <p style={{ color: "#5c6b62", fontSize: 14, marginBottom: 20 }}>트레이너가 설정한 비밀번호를 입력하세요.</p>
        {error && <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>비밀번호가 틀렸습니다. 다시 시도해 주세요.</p>}
        <form action={customerLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input name="password" type="password" placeholder="비밀번호" required style={inp} autoFocus />
          <button type="submit" style={{ background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>결과 보기</button>
        </form>
      </main>
    );
  }

  const raw = await getRecordsByCustomer(customer.id);
  const records = withDeltas(raw);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontWeight: 800, margin: 0 }}>{customer.name}</h1>
          <p style={{ color: "#5c6b62", fontSize: 13, margin: "2px 0 0" }}>InBody 측정 기록</p>
        </div>
        <form action={customerLogout}><button type="submit" style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", background: "#fff", cursor: "pointer" }}>로그아웃</button></form>
      </div>

      {raw.length === 0 && <p style={{ color: "#888", marginTop: "2rem" }}>아직 등록된 측정 결과가 없습니다.</p>}

      {raw.length >= 2 && <Sparkline records={raw} />}

      {records.map((r) => {
        const hasMetrics = r.weight != null || r.skeletal_muscle != null || r.body_fat_pct != null || r.inbody_score != null;
        return (
          <div key={r.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, background: "#e6f5ea", color: "#0c7a37", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>IB-{r.id}</span>
              <span style={{ fontSize: 12, color: "#8b988f" }}>{r.measured_on}</span>
            </div>

            {hasMetrics && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 12 }}>
                {r.weight != null && (
                  <div style={metricBox}>
                    <div style={{ fontSize: 10, color: "#8b988f", fontWeight: 600 }}>체중</div>
                    <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{r.weight}<span style={{ fontSize: 11 }}>kg</span></div>
                    <Delta v={r.delta_weight} />
                  </div>
                )}
                {r.skeletal_muscle != null && (
                  <div style={metricBox}>
                    <div style={{ fontSize: 10, color: "#8b988f", fontWeight: 600 }}>골격근량</div>
                    <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{r.skeletal_muscle}<span style={{ fontSize: 11 }}>kg</span></div>
                    <Delta v={r.delta_skeletal_muscle} />
                  </div>
                )}
                {r.body_fat_pct != null && (
                  <div style={metricBox}>
                    <div style={{ fontSize: 10, color: "#8b988f", fontWeight: 600 }}>체지방률</div>
                    <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{r.body_fat_pct}<span style={{ fontSize: 11 }}>%</span></div>
                    <Delta v={r.delta_body_fat_pct} />
                  </div>
                )}
                {r.inbody_score != null && (
                  <div style={metricBox}>
                    <div style={{ fontSize: 10, color: "#8b988f", fontWeight: 600 }}>InBody 점수</div>
                    <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{r.inbody_score}<span style={{ fontSize: 11 }}>점</span></div>
                    <Delta v={r.delta_inbody_score} />
                  </div>
                )}
              </div>
            )}

            <img src={`/uploads/${r.image_path}`} alt="InBody 결과지" style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} />
            {r.comment && <p style={{ marginTop: 10, fontSize: 13, color: "#5c6b62" }}><strong>트레이너:</strong> {r.comment}</p>}
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" as const }}>
              {ALLOWED_EMOJI.map((emoji) => {
                const reacted = r.reactions.find(rx => rx.emoji === emoji);
                return (
                  <form key={emoji} action={toggleReactionAction} style={{ margin: 0 }}>
                    <input type="hidden" name="recordId" value={r.id} />
                    <input type="hidden" name="emoji" value={emoji} />
                    <button type="submit" style={{
                      border: reacted ? "1.5px solid #16a34a" : "1px solid #e3e6e0",
                      background: reacted ? "#e6f5ea" : "#fff",
                      borderRadius: 20, padding: "4px 10px", fontSize: 14, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {emoji}
                      {reacted && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>{reacted.count}</span>}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}
