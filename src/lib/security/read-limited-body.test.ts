import { describe, expect, it } from "vitest";
import { readLimitedBody } from "./read-limited-body";

describe("lectura de cuerpos HTTP limitados", () => {
  it("lee el body dentro del límite", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "{\"ok\":true}" });
    await expect(readLimitedBody(request, 32)).resolves.toBe("{\"ok\":true}");
  });

  it("rechaza content-length excesivo y tamaño real excedido", async () => {
    const declaredTooLarge = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "10" },
      body: "12345",
    });
    const bodyTooLarge = new Request("https://example.test", { method: "POST", body: "12345" });

    await expect(readLimitedBody(declaredTooLarge, 5)).resolves.toBeNull();
    await expect(readLimitedBody(bodyTooLarge, 4)).resolves.toBeNull();
  });

  it("rechaza UTF-8 inválido y requests sin body", async () => {
    const malformed = new Request("https://example.test", {
      method: "POST",
      body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([0xc3, 0x28])); controller.close(); } }),
      // Fetch exige duplex para cuerpos construidos desde streams.
      duplex: "half",
    } as RequestInit);
    const empty = new Request("https://example.test", { method: "POST" });

    await expect(readLimitedBody(malformed, 8)).resolves.toBeNull();
    await expect(readLimitedBody(empty, 8)).resolves.toBeNull();
  });
});
