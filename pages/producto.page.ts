import { Page } from "@playwright/test";

export class ProductoPage {
  constructor(private page: Page) {}

  /** Espera a que nombre y precio se carguen correctamente */
  async waitForProductToLoad(timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const name = await this.getProductName();
      const price = await this.getProductPrice();
      if (name && name.trim() !== "" && price > 0) return;
      await new Promise(res => setTimeout(res, 50));
    }
    throw new Error("El producto no se cargó correctamente o precio inválido");
  }

  /** Captura el nombre del producto desde <h1 class="product_title entry-title"> */
  async getProductName(): Promise<string> {
    const locator = this.page.locator('h1.product_title.entry-title');
    if (await locator.count() > 0) {
      const text = await locator.innerText();
      return text.trim();
    }
    return "";
  }

  /** Captura el precio del producto desde <p class="price"> bdi */
  async getProductPrice(): Promise<number> {
    const locator = this.page.locator('p.price span.woocommerce-Price-amount bdi');
    if (await locator.count() > 0) {
      const text = await locator.first().innerText();
      return parsePrice(text);
    }
    return 0;
  }

  /** Verifica si el producto tiene stock */
  async isInStock(): Promise<boolean> {
    return (await this.page.locator('p.stock.out-of-stock').count()) === 0;
  }

  /** Agrega el producto al carrito si hay stock */
  async addToCart(): Promise<void> {
    if (!await this.isInStock()) throw new Error("Producto sin stock");

    const button = this.page.getByRole('button', { name: /añadir al carrito/i });
    if (await button.count() > 0) {
      await button.first().click();
      return;
    }

    const cardButton = this.page.locator('a.add_to_cart_button');
    if (await cardButton.count() > 0) {
      await cardButton.first().click();
      return;
    }

    throw new Error("No se encontró botón para añadir al carrito");
  }
}

/** Helper para convertir "$ 129.000" → 129000 */
function parsePrice(text: string): number {
  return parseInt(text.replace(/[^\d]/g, ''), 10);
}
