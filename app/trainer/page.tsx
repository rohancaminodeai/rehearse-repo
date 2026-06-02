import { cookies } from "next/headers";
import { listCustomers } from "@/lib/db";
import { addRecordAction, createCustomerAction, trainerLogin, trainerLogout } from "../actions";

export const dynamic = "force-dynamic";
const card = { border: "1px solid #ddd", borderRadius: 8, padding: "1rem", margin: "1rem 0" };
const row = { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" };
const inp = { padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };

const ERROR_MSG: Record<string, string> = {
  upload: "Invalid image — must be PNG/JPG/GIF/WebP under 5 MB.",
  metric: "Metric value out of range — check weight, muscle, body-fat%, or score.",
  duppw: "That password is already taken by another customer.",
  missing: "Please select an image.",
  server: "Something went wrong. Please try again.",
};

export default async function Trainer({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if ((await cookies()).get("trainer")?.value !== "1") {
    return (
      <main>
        <h1>Trainer Login</h1>
        <form action={trainerLogin} style={row}>
          <input name="password" type="password" placeholder="Trainer password" required style={inp} />
          <button type="submit">Log in</button>
        </form>
      </main>
    );
  }

  const customers = await listCustomers();
  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Trainer Admin</h1>
        <form action={trainerLogout}><button type="submit">Log out</button></form>
      </div>

      {error && (
        <p style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13 }}>
          {ERROR_MSG[error] ?? ERROR_MSG.server}
        </p>
      )}

      <p style={{ fontSize: 13, color: "#666" }}>
        Customers log in at <a href="/">/</a> with the password you set.
      </p>

      <form action={createCustomerAction} style={{ ...row, margin: "1rem 0" }}>
        <input name="name" placeholder="Customer name" required style={inp} />
        <input name="password" type="password" placeholder="Set password" required style={inp} />
        <button type="submit">Add customer</button>
      </form>

      {customers.length === 0 && <p style={{ color: "#888" }}>No customers yet.</p>}

      {customers.map((c) => (
        <section key={c.id} style={card}>
          <h3 style={{ marginBottom: 10 }}>{c.name} <span style={{ fontFamily: "monospace", fontSize: 12, color: "#16a34a" }}>IB-{c.id}</span></h3>
          <form action={addRecordAction} encType="multipart/form-data">
            <input type="hidden" name="customerId" value={c.id} />
            <div style={row}>
              <input type="file" name="image" accept="image/*" required />
              <input name="measured_on" type="date" style={inp}
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div style={{ ...row, marginTop: 8 }}>
              <label style={{ fontSize: 12 }}>Weight (kg)<br />
                <input name="weight" type="number" step="0.1" min="20" max="300" placeholder="—" style={{ ...inp, width: 80 }} /></label>
              <label style={{ fontSize: 12 }}>Skeletal muscle (kg)<br />
                <input name="skeletal_muscle" type="number" step="0.1" min="5" max="80" placeholder="—" style={{ ...inp, width: 80 }} /></label>
              <label style={{ fontSize: 12 }}>Body fat (%)<br />
                <input name="body_fat_pct" type="number" step="0.1" min="1" max="70" placeholder="—" style={{ ...inp, width: 80 }} /></label>
              <label style={{ fontSize: 12 }}>InBody score<br />
                <input name="inbody_score" type="number" min="0" max="100" placeholder="—" style={{ ...inp, width: 80 }} /></label>
              <label style={{ fontSize: 12, flex: 1 }}>Comment<br />
                <input name="comment" placeholder="Trainer note…" style={{ ...inp, width: "100%" }} /></label>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="submit">Upload result</button>
            </div>
          </form>
        </section>
      ))}
    </main>
  );
}
