"use client";

import { useState } from "react";
import { useLang } from "@/lib/LangProvider";

const CONTACT_EMAIL = "sivapyla8981@gmail.com";

export default function Contact() {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sentLabel, setSentLabel] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Song request from ${name}`;
    const body = `${msg}\n\n— ${name} (${email})`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      CONTACT_EMAIL
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");
    setSentLabel(t.formSent);
  }

  return (
    <section id="contact">
      <div className="wrap contact-grid">
        <div>
          <span className="eyebrow">{t.contactEyebrow}</span>
          <h2 style={{ marginTop: 10 }}>{t.contactH2}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="cname">{t.formName}</label>
              <input id="cname" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="cemail">{t.formEmail}</label>
              <input id="cemail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="cmsg">{t.formMsg}</label>
              <textarea
                id="cmsg"
                rows={4}
                placeholder={t.formMsgPh}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
              {sentLabel ?? t.formSend}
            </button>
          </form>
        </div>
        <div className="contact-info">
          <div className="cinfo-row">
            <div className="cinfo-icon">✉</div>
            <div>
              <h4>{t.ciEmailH}</h4>
              <p>sivapyla8981@gmail.com</p>
            </div>
          </div>
          <div className="cinfo-row">
            <div className="cinfo-icon">☎</div>
            <div>
              <h4>{t.ciPhoneH}</h4>
              <p>+91 99495 58981 (10am–10pm IST)</p>
            </div>
          </div>
          <div className="cinfo-row">
            <div className="cinfo-icon">💬</div>
            <div>
              <h4>{t.ciWhatsappH}</h4>
              <p>
                <a href="https://wa.me/919949558981" target="_blank" rel="noopener" style={{ color: "var(--good)" }}>
                  {t.ciWhatsappLink}
                </a>
              </p>
            </div>
          </div>
          <div className="cinfo-row">
            <div className="cinfo-icon">▶</div>
            <div>
              <h4>{t.ciYtH}</h4>
              <p>
                <a href="https://www.youtube.com/@Spkaraoke8981" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>
                  {t.ciYtLink}
                </a>
              </p>
            </div>
          </div>
          <div className="cinfo-row">
            <div className="cinfo-icon">📍</div>
            <div>
              <h4>{t.ciBasedH}</h4>
              <p>{t.ciBasedP}</p>
            </div>
          </div>
          <div className="cinfo-row">
            <div className="cinfo-icon">🎤</div>
            <div>
              <h4>{t.ciCustomH}</h4>
              <p>{t.ciCustomP}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
