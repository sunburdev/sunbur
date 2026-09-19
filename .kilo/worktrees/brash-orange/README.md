# sunbur

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_0cLYF7Fe9nJ4oc0jpLzqHnMjJmEp)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

## Визуальный калькулятор продухов

Конструктор позволяет задать форму и размеры цокольного фундамента, внутренние стены, материал, толщину, высоту продухов и допущения расчёта. Он сравнивает доступные диаметры по количеству отверстий, свободной площади наружных продухов и ориентировочной стоимости бурения. Внутренние отверстия не увеличивают площадь наружного проветривания.

Для запуска установите зависимости командой `npm install`, затем выполните `npm run dev`. Проверка производственной сборки — `npm run build`, запуск готовой сборки — `npm start`.

Страница конструктора — `/kalkulyator-produhov/`. Если Turbopack на Windows сообщает `spawning node pooled process / os error 5`, используйте поддерживаемый режим Webpack: `node node_modules/next/dist/bin/next dev --webpack`. Проверка расчётного модуля: `node --test tests/vent-calculator.test.mjs` (Node.js 24+). Проверка типов: `node node_modules/typescript/bin/tsc --noEmit`.

Публичный канонический URL — `https://sunbur.ru/kalkulyator-produhov` (без завершающего слеша, как в настройках маршрутизации Next.js). Переходы есть в меню, подвале, блоке на главной, разделе цен и на страницах продухов, бурения фундамента и вентиляции. Страница отдаёт описание и инструкцию в исходном HTML; метаданные включают canonical, index/follow, Open Graph, Twitter и JSON-LD WebApplication/BreadcrumbList. URL включён в sitemap, а robots.txt разрешает обход сайта.

После публикации изменений проверьте ответ 200 по публичному URL, отсутствие noindex или ограничений доступа на сервере и доступность `/sitemap.xml`. Для ускорения обнаружения можно отправить страницу на переобход в Google Search Console и Яндекс Вебмастере. Наличие страницы в sitemap и техническая доступность не гарантируют сроки индексации или позиции в поиске.

Числа рассчитываются детерминированно в `lib/vent-calculator.ts`; LLM объясняет готовый расчёт и сравнивает рассчитанные сценарии. Запрос к модели выполняется только после отправки вопроса. Без ключа весь конструктор и расчёт работают, а консультант возвращает пояснение по формулам с меткой расчётного режима.

Для ответов LLM задайте серверные переменные в `.env.local`:

```dotenv
OPENAI_API_KEY=
# Необязательно: адрес совместимого провайдера
OPENAI_BASE_URL=
# Необязательно: название модели; по умолчанию gpt-4o-mini
OPENAI_MODEL=
```

Также поддерживается существующая переменная `OPENAI_MODELS`: при заполнении она имеет приоритет над `OPENAI_MODEL` и должна содержать одно имя модели. После изменения окружения перезапустите сервер. Ключ не передаётся в браузер и не должен иметь префикс `NEXT_PUBLIC_`.

`POST /api/vent-advice` принимает JSON `{ "input": FoundationInput, "variantId": "…", "question": "…" }`. Сервер проверяет параметры общей Zod-схемой и самостоятельно пересчитывает варианты; клиент не передаёт доверенные суммы и рекомендации. Ответ — `{ "answer": "…", "source": "llm" | "calculation" }`, ошибка — `{ "error": "…" }` с соответствующим HTTP-статусом. `GET /api/vent-advice` возвращает только `{ "configured": true | false }`.

Тело запроса ограничено 24 КБ, вопрос — 1200 символами, ответ модели — 1000 токенами; ожидание модели ограничено 22 секундами, отмена запроса передаётся провайдеру. Лимиты одного процесса — 8 запросов в минуту на адрес, 60 запросов в минуту суммарно и 4 одновременных обращения к модели. Для публичного развёртывания с несколькими процессами нужен общий лимит на доверенном прокси; заголовок `x-forwarded-for` должен задаваться этим прокси. Ограничения не заменяют такую защиту.

Результат является предварительной оценкой. Доля наружных отверстий 1/400, шаг и отступы — настраиваемые допущения, а не универсальные нормативы. Соответствие заданной площади не подтверждает выполнение всех требований к конкретному зданию: например, применимость требований к многоквартирным зданиям и минимальную площадь отдельного отверстия нужно проверять отдельно. Геометрическая схема не моделирует движение воздуха, влажность, грунт, радон, армирование и несущую способность. Цена относится к рассчитанному бурению; решётки и дополнительные работы требуют отдельной сметы. Перед работами проектировщик и исполнитель должны проверить размещение, ограничения конструкции, условия доступа и фактическую стоимость.

Онлайн-инструменты: каталог, настройка LLM, ограничения расчётов и проверки описаны в [docs/online-tools.md](docs/online-tools.md).
