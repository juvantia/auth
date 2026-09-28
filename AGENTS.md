# Juvantia Auth Instructions (`auth`)

**Service:** Единая точка идентификации, SSO и публичных профилей граждан экосистемы Juvantia.  
**Domain:** `https://auth.juvantia.org`  
**Core Tech:** Next.js App Router (Node.js 20), SuperTokens (Passwordless Email OTP), PostgreSQL (`postgres-shared`), Zod, Viem.  
**Container:** `auth-service` (порт 3000), зависимость: `supertokens` (порт 3567), сеть: `juvantia-network`.

---

## 1. Архитектурная роль и границы доверия

1. **SSO и идентификация граждан**:
   - `auth` владеет учетными записями SuperTokens, подтвержденными email-адресами и публичными данными профилей граждан (`name`, `username`, `avatar_url`, `status`, `status_description`).
   - Идентификация граждан в защищенных эндпоинтах осуществляется строго через верифицированные сессии SuperTokens (`withSession`).
   - Декодированные JWT-пейлоады или произвольные Bearer-токены без криптографической верификации сессии отклоняются (`401 Unauthorized`).
   - Сервис никогда не раскрывает клиенту `supertokens_id`, внутренние ошибки базы данных, RPC-ошибки или значения переменных окружения.

2. **Запрет произвольной привязки кошельков**:
   - Адреса кошельков категорически запрещено принимать как входящие поля профиля.
   - Прямые маршруты привязки кошелька (`/api/user/wallet/bind`) и создание интентов на переводы (`/api/user/wallet/send-intent`) в `auth` **упразднены**.
   - Протокол криптографического пруфа владения смарт-аккаунтом ZeroDev Kernel (ERC-4337) принадлежит сервису `core` и маршрутизируется через API Gateway: `/v1/wallet/binding/challenge` и `/v1/wallet/binding/confirm`.
   - `auth` выполняет исключительно **read-only чтение** активной записи из таблицы `wallet_bindings`, соответствующей текущему `BLOCKCHAIN_CHAIN_ID`.

3. **Хранение секретов и ключевого материала**:
   - В сервисе категорически запрещено хранить или передавать приватные ключи, сид-фразы, биометрические данные или passkey-секреты.

---

## 2. Клиентский контракт сессий

- **Web-клиенты**: используют кросс-доменные SuperTokens cookies на `.juvantia.org`.
- **Нативный мобильный клиент (`Juvantia Citizen`)**: использует заголовочный режим передачи токенов (`st-auth-mode: header`, заголовки `st-access-token`, `st-refresh-token`, `anti-csrf`).
- Маршрутизация внешнего трафика граждан к `auth` разрешена напрямую только для протокола авторизации `/api/auth/*`. Все остальные операции мобильного приложения обращаются через API Gateway [`api.juvantia.org/v1`](file:///home/delaforge/juvantia/api).

---

## 3. Спецификация пользовательских маршрутов

| Эндпоинт | Метод | Авторизация | Описание и контракт |
| :--- | :--- | :--- | :--- |
| `/api/auth/*` | Методы SuperTokens | Public / Session | Email OTP вход, обновление сессии, логаут, SuperTokens core-протокол. |
| `/api/user/profile` | `GET` | Требуется сессия | Чтение профиля гражданина и верифицированного адреса смарт-аккаунта (`wallet_bindings`). Возвращает `needsOnboarding: true`, если имя, username или кошелек не заданы. |
| `/api/user/profile` | `POST` | Требуется сессия | Строгий DTO: `name`, `username`, `avatar_url?`, `status_description?`. Любые поля кошельков, паролей или ролей отклоняются с ошибкой валидации. |
| `/api/user/upload` | `POST` | Требуется сессия | Загрузка аватара (multipart `file`). Разрешены только JPG, PNG, WebP до 5 МБ. Проверка сигнатуры файла (magic bytes), генерация случайного имени файла. Исполняемые файлы и SVG строго отклоняются. |

---

## 4. Контракт базы данных

`auth` подключается к общему кластеру PostgreSQL (`postgres-shared`):
- База данных `supertokens`: обслуживается напрямую сервисом `supertokens` (схема SuperTokens).
- База данных `juvantia`:
  - Таблица `users`: публичные профили граждан (`supertokens_id`, `email`, `name`, `username`, `avatar_url`, `status`, `status_description`, `smart_wallet_address` как read-side совместимость).
  - Таблица `wallet_bindings`: источник истины для адреса смарт-аккаунта (`state = 'active'`, `chain_id = BLOCKCHAIN_CHAIN_ID`).

---

## 5. Регламент локальной проверки

Перед коммитом изменений обязательно выполнить проверки в директории `auth`:
```sh
npm test              # Запуск набора тестов Vitest (все тесты обязаны проходить)
npx tsc --noEmit      # Проверка статической типизации TypeScript
npm run lint          # Проверка ESLint
```

---

## 6. Деплой и инфраструктура

- Репозиторий деплоится через GitHub Actions (`.github/workflows/deploy.yml`) при пуше в ветку `main`.
- Все коммиты и пуши выполняются строго внутри каталога `auth/`.
- На VPS сервис работает под управлением Docker Compose в каталоге `/root/auth`:
  - `auth-service`: образ `auth-auth:latest`, порт 3000.
  - `supertokens`: образ `registry.supertokens.io/supertokens/supertokens-postgresql:latest`, порт 3567.
