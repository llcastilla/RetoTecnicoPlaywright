import { Page } from "@playwright/test";

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async selectCategory(categoryName: string) {
    await this.page.locator('#primary-menu').getByRole('link', { name: categoryName }).click();
  }
}