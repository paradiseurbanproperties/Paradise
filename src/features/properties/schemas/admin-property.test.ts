import { describe, expect, it } from "vitest";
import { createPropertySchema } from "./admin-property";

const validProperty = {
  title: "Departamento en el centro",
  description: "Departamento de prueba con descripción válida para confirmar el esquema de captura.",
  features: "Balcón, Elevador",
  propertyType: "apartment",
  price: "8500000.75",
  bedrooms: "2",
  bathrooms: "2",
  parking: "1",
  builtArea: "90",
  landArea: "95",
  address: "",
  neighborhood: "Centro",
  city: "Querétaro",
  state: "Querétaro",
  postalCode: "",
  status: "available",
  visibility: "public",
  latitude: "",
  longitude: "",
};

describe("esquema de propiedades", () => {
  it("acepta precios con centavos y normaliza características", () => {
    const parsed = createPropertySchema.safeParse(validProperty);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.price).toBe(8_500_000.75);
      expect(parsed.data.features).toEqual(["Balcón", "Elevador"]);
    }
  });

  it("exige ambas coordenadas o ninguna", () => {
    expect(createPropertySchema.safeParse({ ...validProperty, latitude: "19.4" }).success).toBe(false);
  });
});
