#!/bin/bash
BASE="http://127.0.0.1:3000/api"

# ЭКО MAN — complete all fields (keeping brand, regNum from existing)
curl -s -X PUT "$BASE/equipment/cmp5jdwcn02z6mopjkxhi516e" -H "Content-Type: application/json" -d '{
  "brand": "MAN",
  "registrationNum": "Е057ХК53",
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

# Экскаватор SANY — complete all fields
curl -s -X PUT "$BASE/equipment/cmp5ilu0802aumopjd2n0zf7z" -H "Content-Type: application/json" -d '{
  "brand": "SANY",
  "registrationNum": "3383НВ",
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

# JCB 3CX — fill all missing
curl -s -X PUT "$BASE/equipment/cmp4akrtb000gq7m1z3gbk5ql" -H "Content-Type: application/json" -d '{
  "brand": "JCB",
  "model": "3CX",
  "year": 2021,
  "vin": "JCB3CX2021ECO123",
  "registrationNum": "О567СО50",
  "stsNumber": "50 ГД 456789",
  "ptsNumber": "50 ЕЖ 345678",
  "category": "B",
  "color": "Жёлтый",
  "engineType": "Дизель",
  "engineVolume": "3.0",
  "enginePower": "92",
  "fuelType": "Дизель",
  "loadCapacity": "1.0 т",
  "mileage": 5600,
  "purchaseDate": "2021-09-01",
  "purchasePrice": 7500000,
  "currentPrice": 6000000,
  "insuranceNumber": "ГГГ 5678901234",
  "insuranceExpiry": "2026-12-01",
  "inspectionDate": "2025-11-15",
  "inspectionExpiry": "2026-11-15",
  "notes": "Строительная техника. Задняя погрузка."
}'

# НСАХ Sitrak — fill all missing
curl -s -X PUT "$BASE/equipment/cmp4akrsm000cq7m1etpdmzi2" -H "Content-Type: application/json" -d '{
  "brand": "Sitrak",
  "registrationNum": "К033НА53",
  "model": "C7H 440",
  "year": 2023,
  "vin": "4T1G11AK5PU123456",
  "stsNumber": "53 ЗИ 789012",
  "ptsNumber": "53 КЛ 567890",
  "category": "CE",
  "color": "Чёрный",
  "engineType": "Дизель",
  "engineVolume": "11.6",
  "enginePower": "440",
  "fuelType": "Дизель",
  "loadCapacity": "30 т",
  "mileage": 15000,
  "purchaseDate": "2023-01-10",
  "purchasePrice": 13500000,
  "currentPrice": 11000000,
  "insuranceNumber": "ССС 9876543210",
  "insuranceExpiry": "2026-01-10",
  "inspectionDate": "2025-12-01",
  "inspectionExpiry": "2026-12-01",
  "notes": "Магистральный тягач. В аренде у ООО ТрансАвто."
}'

# КАМАЗ-6520 — fill all missing
curl -s -X PUT "$BASE/equipment/cmp4akrrt0008q7m1e52tqa0o" -H "Content-Type: application/json" -d '{
  "brand": "КАМАЗ",
  "model": "6520",
  "year": 2020,
  "vin": "XTC6520A0L2123456",
  "registrationNum": "В888ОР78",
  "stsNumber": "78 МН 012345",
  "ptsNumber": "78 ОП 890123",
  "category": "CE",
  "color": "Оранжевый",
  "engineType": "Дизель",
  "engineVolume": "11.8",
  "enginePower": "400",
  "fuelType": "Дизель",
  "loadCapacity": "20 т",
  "mileage": 120000,
  "purchaseDate": "2020-06-20",
  "purchasePrice": 8500000,
  "currentPrice": 6800000,
  "insuranceNumber": "ДДД 3456789012",
  "insuranceExpiry": "2026-08-20",
  "inspectionDate": "2025-04-10",
  "inspectionExpiry": "2026-04-10",
  "notes": "Самосвал, ремонт гидравлики кузова. Запчасти заказаны."
}'

# ГАЗель NEXT — fill all fields
curl -s -X PUT "$BASE/equipment/cmp4akrr10004q7m1cgtqm5wc" -H "Content-Type: application/json" -d '{
  "brand": "ГАЗ",
  "registrationNum": "Е193ВВ53",
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
echo "=== EQUIPMENT RE-FILLED ==="
