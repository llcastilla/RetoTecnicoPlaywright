# Prueba Técnica – Automatización E2E

[![Playwright Test](https://img.shields.io/badge/Playwright-Test-blue)](https://playwright.dev/)  
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## Descripción
Este proyecto implementa pruebas **End-to-End (E2E)** para el sitio [Floristería Mundo Flor](https://www.floristeriamundoflor.com/) utilizando **Playwright + TypeScript**.  

Se automatizan escenarios de compra en diferentes categorías, garantizando la integridad de productos, carrito y llamadas de red, aplicando buenas prácticas de programación como **Page Object Model (POM)**, selectores resilientes, interceptación de red, esperas explícitas y reportes completos (HTML, capturas, videos y traces).

---

## Tecnologías
- **Node.js 18+**
- **Playwright** con TypeScript
- **npm**
- **Page Object Model (POM)**: HomePage, CategoriaPage, ProductoPage, CarritoPage
- **Fixtures** para datos de prueba

---

## Estructura del proyecto

```
/tests
  /e2e
    amor.spec.ts
    cumple.spec.ts
/pages
  home.page.ts
  categoria.page.ts
  producto.page.ts
  carrito.page.ts
/fixtures
  test-data.ts
playwright.config.ts
package.json
README.md
```

**Descripción de carpetas y archivos:**
- `/tests/e2e`: Escenarios E2E.
- `/pages`: Implementación de POM.
- `/fixtures`: Datos de prueba reutilizables.
- `playwright.config.ts`: Configuración de proyectos, reportes, retries, videos y traces.
- `README.md`: Documentación completa del proyecto.

---

## Escenarios automatizados

### 1. Categoría "Amor"
- Navega al home y entra a la categoría **Amor**.
- Selecciona **dos productos distintos** y agrégalos al carrito.
- **Validaciones:**
  - Carrito con exactamente 2 ítems.
  - Nombre y precio unitario coinciden con lo mostrado.
  - Subtotal = suma de precios.
- **Interceptación de red:**
  - Status 2xx.
  - Respuesta contiene el ID del producto.

### 2. Categoría "Cumpleaños"
- Navega a la categoría **Cumpleaños** y abre un producto.
- Agrega al carrito.
- **Validaciones:**
  - Contador actualizado.
  - Captura de pantalla del carrito antes de eliminar.
- Elimina el producto:
  - Carrito vacío / total = 0.
  - Mensaje de carrito vacío visible.
  - Captura de pantalla después de eliminar.
- Reintentos controlados con `test.retry` para mejorar estabilidad.

---

## Buenas prácticas implementadas
- **Page Object Model (POM)** bien segmentado y reutilizable.
- **Selectores resilientes**: `aria/role`, `getByRole`, `getByText`, `data-testid`.
- **Esperas explícitas**: `expect(...).toBeVisible()` y `expect(...).toHaveText()`.
- **Interceptación de red** para validar acciones críticas.
- **Reporte avanzado**:
  - HTML
  - Capturas de pantalla en pasos clave
  - Videos on-failure
  - Traces en primer retry
  - Anotaciones con `test.info().attach`

---

## Retos adicionales implementados
- **Data-driven:** Parametrización de escenarios con `['Amor', 'Cumpleaños']`.
- **Estado de sesión:** Uso de `storageState` para preservar la navegación inicial.
- **Reporte avanzado:** Integración de captures, videos on-failure y traces.

---

## Instalación y ejecución

### Requisitos
- Node.js 18+
- npm

### Instalación
```bash
git clone <URL_DEL_REPOSITORIO>
cd <nombre_del_proyecto>
npm install
npx playwright install --with-deps
```

### Ejecución de pruebas
```bash
# Ejecutar todas las pruebas
npx playwright test

# Ejecutar prueba específica
npx playwright test tests/e2e/amor.spec.ts

# Visualizar reportes
npx playwright show-report
```

---

## Autor
**Leonardo Luis Castilla García**  
Ingeniero de Automatización  
Correo: leol.castilla@gmail.com