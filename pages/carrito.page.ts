import { Locator, Page } from "@playwright/test";

export class CarritoPage {
  private readonly page: Page;
  private readonly openCartButton: Locator;
  private readonly viewCartLink: Locator;
  private readonly productRows: Locator;
  private readonly subtotalLocator: Locator;
  private readonly miniCartItems: Locator;
  private readonly miniCartContent: Locator;

  constructor(page: Page) {
    this.page = page;

    // Botón que abre el mini-carrito
    this.openCartButton = page.getByRole('button', { name: /CARRO/i }).first();

    // Link "Ver carrito"
    this.viewCartLink = page.getByRole('link', { name: /Ver carrito/i }).first();

    // Filas del carrito completo
    this.productRows = page.locator('table.shop_table.cart tbody tr.cart_item');

    // Subtotal en la sección de Totales del carrito
    this.subtotalLocator = page.locator('tr.cart-subtotal td span.woocommerce-Price-amount').first();

    // Contador de items en mini-carrito
    this.miniCartItems = page.locator('span.mini-cart-items').nth(1);

    // Contenedor del mini-carrito    
    this.miniCartContent = page.locator('div.dropdown').nth(2);
  }

  // -----------------------------
  // Funcionalidades principales
  // -----------------------------

  /**
   * Navega al carrito completo de manera robusta
   */
  async gotoCumple() {


    await this.waitForClickable(this.viewCartLink);
    await this.clickWithRetry(this.viewCartLink);
    await this.waitUntilVisible(this.page.locator('h1'), 10000);
  }

  async goto() {

    await this.waitForClickable(this.openCartButton);
    await this.clickWithRetry(this.openCartButton);
    await this.waitForClickable(this.viewCartLink);
    await this.clickWithRetry(this.viewCartLink);
    await this.waitUntilVisible(this.page.locator('h1'), 10000);
  }
  /**
   * Obtiene productos con nombre y precio del carrito completo
   */
  async getProducts(): Promise<{ name: string; price: number }[]> {
    await this.waitUntilVisible(this.productRows.first(), 5000);
    const rows = await this.productRows.elementHandles();
    const products: { name: string; price: number }[] = [];

    for (const row of rows) {
      const name = (await row.$eval('td.product-name a', el => el.textContent?.trim())) ?? '';
      const priceText = (await row.$eval('td.product-price span.woocommerce-Price-amount', el => el.textContent?.trim())) ?? '0';
      const price = this.parsePrice(priceText);
      products.push({ name, price });
    }
    return products;
  }

  /**
   * Obtiene el subtotal del carrito completo
   */
  async getSubtotal(): Promise<number> {
    await this.waitUntilVisible(this.subtotalLocator, 5000);
    const text = (await this.subtotalLocator.innerText()).trim();
    return this.parsePrice(text);
  }

  /**
   * Valida el carrito completo: cantidad, nombres, precios y subtotal
   */
  async validateCart(expectedProducts: { name: string; price: number }[]) {
    const cartProducts = await this.getProducts();

    if (cartProducts.length !== expectedProducts.length) {
      throw new Error(`El carrito tiene ${cartProducts.length} ítems, se esperaban ${expectedProducts.length}`);
    }

    for (const expected of expectedProducts) {
      const match = cartProducts.find(p => p.name === expected.name && p.price === expected.price);
      if (!match) {
        throw new Error(`Producto no coincide: ${expected.name} - $${expected.price}`);
      }
    }

    const subtotal = await this.getSubtotal();
    const totalExpected = expectedProducts.reduce((sum, p) => sum + p.price, 0);
    const tolerance = 5;
    if (Math.abs(subtotal - totalExpected) > tolerance) {
      throw new Error(`Subtotal incorrecto. Mostrado: ${subtotal}, esperado: ${totalExpected}`);
    }
  }

  // -----------------------------
  // Funcionalidades de mini-carrito
  // -----------------------------

  /**
   * Valida el contador de items del mini-carrito
   */
  async validateMiniCartCount(expectedCount: number) {
    await this.page.reload();
    await this.waitUntilVisible(this.miniCartItems);
    const text = (await this.miniCartItems.innerText()).trim();
    const actualCount = parseInt(text, 10);
    if (actualCount !== expectedCount) {
      throw new Error(`El contador del mini-carrito es ${actualCount}, se esperaba ${expectedCount}`);
    }
  }

