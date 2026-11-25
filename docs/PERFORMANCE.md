# Rendimiento y Web Vitals

## Lighthouse móvil — 2026-11-24

Auditoría de laboratorio del deployment público:

- URL: `https://paradise-kappa-gray.vercel.app/`
- Herramienta: Lighthouse 13.6.0, Chrome headless con perfil móvil predeterminado.
- Resultado de esta muestra: rendimiento 99, accesibilidad 100, buenas prácticas 100, SEO 100.
- Métricas: FCP 1.0 s, LCP 1.0 s, CLS 0, TBT 70 ms, Speed Index 2.8 s y TTI 5.2 s.
- El JSON completo se guardó temporalmente en `/tmp/paradise-home-mobile.json`.

## Lighthouse escritorio — 2026-11-24

Segunda muestra de laboratorio de la misma portada, con preset de escritorio:

- Resultado: rendimiento 99, accesibilidad 100, buenas prácticas 100, SEO 100.
- Métricas: FCP 0.4 s, LCP 0.5 s, CLS 0, TBT 10 ms, Speed Index 1.2 s; tiempo de respuesta del documento 70 ms.
- Oportunidades estimadas: 102 KiB de JavaScript y 25 KiB de CSS no utilizados.
- El JSON se guardó temporalmente en `/tmp/paradise-home-desktop.json`.

## Límites

Es una sola ejecución sintética contra una ruta pública en un momento concreto. Red, región, caché y contenido pueden cambiar resultados. Lighthouse no midió INP real de visitantes ni sustituyó datos de campo de CrUX/Search Console; TBT y max-potential-FID son indicadores de laboratorio.

## Oportunidades detectadas

- Estima hasta 366 KiB de mejora en imágenes y 323 KiB en vida de caché. Revisar tamaño/formato de imágenes servidas y cabeceras de recursos externos antes de cambiar la política de caché de Next/Vercel.
- Reporta 103 KiB de JavaScript y 25 KiB de CSS no utilizados en esta carga. Revisar componentes cliente e imports por ruta y confirmar el impacto tras cualquier cambio.
- La restauración back/forward cache tuvo dos motivos de exclusión. Revisar los detalles de `bf-cache` en el JSON antes de decidir si es un problema corregible o un efecto normal de la ruta dinámica.

No se aplicaron cambios de rendimiento basados en estas dos corridas. Repetir varias veces por perfil y auditar el catálogo antes de comparar regresiones o declarar mejoras. Para Core Web Vitals reales se necesitan datos de campo suficientes.
