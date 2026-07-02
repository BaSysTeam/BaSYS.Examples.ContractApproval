import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  loginURL, credentials, storageStatePath,
} from '../src/config';

/**
 * Проект авторизации. Логинится через серверную форму ASP.NET Identity
 * и сохраняет состояние сессии (cookie) в tests/.auth/state.json,
 * чтобы остальные тесты не выполняли вход заново.
 */
setup('авторизация', async ({ page }) => {
  await page.goto(loginURL);

  // Поля формы логина: asp-for="Input.Email" рендерится как id="Input_Email" и т.д.
  await page.locator('#Input_Email').fill(credentials.email);
  await page.locator('#Input_Password').fill(credentials.password);
  await page.locator('#Input_DbName').fill(credentials.dbName);

  await page.locator('#login-submit').click();

  // После успешного входа сервер уводит со страницы логина.
  await expect(page).not.toHaveURL(/\/Identity\/Account\/Login/, { timeout: 15000 });

  // Убеждаемся, что не осталось ошибок валидации входа.
  const validationSummary = page.locator('.validation-summary-errors');
  await expect(validationSummary).toHaveCount(0);

  // Гарантируем наличие каталога .auth перед сохранением состояния.
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
});
