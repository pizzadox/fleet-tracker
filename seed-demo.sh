#!/bin/bash
BASE="http://127.0.0.1:3000/api"

# ═══════════════════════════════════════════════════
# 1. ADD 15 TEST EMPLOYEES
# ═══════════════════════════════════════════════════

# Employee 1 — Водитель, опытный
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Смирнов Алексей Викторович",
  "position": "driver",
  "phone": "+7(921)123-45-67",
  "email": "smirnov@transauto.ru",
  "birthDate": "1985-03-12",
  "hireDate": "2019-06-01",
  "licenseNum": "99 20 567890",
  "licenseCat": "CE",
  "licenseExpiry": "2028-03-12",
  "passportSeries": "4010",
  "passportNum": "123456",
  "address": "г. Великий Новгород, ул. Ломоносова, д. 15, кв. 42",
  "status": "active",
  "salary": 85000,
  "notes": "Опытный водитель, стаж более 15 лет. Безаварийная езда."
}'

# Employee 2 — Водитель
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Козлов Дмитрий Сергеевич",
  "position": "driver",
  "phone": "+7(911)234-56-78",
  "email": "kozlov@transauto.ru",
  "birthDate": "1990-07-25",
  "hireDate": "2021-03-15",
  "licenseNum": "99 22 345678",
  "licenseCat": "C",
  "licenseExpiry": "2027-07-25",
  "passportSeries": "4012",
  "passportNum": "234567",
  "address": "г. Великий Новгород, пр. Мира, д. 28, кв. 11",
  "status": "active",
  "salary": 75000,
  "notes": "Перевозки по области, категория C."
}'

# Employee 3 — Водитель, в отпуске
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Волков Андрей Николаевич",
  "position": "driver",
  "phone": "+7(921)345-67-89",
  "email": "volkov@mail.ru",
  "birthDate": "1988-11-03",
  "hireDate": "2020-09-01",
  "licenseNum": "99 19 678901",
  "licenseCat": "CE",
  "licenseExpiry": "2026-11-03",
  "passportSeries": "4008",
  "passportNum": "345678",
  "address": "г. Великий Новгород, ул. Федоровский ручей, д. 5, кв. 33",
  "status": "vacation",
  "salary": 80000,
  "notes": "Отпуск с 10.05.2026 по 30.05.2026"
}'

# Employee 4 — Механик
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Новиков Павел Александрович",
  "position": "mechanic",
  "phone": "+7(911)456-78-90",
  "email": "novikov@transauto.ru",
  "birthDate": "1982-05-18",
  "hireDate": "2018-01-15",
  "licenseNum": "99 17 789012",
  "licenseCat": "B",
  "licenseExpiry": "2027-05-18",
  "passportSeries": "4005",
  "passportNum": "456789",
  "address": "г. Великий Новгород, ул. Большая Московская, д. 72, кв. 18",
  "status": "active",
  "salary": 70000,
  "notes": "Старший механик. Специализация: дизельные двигатели, гидравлика."
}'

# Employee 5 — Механик
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Морозов Игорь Петрович",
  "position": "mechanic",
  "phone": "+7(921)567-89-01",
  "email": "morozov@transauto.ru",
  "birthDate": "1993-09-07",
  "hireDate": "2022-05-10",
  "licenseNum": null,
  "licenseCat": null,
  "licenseExpiry": null,
  "passportSeries": "4014",
  "passportNum": "567890",
  "address": "г. Великий Новгород, ул. Стратилатская, д. 10, кв. 5",
  "status": "active",
  "salary": 60000,
  "notes": "Младший механик, обучение на СТО."
}'

# Employee 6 — Водитель на больничном
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Петров Олег Владимирович",
  "position": "driver",
  "phone": "+7(911)678-90-12",
  "email": "petrov_o@mail.ru",
  "birthDate": "1979-02-14",
  "hireDate": "2017-04-20",
  "licenseNum": "99 15 890123",
  "licenseCat": "CE",
  "licenseExpiry": "2026-02-14",
  "passportSeries": "4003",
  "passportNum": "678901",
  "address": "г. Великий Новгород, ул. Германа, д. 22, кв. 7",
  "status": "sick",
  "salary": 82000,
  "notes": "Больничный до 20.05.2026. Категория CE — дальнобой."
}'

# Employee 7 — Помощник водителя
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Соколов Максим Юрьевич",
  "position": "assistant",
  "phone": "+7(921)789-01-23",
  "email": "sokolov@transauto.ru",
  "birthDate": "1995-12-28",
  "hireDate": "2023-08-01",
  "licenseNum": "99 24 901234",
  "licenseCat": "B",
  "licenseExpiry": "2029-12-28",
  "passportSeries": "4016",
  "passportNum": "789012",
  "address": "г. Великий Новгород, ул. Труда, д. 8, кв. 50",
  "status": "active",
  "salary": 50000,
  "notes": "Помощник водителя на дальних рейсах."
}'

