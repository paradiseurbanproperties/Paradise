import { describe, expect, it } from "vitest";
import { submitPropertyInquirySchema } from "./lead";

const validInquiry = {
  propertyId: "a1d15f7c-42c4-4a44-a8c2-8688f6822399",
  senderName: "  Ana López  ",
  senderEmail: "ana@example.com",
  message: "  Me interesa conocer la propiedad.  ",
  privacyConsent: "on",
  website: "",
};

describe("esquema de consultas CRM", () => {
  it("limpia campos de texto y acepta consentimiento", () => {
    const parsed = submitPropertyInquirySchema.safeParse(validInquiry);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.senderName).toBe("Ana López");
      expect(parsed.data.message).toBe("Me interesa conocer la propiedad.");
    }
  });

  it("rechaza identificadores inválidos, correo inválido y consentimiento ausente", () => {
    expect(submitPropertyInquirySchema.safeParse({ ...validInquiry, propertyId: "invalid" }).success).toBe(false);
    expect(submitPropertyInquirySchema.safeParse({ ...validInquiry, senderEmail: "invalid" }).success).toBe(false);
    expect(submitPropertyInquirySchema.safeParse({ ...validInquiry, privacyConsent: "off" }).success).toBe(false);
  });
});