  /**
   * Valida que los productos y precios aparezcan en el mini-carrito
   */
  async validateMiniCartProducts(expectedProducts: { name: string; price: number }[]) {
    await this.openCartButton.click();
    await this.waitUntilVisible(this.miniCartContent);

    for (const product of expectedProducts) {
      const nameLocator = this.miniCartContent.locator(`.product-name:has-text("${product.name}")`);
      if (!(await nameLocator.isVisible())) {
        throw new Error(`Producto no visible en mini-carrito: ${product.name}`);
      }

      const priceLocator = nameLocator.locator('~ span.woocommerce-Price-amount');
      if (!(await priceLocator.isVisible())) {
        throw new Error(`Precio no visible para producto ${product.name}`);
      }

      const priceText = (await priceLocator.innerText()).trim();
      const actualPrice = this.parsePrice(priceText);
      if (actualPrice !== product.price) {
        throw new Error(`Precio incorrecto para ${product.name}. Mostrado: ${actualPrice}, esperado: ${product.price}`);
      }
    }
  }
  // -----------------------------
  // Eliminación de productos
  // -----------------------------

  
/**
 * Espera a que el contador del mini-carrito tenga el valor esperado
 */
private async waitForMiniCartCount(expectedCount: number, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const text = (await this.miniCartItems.innerText()).trim();
        const actualCount = parseInt(text, 10);
        if (actualCount === expectedCount) return; // contador actualizado
        await new Promise(res => setTimeout(res, 100));
    }
    throw new Error(`Timeout: El mini-carrito no alcanzó el contador esperado (${expectedCount}) en ${timeout}ms`);
}

/**
 * Elimina un producto del carrito por nombre usando getByRole
 */
public async removeProductByName(name: string) {
    const ariaLabel = `Remove ${name} from cart`;
    const removeButton = this.page.getByRole('link', { name: ariaLabel }).first();


    if (await removeButton.count() === 0) {
        console.warn(`No se encontró botón de eliminar para "${name}"`);
        return;
    }

    // Click con retry
    await this.clickWithRetry(removeButton);

    // Esperar a que la fila desaparezca
    const productRow = this.page.locator('table.shop_table.cart tbody tr.cart_item')
                                .locator(`td.product-name a:has-text("${name}")`);
    await productRow.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {
        console.warn(`Producto "${name}" todavía visible tras eliminar, continuando...`);
    });

    // Esperar a que el mini-carrito se actualice

    const remainingCount = (await this.productRows.count()) - 1; // restar el eliminado
    await this.waitForMiniCartCount(Math.max(0, remainingCount));
}

/**
 * Elimina múltiples productos del carrito usando un array de nombres
 */
public async removeProductsByNames(names: string[]) {
    for (const name of names) {
        await this.removeProductByName(name);
    }
}

  // -----------------------------
  // Validación de carrito vacío
  // -----------------------------

public async validateEmptyCart() {
    // Esperar a que no haya filas de productos
        await this.page.reload();

    const start = Date.now();
    const timeout = 10000;
    while (Date.now() - start < timeout) {
        const count = await this.productRows.count();
        if (count === 0) break; // carrito vacío
        await new Promise(res => setTimeout(res, 100));
    }

    const finalCount = await this.productRows.count();
    if (finalCount > 0) {
        throw new Error(`El carrito no está vacío. Quedan ${finalCount} productos.`);
    }

    // Validar subtotal
    const subtotal = await this.getSubtotal().catch(() => 0);
    if (subtotal !== 0) {
        throw new Error(`Subtotal incorrecto en carrito vacío. Mostrado: ${subtotal}, esperado: 0`);
    }

    // Validar mensaje de carrito vacío
    const emptyMessage = this.page.locator('.cart-empty, .woocommerce-cart-empty-message');
    if (!(await emptyMessage.isVisible())) {
        console.warn("No se encontró mensaje de carrito vacío");
    }

    // Validar mini-carrito
    await this.waitForMiniCartCount(0);
}
  // -----------------------------
  // Utilidades privadas
  // -----------------------------

  private parsePrice(text: string): number {
    return parseInt(text.replace(/[^\d]/g, ''), 10);
  }

  private async clickWithRetry(locator: Locator, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await locator.isVisible() && await locator.isEnabled()) {
          await locator.click();
          return;
        }
      } catch { }
      await new Promise(res => setTimeout(res, 50));
    }
    throw new Error(`Timeout: No se pudo hacer click en ${locator} en ${timeout}ms`);
  }

  private async waitUntilVisible(locator: Locator, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await locator.isVisible()) return;
      await new Promise(res => setTimeout(res, 50));
    }
    throw new Error(`Timeout: Element ${locator} no se volvió visible en ${timeout}ms`);
  }

  private async waitForClickable(locator: Locator, timeout = 10000) {
    await this.waitUntilVisible(locator, timeout);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await locator.isEnabled()) return;
      await new Promise(res => setTimeout(res, 50));
    }
    throw new Error(`Timeout: Element ${locator} no se volvió clickeable en ${timeout}ms`);
  }



}
