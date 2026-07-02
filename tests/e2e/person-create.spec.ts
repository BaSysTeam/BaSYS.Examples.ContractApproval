import { test, expect } from '@playwright/test';
import { appURL } from '../src/config';

/**
 * Пример-тест: проверяем, что в справочнике "Физическое лицо" (person)
 * при заполнении ФИО автоматически формируется поле "Заголовок",
 * и запись успешно сохраняется.
 */
test('person: Заголовок формируется из ФИО и запись сохраняется', async ({ page }) => {
  const lastName = 'Тестов';
  const firstName = 'Тест';
  const middleName = 'Тестович';
  const expectedTitle = `${lastName} ${firstName} ${middleName}`;

  // 1. Открываем список справочника person (SPA, hash-роутинг).
  await page.goto(appURL('/data-objects/catalog/person'));

  // 2. Нажимаем "Добавить" (editMethod = 0 → открывается отдельная страница).
  await page.getByRole('button', { name: 'Добавить' }).click();

  // 3. Заполняем поля ФИО. Метки связаны с инпутами через for/id (column.uid).
  await page.getByLabel('Фамилия').fill(lastName);
  await page.getByLabel('Имя', { exact: true }).fill(firstName);
  await page.getByLabel('Отчество').fill(middleName);

  // 4. Проверяем, что "Заголовок" сформировался автоматически.
  await expect(page.getByLabel('Заголовок')).toHaveValue(expectedTitle);

  // 5. Сохраняем запись и закрываем форму (возврат в список).
  await page.getByRole('button', { name: 'Сохранить&Закрыть' }).click();

  // Тост об успешном сохранении подтверждает, что запись создана.
  await expect(page.locator('.p-toast-message-success')).toBeVisible({ timeout: 15000 });
});
