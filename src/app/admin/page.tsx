import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { login } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthed()) redirect("/admin/dashboard");
  const { error } = await searchParams;

  return (
    <div style={{ maxWidth: 380, margin: "80px auto", padding: "0 24px" }}>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem", marginBottom: 20 }}>
        SatyaPyla Karaoke Admin
      </h1>
      <form action={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoFocus />
        </div>
        {error && <p style={{ color: "#B02A37", fontSize: ".88rem" }}>Wrong password.</p>}
        <button className="btn btn-primary" type="submit">Log in</button>
      </form>
    </div>
  );
}