# Employee 8 — Грузчик
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Лебедев Виктор Андреевич",
  "position": "loader",
  "phone": "+7(911)890-12-34",
  "email": null,
  "birthDate": "1991-04-05",
  "hireDate": "2024-01-10",
  "licenseNum": null,
  "licenseCat": null,
  "licenseExpiry": null,
  "passportSeries": "4013",
  "passportNum": "890123",
  "address": "г. Великий Новгород, ул. Людогоща, д. 14, кв. 2",
  "status": "active",
  "salary": 45000,
  "notes": "Погрузочно-разгрузочные работы."
}'

# Employee 9 — Уволенный водитель
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Кузнецов Роман Дмитриевич",
  "position": "driver",
  "phone": "+7(921)901-23-45",
  "email": "kuznetsov_rd@mail.ru",
  "birthDate": "1987-06-20",
  "hireDate": "2020-02-01",
  "fireDate": "2025-11-15",
  "licenseNum": "99 20 012345",
  "licenseCat": "C",
  "licenseExpiry": "2027-06-20",
  "passportSeries": "4009",
  "passportNum": "901234",
  "address": "г. Великий Новгород, ул. Нехинская, д. 55, кв. 31",
  "status": "dismissed",
  "salary": 72000,
  "notes": "Уволен по собственному желанию."
}'

# Employee 10 — Водитель
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Попов Сергей Иванович",
  "position": "driver",
  "phone": "+7(911)012-34-56",
  "email": "popov@transauto.ru",
  "birthDate": "1992-08-11",
  "hireDate": "2022-11-01",
  "licenseNum": "99 23 123456",
  "licenseCat": "C",
  "licenseExpiry": "2028-08-11",
  "passportSeries": "4015",
  "passportNum": "012345",
  "address": "г. Великий Новгород, ул. Псковская, д. 30, кв. 14",
  "status": "active",
  "salary": 70000,
  "notes": "Региональные перевозки."
}'

# Employee 11 — Механик на больничном
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Васильев Артём Олегович",
  "position": "mechanic",
  "phone": "+7(921)112-33-44",
  "email": "vasiliev@transauto.ru",
  "birthDate": "1986-01-30",
  "hireDate": "2019-07-15",
  "licenseNum": null,
  "licenseCat": null,
  "licenseExpiry": null,
  "passportSeries": "4007",
  "passportNum": "112233",
  "address": "г. Великий Новгород, ул. Маловишерская, д. 9, кв. 22",
  "status": "sick",
  "salary": 65000,
  "notes": "Больничный, перелом руки. Ожидается выход в июне."
}'

# Employee 12 — Грузчик
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Фёдоров Евгений Анатольевич",
  "position": "loader",
  "phone": "+7(911)223-44-55",
  "email": null,
  "birthDate": "1994-10-09",
  "hireDate": "2023-03-20",
  "licenseNum": null,
  "licenseCat": null,
  "licenseExpiry": null,
  "passportSeries": "4017",
  "passportNum": "223344",
  "address": "г. Великий Новгород, ул. Щусева, д. 3, кв. 40",
  "status": "active",
  "salary": 45000,
  "notes": "Работа на складе и погрузке."
}'

# Employee 13 — Помощник
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Николаев Тимур Равильевич",
  "position": "assistant",
  "phone": "+7(921)334-55-66",
  "email": "nikolaev@transauto.ru",
  "birthDate": "1997-07-22",
  "hireDate": "2024-06-01",
  "licenseNum": "99 25 445566",
  "licenseCat": "B",
  "licenseExpiry": "2029-07-22",
  "passportSeries": "4018",
  "passportNum": "334455",
  "address": "г. Великий Новгород, ул. Космонавтов, д. 17, кв. 9",
  "status": "active",
  "salary": 48000,
  "notes": "Студент-заочник, совмещает работу с учёбой."
}'

# Employee 14 — Другая должность (диспетчер)
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Орлова Елена Сергеевна",
  "position": "other",
  "phone": "+7(911)445-66-77",
  "email": "orlova@transauto.ru",
  "birthDate": "1990-03-15",
  "hireDate": "2021-09-01",
  "licenseNum": null,
  "licenseCat": null,
  "licenseExpiry": null,
  "passportSeries": "4011",
  "passportNum": "445566",
  "address": "г. Великий Новгород, ул. Державинская, д. 6, кв. 28",
  "status": "active",
  "salary": 55000,
  "notes": "Диспетчер. Координация рейсов и связь с водителями."
}'

# Employee 15 — Водитель в отпуске
curl -s -X POST "$BASE/employees" -H "Content-Type: application/json" -d '{
  "fullName": "Григорьев Руслан Хасанович",
  "position": "driver",
  "phone": "+7(921)556-77-88",
  "email": "grigoriev@mail.ru",
  "birthDate": "1984-09-02",
  "hireDate": "2018-12-01",
  "licenseNum": "99 16 667788",
  "licenseCat": "CE",
  "licenseExpiry": "2026-09-02",
  "passportSeries": "4006",
  "passportNum": "556677",
  "address": "г. Великий Новгород, ул. Хутынская, д. 44, кв. 16",
  "status": "vacation",
  "salary": 88000,
  "notes": "Отпуск за свой счёт до 01.07.2026. Водитель категории CE."
}'

