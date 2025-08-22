import { test, expect, request } from '@playwright/test';
import * as cheerio from 'cheerio';

import { HomePage } from '../../pages/home.page';
import { CategoriaPage } from '../../pages/categoria.page';
import { ProductoPage } from '../../pages/producto.page';
import { CarritoPage } from '../../pages/carrito.page';
import { categories } from '../../fixtures/test-data';

// Helper para convertir precios "$ 129.000" → 129000
function parsePrice(text: string): number {
  return parseInt(text.replace(/[^\d]/g, ''), 10);
}

// ===== Test data-driven: agregar y validar productos en carrito =====
categories.forEach((categoryName) => {
  test(`Escenario ${categoryName} - seleccionar 2 productos y validar carrito`, async ({ page }) => {
    const home = new HomePage(page);
    const categoria = new CategoriaPage(page);
    const producto = new ProductoPage(page);
    const carrito = new CarritoPage(page);

    // 1. Ir al home
    await home.goto();
    // Captura del home
    const homeScreenshot = await page.screenshot();
    await test.info().attach('Home', { body: homeScreenshot, contentType: 'image/png' });

    // 2. Seleccionar la categoría parametrizada
    await home.selectCategory(categoryName);
    const categoryScreenshot = await page.screenshot();
    await test.info().attach(`Categoría ${categoryName}`, { body: categoryScreenshot, contentType: 'image/png' });

    // 3. Ordenar productos por popularidad
    await categoria.sortBy('popularity');
    const sortedScreenshot = await page.screenshot();
    await test.info().attach('Productos ordenados por popularidad', { body: sortedScreenshot, contentType: 'image/png' });

    // 4. Seleccionar 2 productos aleatorios con stock
    const productosSeleccionados: { name: string; price: number }[] = [];

    while (productosSeleccionados.length < 2) {
      const [index] = await categoria.selectTwoRandomProducts();
      await categoria.selectProductByIndex(index);

      // Esperar que producto cargue correctamente
      await producto.waitForProductToLoad();

      // Captura del detalle del producto
      const productScreenshot = await page.screenshot();
      await test.info().attach(`Detalle producto ${productosSeleccionados.length + 1}`, { body: productScreenshot, contentType: 'image/png' });

      // Obtener nombre y precio
      const name = (await producto.getProductName()).trim();
      const priceTxt = await producto.getProductPrice();
      const price = parsePrice(String(priceTxt));

      // Solo agregar si hay stock y precio válido
      if (await producto.isInStock() && name !== '' && price > 0) {
        await producto.addToCart();
        productosSeleccionados.push({ name, price });

        // Captura del carrito mini después de agregar el producto
        const miniCartScreenshot = await page.screenshot();
        await test.info().attach(`Mini-carrito tras añadir producto ${name}`, { body: miniCartScreenshot, contentType: 'image/png' });

        console.log(`Producto añadido: ${name} - $${price}`);
      } else {
        console.log(`Producto no válido o sin stock: ${name} - $${price}`);
      }

      // Si aún faltan productos, volver a la categoría
      if (productosSeleccionados.length < 2) {
        await home.selectCategory(categoryName);
        await categoria.sortBy('popularity');
      }
    }

    // 5. Abrir carrito
    await carrito.goto();
    const carritoScreenshot = await page.screenshot();
    await test.info().attach('Carrito completo', { body: carritoScreenshot, contentType: 'image/png' });

    // 6. Validar carrito completo usando método de la clase
    await carrito.validateCart(productosSeleccionados);
    console.log(`Carrito validado correctamente para la categoría ${categoryName}:`, productosSeleccionados);
  });
});

// ===== Test API: agregar producto al carrito y validar product_id =====
test('Agregar producto al carrito vía API y validar product_id en mini cart', async ({ request, page }) => {
  const productId = 4100;

  const response = await request.post('https://www.floristeriamundoflor.com/?wc-ajax=add_to_cart', {
    headers: {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': 'https://www.floristeriamundoflor.com',
      'referer': 'https://www.floristeriamundoflor.com/arreglo-florales/',
      'x-requested-with': 'XMLHttpRequest',
      'cookie': '__stripe_mid=e821a73b-98f1-4d8f-a651-9bb69ca7ff7ac10c82; wp_woocommerce_session_3e8cd9d117d40a41730cda3252447dca=t_f07bbc86b3e3b1028e390af8dbd87b%7C%7C1756006844%7C%7C1756003244%7C%7Cc93c9b8f28ddd6fb9806e79f00c345e2'
    },
    form: {
      success_message: '«MDF 0001» se ha añadido a tu carrito',
      product_sku: '',
      product_id: productId.toString(),
      quantity: '1'
    }
  });

  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);

  const body = await response.json();
  const html = body.fragments['div.widget_shopping_cart_content'];

  // Parseamos el HTML
  const $ = cheerio.load(html);

  // Buscamos si existe un elemento con data-product_id igual a nuestro producto
  const productExists = $(`a.remove[data-product_id="${productId}"]`).length > 0;

  // Captura del mini-carrito tras agregar por API
  await page.goto('https://www.floristeriamundoflor.com/carrito/');
  const apiCartScreenshot = await page.screenshot();
  await test.info().attach('Mini-carrito tras agregar por API', { body: apiCartScreenshot, contentType: 'image/png' });

  expect(productExists).toBe(true);
});
