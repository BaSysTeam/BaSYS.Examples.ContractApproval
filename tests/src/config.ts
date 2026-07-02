import path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения из tests/.env (файл не коммитится в репозиторий).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Возвращает значение обязательной переменной окружения.
 * Если переменная не задана — падаем с понятной ошибкой, чтобы не гонять тесты
 * с пустыми кредами и не путать причину падения.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Переменная окружения ${name} не задана. Скопируйте tests/.env.example в tests/.env и заполните значения.`,
    );
  }
  return value;
}

/** Базовый адрес стенда BaSYS (по умолчанию локальный dev-сервер). */
export const baseURL = process.env.BASYS_BASE_URL ?? 'https://localhost:44365';

/**
 * Учётные данные и параметры входа.
 * Реальные значения хранятся только в tests/.env и в репозиторий не попадают.
 * Читаются лениво (через геттеры), чтобы отсутствие .env не ломало сбор конфигурации,
 * когда переменные фактически не нужны.
 */
export const credentials = {
  get email(): string {
    return requireEnv('BASYS_EMAIL');
  },
  get password(): string {
    return requireEnv('BASYS_PASSWORD');
  },
  get dbName(): string {
    return requireEnv('BASYS_DB_NAME');
  },
};

/** Путь к сохранённому состоянию авторизации (cookie сессии). */
export const storageStatePath = path.resolve(__dirname, '..', '.auth', 'state.json');

/** URL страницы логина (серверная форма ASP.NET Identity). */
export const loginURL = `${baseURL}/Identity/Account/Login`;

/**
 * Собирает URL внутри SPA (hash-роутинг). База приложения — /app.
 * Пример: appURL('/data-objects/catalog/person').
 */
export function appURL(hashRoute: string): string {
  const normalized = hashRoute.startsWith('/') ? hashRoute : `/${hashRoute}`;
  return `${baseURL}/app#${normalized}`;
}
