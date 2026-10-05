import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { login } from "./actions";
import SubmitButton from "@/app/components/SubmitButton";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthed()) redirect("/admin/events");
  const { error } = await searchParams;

  return (
    <div style={{ maxWidth: 380, margin: "80px auto", padding: "0 24px" }}>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem", marginBottom: 20 }}>
        Satya Pyla Karaoke Admin
      </h1>
      <form action={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoFocus />
        </div>
        {error && <p style={{ color: "#B02A37", fontSize: ".88rem" }}>Wrong password.</p>}
        <SubmitButton className="btn btn-primary" pendingLabel="Logging in...">Log in</SubmitButton>
      </form>
    </div>
  );
}
