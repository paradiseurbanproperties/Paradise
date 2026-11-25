import { afterEach, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: mail.createTransport } }));
import { notifyProjectOfInquiry } from "./inquiry-email";

const inquiry = { senderName: "Ana", senderEmail: "ana@example.com", message: "¿Sigue disponible?", propertyId: "00000000-0000-4000-8000-000000000001" };
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("aviso de consulta", () => {
  it("conserva CRM sin intentar correo si falta la contraseña", async () => {
    vi.stubEnv("CRM_GMAIL_APP_PASSWORD", "");
    expect(await notifyProjectOfInquiry(inquiry)).toBe(false);
    expect(mail.createTransport).not.toHaveBeenCalled();
  });
  it("envía solo al Gmail del proyecto y deja Reply-To al visitante", async () => {
    vi.stubEnv("CRM_GMAIL_APP_PASSWORD", "test password");
    mail.sendMail.mockResolvedValue({ messageId: "accepted" });
    mail.createTransport.mockReturnValue({ sendMail: mail.sendMail, close: mail.close });
    expect(await notifyProjectOfInquiry(inquiry)).toBe(true);
    expect(mail.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: "paradiseurbanproperties@gmail.com", pass: "testpassword" } }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "paradiseurbanproperties@gmail.com",
      replyTo: { name: "Ana", address: "ana@example.com" } }));
    expect(mail.close).toHaveBeenCalledOnce();
  });
  it("falla sin perder la consulta ni registrar datos personales", async () => {
    vi.stubEnv("CRM_GMAIL_APP_PASSWORD", "test-password");
    mail.sendMail.mockRejectedValue(Object.assign(new Error("private"), { code: "EAUTH" }));
    mail.createTransport.mockReturnValue({ sendMail: mail.sendMail, close: mail.close });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyProjectOfInquiry(inquiry)).toBe(false);
    expect(log).toHaveBeenCalledWith("[crm:email] No se pudo enviar el aviso", { code: "EAUTH" });
    log.mockRestore();
  });
});
