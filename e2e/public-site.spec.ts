import { expect, test } from "@playwright/test";
import axe from "axe-core";

type AxeBrowserApi = {
  run: (
    context: Document,
    options: { runOnly: { type: "tag"; values: string[] } },
  ) => Promise<{
    violations: Array<{
      id: string;
      impact: string | null;
      help: string;
      nodes: Array<{ target: string[]; failureSummary?: string }>;
    }>;
  }>;
};

async function expectNoAccessibilityViolations(page: import("@playwright/test").Page) {
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => {
    const axeApi = (window as Window & { axe?: AxeBrowserApi }).axe;
    if (!axeApi) throw new Error("axe-core no se cargó en el documento");
    return axeApi.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
  });

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("portada y catálogo cargan con accesibilidad WCAG automatizada", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Un lugar para sentirte");
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "Cambiar al tema oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // La paleta transiciona durante 420 ms; espera a que colores y fondos sean estables antes de axe.
  await page.waitForTimeout(500);
  await expectNoAccessibilityViolations(page);

  await page.evaluate(() => window.localStorage.setItem("paradise-theme", "light"));
  await page.reload({ waitUntil: "networkidle" });

  await page.goto("/propiedades", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("login ofrece controles etiquetados y cumple las reglas axe seleccionadas", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("registro presenta campos accesibles y requisitos de contraseña", async ({ page }) => {
  await page.goto("/registro", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  const password = page.getByLabel("Contraseña");
  await expect(password).toBeVisible();
  await expect(password).toHaveAttribute("minlength", "10");
  await expectNoAccessibilityViolations(page);
});

test("navegación móvil abre, navega y el tema se guarda", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("paradise-theme")) window.localStorage.setItem("paradise-theme", "light");
  });
  await page.goto("/", { waitUntil: "networkidle" });

  const menuButton = page.getByRole("button", { name: "Abrir navegación" });
  await menuButton.click();
  const closeMenuButton = page.getByRole("button", { name: "Cerrar navegación" });
  await expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");
  await expectNoAccessibilityViolations(page);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Propiedades" }).click();
  await expect(page).toHaveURL(/\/propiedades$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const themeButton = page.getByRole("button", { name: "Cambiar al tema oscuro" });
  await themeButton.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("paradise-theme"))).toBe("dark");
  // Evita analizar colores intermedios mientras termina la transición de la paleta.
  await page.waitForTimeout(500);
  await expectNoAccessibilityViolations(page);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Abrir cuenta, iniciar sesión o crear cuenta" }).click();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("la página de mapa conserva controles accesibles", async ({ page }) => {
  await page.goto("/propiedades/mapa", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Radio de búsqueda")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
