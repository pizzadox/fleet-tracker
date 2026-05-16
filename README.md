# FleetTracker — Система управления автопарком

Веб-приложение для комплексного управления автопарком: учёт техники, сотрудники, ремонты, экипажи, рейсы, интеграция с ГЛОНАСС-трекерами Axenta.cloud.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-black)

---

## Возможности

### Техника и оборудование
- Полный учёт автотранспорта и спецтехники (VIN, СТС, ПТС, страховка, ТО)
- Фотографии и документы к единице техники
- Отслеживание статуса: активна, на ремонте, списана, в аренде
- Привязка к компаниям-владельцам и арендаторам

### Сотрудники и экипажи
- Кадровый учёт: ФИО, должность, ВУ, паспорт, зарплата
- Формирование экипажей/бригад из сотрудников
- Привязка экипажей к единицам техники
- Статусы: активен, уволен, отпуск, больничный

### Ремонты
- Создание заявок на ремонт с этапами выполнения
- Назначение мастеров и ответственных из числа сотрудников
- Фотографии до/после ремонта
- Отслеживание стоимости и сроков

### Рейсы и маршруты
- Планирование и учёт рейсов с привязкой к технике и экипажу
- Завершение рейса с автоматической фиксацией данных трекера
- Просмотр трека на карте после завершения рейса
- Аналитика: топливо, пробег, средняя/макс. скорость, моточасы, заправки/сливы

### ГЛОНАСС / Axenta.cloud
- Интеграция с платформой Axenta.cloud по API
- Синхронизация данных трекеров: координаты, скорость, зажигание, топливо
- Загрузка треков за произвольный период
- Данные датчиков: топливо, температура, пробег, обороты двигателя
- Карта с отображением позиций техники (Leaflet)

### Уведомления
- Настраиваемые правила уведомлений по технике
- Условия: офлайн, нет синхронизации, не двигается, превышение скорости, низкое топливо, выход из зоны

### Отчёты
- Экспорт данных в XLSX (Excel)

---

## Технологии

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 (App Router, standalone) |
| Язык | TypeScript 5 |
| База данных | SQLite + Prisma ORM |
| UI | Tailwind CSS 4 + shadcn/ui |
| Карты | Leaflet + React-Leaflet |
| Графики | Recharts |
| Иконки | Lucide React |
| XLSX | SheetJS |

---

## Структура проекта

```
src/
├── app/
│   ├── page.tsx              # Главная страница (все вкладки)
│   ├── layout.tsx            # Корневой layout
│   ├── globals.css           # Глобальные стили
│   └── api/
│       ├── companies/        # API компаний
│       ├── employees/        # API сотрудников
│       ├── equipment/        # API техники
│       ├── repairs/          # API ремонтов
│       ├── crews/            # API экипажей
│       ├── trips/            # API рейсов
│       ├── glonass/          # API ГЛОНАСС (Axenta.cloud)
│       └── notifications/    # API уведомлений
├── components/
│   ├── ui/                   # shadcn/ui компоненты
│   └── tracker-map.tsx       # Компонент карты с треками
├── hooks/                    # Custom React hooks
└── lib/
    ├── db.ts                 # Prisma client singleton
    └── utils.ts              # Утилиты
prisma/
└── schema.prisma             # Схема базы данных
```

---

## Быстрый старт

### Требования

- Node.js 18+ или Bun
- npm/bun

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/USERNAME/fleet-tracker.git
cd fleet-tracker

# Установка зависимостей
npm install

# Настройка базы данных
npx prisma generate
npx prisma db push

# Сборка проекта
npm run build

# Запуск в production режиме
npm start
```

### Разработка

```bash
# Запуск dev-сервера
npm run dev

# Открыть http://localhost:3000
```

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
DATABASE_URL="file:./custom.db"
```

Для интеграции с Axenta.cloud добавьте:

```env
AXENTA_API_URL="https://your-axenta-instance.cloud/api"
AXENTA_API_KEY="your-api-key"
```

---

## Модели данных

- **Company** — Компании (владельцы, арендаторы)
- **Equipment** — Единицы техники (автомобили, спецтехника, прицепы)
- **Employee** — Сотрудники (водители, механики, грузчики)
- **Crew / CrewMember** — Экипажи и их состав
- **Repair / RepairStage / RepairEmployee** — Ремонты, этапы, назначенные мастера
- **Trip** — Рейсы с аналитикой трекера
- **GlonassTracker / GlonassSensorData** — Трекеры и данные датчиков
- **NotificationRule** — Правила уведомлений
- **EquipmentPhoto / EquipmentDocument / EquipmentHistory** — Фотографии, документы, история

---

## Лицензия

Частный проект. Все права защищены.