echo ""
echo "=== EMPLOYEES ADDED ==="

# ═══════════════════════════════════════════════════
# 2. UPDATE EQUIPMENT WITH DEMO DATA
# ═══════════════════════════════════════════════════

# ЭКО MAN — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp5jdwcn02z6mopjkxhi516e" -H "Content-Type: application/json" -d '{
  "model": "TGX 18.500",
  "year": 2019,
  "vin": "WMA6TGX19KN123456",
  "stsNumber": "78 АА 567890",
  "ptsNumber": "78 УЕ 123456",
  "category": "CE",
  "color": "Белый",
  "engineType": "Дизель",
  "engineVolume": "12.4",
  "enginePower": "500",
  "fuelType": "Дизель",
  "loadCapacity": "25 т",
  "mileage": 625299,
  "purchaseDate": "2019-03-15",
  "purchasePrice": 12000000,
  "currentPrice": 8500000,
  "insuranceNumber": "ААА 0123456789",
  "insuranceExpiry": "2026-09-15",
  "inspectionDate": "2025-06-20",
  "inspectionExpiry": "2026-06-20",
  "notes": "Магистральный тягач. Регулярные рейсы М10."
}'

# Экскаватор SANY — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp5ilu0802aumopjd2n0zf7z" -H "Content-Type: application/json" -d '{
  "model": "SY335C",
  "year": 2022,
  "vin": "SANY335C2022EX789",
  "stsNumber": "53 БВ 345678",
  "ptsNumber": "53 ВГ 234567",
  "category": "Нет",
  "color": "Жёлтый",
  "engineType": "Дизель",
  "engineVolume": "5.9",
  "enginePower": "254",
  "fuelType": "Дизель",
  "loadCapacity": "3.5 т (ковш)",
  "mileage": 5600,
  "purchaseDate": "2022-05-10",
  "purchasePrice": 18000000,
  "currentPrice": 15000000,
  "insuranceNumber": "ВВВ 9876543210",
  "insuranceExpiry": "2026-05-10",
  "inspectionDate": "2025-08-01",
  "inspectionExpiry": "2026-08-01",
  "notes": "Гусеничный экскаватор. Объект Мясково."
}'

# JCB 3CX — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp4akrtb000gq7m1z3gbk5ql" -H "Content-Type: application/json" -d '{
  "stsNumber": "50 ГД 456789",
  "ptsNumber": "50 ЕЖ 345678",
  "engineVolume": "3.0",
  "insuranceNumber": "ГГГ 5678901234",
  "insuranceExpiry": "2026-12-01",
  "inspectionDate": "2025-11-15",
  "inspectionExpiry": "2026-11-15",
  "notes": "Строительная техника. Задняя погрузка."
}'

# НСАХ Sitrak — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp4akrsm000cq7m1etpdmzi2" -H "Content-Type: application/json" -d '{
  "model": "C7H 440",
  "stsNumber": "53 ЗИ 789012",
  "ptsNumber": "53 КЛ 567890",
  "engineVolume": "11.6",
  "loadCapacity": "30 т",
  "mileage": 15000,
  "notes": "Магистральный тягач. В аренде у ООО ТрансАвто."
}'

# КАМАЗ-6520 — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp4akrrt0008q7m1e52tqa0o" -H "Content-Type: application/json" -d '{
  "stsNumber": "78 МН 012345",
  "ptsNumber": "78 ОП 890123",
  "engineVolume": "11.8",
  "insuranceNumber": "ДДД 3456789012",
  "insuranceExpiry": "2026-08-20",
  "inspectionDate": "2025-04-10",
  "inspectionExpiry": "2026-04-10",
  "notes": "Самосвал, ремонт гидравлики кузова. Запчасти заказаны."
}'

# ГАЗель NEXT — fill missing fields
curl -s -X PUT "$BASE/equipment/cmp4akrr10004q7m1cgtqm5wc" -H "Content-Type: application/json" -d '{
  "brand": "ГАЗ",
  "model": "NEXT Citiline",
  "year": 2022,
  "vin": "X9633040C2N123456",
  "stsNumber": "53 РС 234567",
  "ptsNumber": "53 ТУ 678901",
  "category": "C",
  "color": "Белый",
  "engineType": "Дизель",
  "engineVolume": "2.8",
  "enginePower": "150",
  "fuelType": "Дизель",
  "loadCapacity": "1.5 т",
  "passengerSeats": 3,
  "mileage": 87500,
  "purchaseDate": "2022-04-01",
  "purchasePrice": 3200000,
  "currentPrice": 2400000,
  "insuranceNumber": "ЕЕЕ 7890123456",
  "insuranceExpiry": "2026-04-01",
  "inspectionDate": "2025-09-20",
  "inspectionExpiry": "2026-09-20",
  "notes": "Ремонтная бригада. Арендатор — ООО ТрансАвто."
}'

echo ""
echo "=== EQUIPMENT UPDATED ==="
