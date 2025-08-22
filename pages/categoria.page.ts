import { Page } from "@playwright/test";

export class CategoriaPage {
  constructor(private page: Page) {}

  // Ordenar productos según el dropdown de la tienda
  async sortBy(option: string) {
    await this.page.getByLabel('Pedido de la tienda').selectOption(option);
  }

  // Total de productos en la categoría (visibles)
  async getProductCount(): Promise<number> {
    return await this.page.locator('.block-inner').count();
  }

  // Abrir producto por índice
  async selectProductByIndex(index: number) {
    const productCard = this.page.locator('.block-inner').nth(index).locator('a.product-image');
    await productCard.click();
  }

  // ✅ Buscar un producto disponible (sin "Sin existencias")
  private async isAvailable(index: number): Promise<boolean> {
    const product = this.page.locator('.block-inner').nth(index);
    const outOfStock = await product.locator('p.stock.out-of-stock').count();
    return outOfStock === 0;
  }

  // ✅ Selecciona dos productos aleatorios que estén disponibles
  async selectTwoRandomProducts(): Promise<number[]> {
    const count = await this.getProductCount();
    if (count < 2) throw new Error("No hay suficientes productos en la categoría");

    const selected: number[] = [];

    while (selected.length < 2) {
      const randomIndex = Math.floor(Math.random() * count);

      if (!(await this.isAvailable(randomIndex))) {
        continue; // si no hay stock, intenta con otro
      }

      if (!selected.includes(randomIndex)) {
        selected.push(randomIndex);
      }
    }

    return selected;
  }
}
