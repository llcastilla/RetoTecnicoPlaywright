import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { CategoriaPage } from '../../pages/categoria.page';
import { ProductoPage } from '../../pages/producto.page';
import { CarritoPage } from '../../pages/carrito.page';
import { categories } from '../../fixtures/test-data';

// Helper para convertir precios "$ 129.000" → 129000
function parsePrice(text: string): number {
    return parseInt(text.replace(/[^\d]/g, ''), 10);
}

// Agrupamos todos los tests de categorías con reintento controlado
test.describe.configure({ retries: 1 }); // <-- Reintento controlado solo para este grupo de tests

categories.forEach((categoryName) => {
    test(`Escenario ${categoryName} - agregar y eliminar productos con capturas`, async ({ page }) => {
        const home = new HomePage(page);
        const categoria = new CategoriaPage(page);
        const producto = new ProductoPage(page);
        const carrito = new CarritoPage(page);

        // 1. Ir al home
        await home.goto();
        await test.info().attach('Home Page Inicial', { body: await page.screenshot(), contentType: 'image/png' });

        // 2. Seleccionar la categoría parametrizada
        await home.selectCategory(categoryName);
        await test.info().attach(`Categoría seleccionada: ${categoryName}`, { body: await page.screenshot(), contentType: 'image/png' });

        // 3. Ordenar productos por popularidad
        await categoria.sortBy('popularity');
        await test.info().attach('Productos ordenados por popularidad', { body: await page.screenshot(), contentType: 'image/png' });

        // 4. Seleccionar 1 producto aleatorio con stock
        const productosSeleccionados: { name: string; price: number }[] = [];
        let intentos = 0;
        while (productosSeleccionados.length < 1 && intentos < 5) { // límite de intentos para evitar loop infinito
            intentos++;
            const [index] = await categoria.selectTwoRandomProducts();
            await categoria.selectProductByIndex(index);

            // Esperar que producto cargue correctamente
            await producto.waitForProductToLoad();

            // Obtener nombre y precio
            const name = (await producto.getProductName()).trim();
            const priceTxt = await producto.getProductPrice();
            const price = parsePrice(String(priceTxt));

            if (await producto.isInStock() && name && price > 0) {
                await producto.addToCart();
                productosSeleccionados.push({ name, price });

                // Validación en mini-carrito
                await carrito.validateMiniCartCount(productosSeleccionados.length);
                await carrito.validateMiniCartProducts(productosSeleccionados);

                // Captura tras agregar producto
                await test.info().attach(`Producto agregado: ${name}`, { body: await page.screenshot(), contentType: 'image/png' });
                console.log(`Producto añadido: ${name} - $${price}`);
            } else {
                console.log(`Producto no válido o sin stock: ${name} - $${price}`);
            }

            // Si aún falta producto, volver a la categoría
            if (productosSeleccionados.length < 1) {
                await home.selectCategory(categoryName);
                await categoria.sortBy('popularity');
            }
        }

        if (productosSeleccionados.length === 0) {
            test.skip(`No se pudo agregar ningún producto válido en la categoría ${categoryName}`);
        }

        // 5. Captura antes de eliminar
        await test.info().attach('Carrito antes de eliminar', { body: await page.screenshot(), contentType: 'image/png' });

        // 6. Eliminar todos los productos
        await carrito.removeProductsByNames(productosSeleccionados.map(p => p.name));

        // 7. Validar carrito vacío
        await carrito.validateEmptyCart();
        await expect(page.locator('.cart-empty, .woocommerce-cart-empty-message')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('span.mini-cart-items').nth(1)).toHaveText('0', { timeout: 10000 });

        // 8. Captura después de eliminar
        await test.info().attach('Carrito después de eliminar', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });
});
