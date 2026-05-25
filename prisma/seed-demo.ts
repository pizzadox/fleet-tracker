import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7', '#d946ef',
]

function pickColor(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function hoursAgo(n: number): Date {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d
}

async function seed() {
  console.log('🌱 Seeding demo data...')
  console.log('⏳ Clearing existing data...')

  // Delete in dependency order
  await db.userSession.deleteMany()
  await db.repairComment.deleteMany()
  await db.repairEmployee.deleteMany()
  await db.repairStage.deleteMany()
  await db.repairPhoto.deleteMany()
  await db.notificationRule.deleteMany()
  await db.glonassSensorData.deleteMany()
  await db.routePoint.deleteMany()
  await db.crewMember.deleteMany()
  await db.routeTemplatePoint.deleteMany()
  await db.trip.deleteMany()
  await db.routeTemplate.deleteMany()
  await db.glonassTracker.deleteMany()
  await db.repair.deleteMany()
  await db.equipmentPhoto.deleteMany()
  await db.equipmentDocument.deleteMany()
  await db.equipmentHistory.deleteMany()
  await db.employee.deleteMany()
  await db.equipment.deleteMany()
  await db.crew.deleteMany()
  await db.company.deleteMany()
  await db.appUser.deleteMany()
  await db.rolePermission.deleteMany()
  await db.axentaSettings.deleteMany()
  console.log('✅ Existing data cleared.')

  // ════════════════════════════════════════════════════════════════
  // 1. ПОЛЬЗОВАТЕЛИ
  // ════════════════════════════════════════════════════════════════
  console.log('👥 Creating users...')

  const users = await Promise.all([
    db.appUser.create({ data: { name: 'Администратор',  pin: hashPin('1234'), role: 'admin',          isActive: true, avatar: '#6366f1' } }),
    db.appUser.create({ data: { name: 'Иванов Иван',    pin: hashPin('2345'), role: 'manager',        isActive: true, avatar: '#8b5cf6' } }),
    db.appUser.create({ data: { name: 'Петров Алексей', pin: hashPin('3456'), role: 'trip_master',    isActive: true, avatar: '#22c55e' } }),
    db.appUser.create({ data: { name: 'Сидоров Сергей', pin: hashPin('4567'), role: 'repair_worker',  isActive: true, avatar: '#f97316' } }),
    db.appUser.create({ data: { name: 'Козлов Дмитрий', pin: hashPin('5678'), role: 'worker',         isActive: true, avatar: '#06b6d4' } }),
    db.appUser.create({ data: { name: 'Новикова Елена', pin: hashPin('6789'), role: 'manager',        isActive: true, avatar: '#ec4899' } }),
    db.appUser.create({ data: { name: 'Морозов Андрей', pin: hashPin('7890'), role: 'repair_worker',  isActive: false, avatar: '#ef4444' } }),
  ])
  console.log(`✅ Created ${users.length} users`)

  // ════════════════════════════════════════════════════════════════
  // 2. РОЛИ И ПРАВА
  // ════════════════════════════════════════════════════════════════
  console.log('🔐 Creating role permissions...')

  const rolePerms: Record<string, string[]> = {
    admin:          ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map', 'settings', 'users'],
    manager:        ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map'],
    trip_master:    ['trips', 'crews', 'map', 'equipment_read'],
    repair_worker:  ['repairs', 'equipment_read'],
    worker:         ['equipment_read', 'map'],
  }

  const permData: { role: string; permission: string }[] = []
  for (const [role, perms] of Object.entries(rolePerms)) {
    for (const permission of perms) {
      permData.push({ role, permission })
    }
  }
  await db.rolePermission.createMany({ data: permData })
  console.log(`✅ Created ${permData.length} role permissions`)

  // ════════════════════════════════════════════════════════════════
  // 3. КОМПАНИИ
  // ════════════════════════════════════════════════════════════════
  console.log('🏢 Creating companies...')

  const companies = await Promise.all([
    db.company.create({
      data: {
        name: 'ООО «СтройМаш»',
        inn: '7712345678',
        kpp: '771201001',
        ogrn: '1177746034512',
        address: 'г. Москва, ул. Строителей, д. 15, оф. 301',
        factAddress: 'г. Москва, ул. Строителей, д. 15, оф. 301',
        phone: '+7 (495) 123-45-67',
        email: 'info@stroymash.ru',
        director: 'Иванов Иван Петрович',
        type: 'owner',
      },
    }),
    db.company.create({
      data: {
        name: 'ООО «ТрансЛогистик»',
        inn: '5029876543',
        kpp: '502901001',
        ogrn: '1195027052341',
        address: 'Московская обл., г. Химки, ул. Логистическая, д. 8',
        factAddress: 'Московская обл., г. Химки, ул. Логистическая, д. 8',
        phone: '+7 (498) 765-43-21',
        email: 'office@translogistic.ru',
        director: 'Смирнов Олег Николаевич',
        type: 'renter',
      },
    }),
    db.company.create({
      data: {
        name: 'ЗАО «АгроТех»',
        inn: '3664112233',
        kpp: '366401001',
        ogrn: '1123644001234',
        address: 'Воронежская обл., г. Воронеж, ул. Аграрная, д. 42',
        factAddress: 'Воронежская обл., Рамонский р-н, с. Чертовицкое',
        phone: '+7 (473) 222-33-44',
        email: 'agro@agrotech.ru',
        director: 'Кузнецова Марина Васильевна',
        type: 'both',
      },
    }),
  ])
  console.log(`✅ Created ${companies.length} companies`)

  // ════════════════════════════════════════════════════════════════
  // 4. ТЕХНИКА
  // ════════════════════════════════════════════════════════════════
  console.log('🚛 Creating equipment...')

  const equipmentData = [
    // Грузовые автомобили
    {
      name: 'КАМАЗ-6520', type: 'автомобиль', brand: 'КАМАЗ', model: '6520', year: 2021,
      vin: 'XTC652000J1234567', registrationNum: 'А 123 МК 77', category: 'C',
      engineType: 'дизельный', enginePower: '400', fuelType: 'ДТ', loadCapacity: '20 т',
      mileage: 87500, fuelConsumptionNorm: 32.5, status: 'active', condition: 'good',
      garageNumber: 'Г-001', ownerId: companies[0].id,
      insuranceNumber: 'ОСАГО-7720241234', insuranceExpiry: new Date('2025-12-01'),
      inspectionExpiry: new Date('2025-09-15'), location: 'База СтройМаш, Москва',
      depot: 'Гараж №1', lastMaintenanceDate: daysAgo(45), nextMaintenanceDate: daysAgo(-45),
      maintenanceInterval: 15000, tireSize: '315/80 R22.5',
      oilChangeDate: daysAgo(30), oilChangeMileage: 85000, oilChangeInterval: 10000,
    },
    {
      name: 'КАМАЗ-5490', type: 'автомобиль', brand: 'КАМАЗ', model: '5490', year: 2022,
      vin: 'XTC549000K2345678', registrationNum: 'В 456 МК 77', category: 'CE',
      engineType: 'дизельный', enginePower: '428', fuelType: 'ДТ', loadCapacity: '25 т',
      mileage: 54200, fuelConsumptionNorm: 28.0, status: 'active', condition: 'excellent',
      garageNumber: 'Г-002', ownerId: companies[0].id,
      insuranceNumber: 'ОСАГО-7720245678', insuranceExpiry: new Date('2025-11-15'),
      inspectionExpiry: new Date('2025-08-20'), location: 'База СтройМаш, Москва',
      depot: 'Гараж №1', lastMaintenanceDate: daysAgo(20), nextMaintenanceDate: daysAgo(-60),
      maintenanceInterval: 20000, tireSize: '315/70 R22.5',
      oilChangeDate: daysAgo(15), oilChangeMileage: 55000, oilChangeInterval: 15000,
    },
    {
      name: 'ГАЗель NEXT', type: 'автомобиль', brand: 'ГАЗ', model: 'NEXT', year: 2023,
      vin: 'X9FNE2GA0P0001234', registrationNum: 'Е 789 МК 77', category: 'B',
      engineType: 'бензиновый', enginePower: '106', fuelType: 'АИ-92', loadCapacity: '1.5 т',
      mileage: 32100, fuelConsumptionNorm: 14.5, status: 'active', condition: 'excellent',
      garageNumber: 'Г-003', ownerId: companies[0].id, renterId: companies[1].id,
      rentalStartDate: daysAgo(90), rentalEndDate: daysAgo(-275), rentalCost: 45000,
      insuranceNumber: 'ОСАГО-7720249012', insuranceExpiry: new Date('2026-03-10'),
      inspectionExpiry: new Date('2026-01-20'), location: 'База ТрансЛогистик, Химки',
      depot: 'Гараж арендатора',
    },
    {
      name: 'МАЗ-6312', type: 'автомобиль', brand: 'МАЗ', model: '6312', year: 2020,
      vin: 'Y3M631200L3456789', registrationNum: 'К 012 МК 77', category: 'C',
      engineType: 'дизельный', enginePower: '330', fuelType: 'ДТ', loadCapacity: '15 т',
      mileage: 134000, fuelConsumptionNorm: 30.0, status: 'repair', condition: 'fair',
      garageNumber: 'Г-004', ownerId: companies[0].id,
      insuranceNumber: 'ОСАГО-7720243456', insuranceExpiry: new Date('2025-07-01'),
      notes: 'Требуется замена КПП',
    },
    // Спецтехника
    {
      name: 'Экскаватор JCB 3CX', type: 'спецтехника', brand: 'JCB', model: '3CX', year: 2019,
      serialNumber: 'JCB3CX2019A5678', registrationNum: 'НЕТ', engineType: 'дизельный',
      enginePower: '92', fuelType: 'ДТ', mileage: 6800, fuelConsumptionNorm: 12.0,
      status: 'active', condition: 'good', garageNumber: 'С-001',
      ownerId: companies[0].id, location: 'Объект СтройМаш, МКАД',
      lastMaintenanceDate: daysAgo(60), nextMaintenanceDate: daysAgo(-30),
    },
    {
      name: 'Бульдозер Komatsu D65', type: 'спецтехника', brand: 'Komatsu', model: 'D65EX-16', year: 2021,
      serialNumber: 'KMTD652021B7890', registrationNum: 'НЕТ', engineType: 'дизельный',
      enginePower: '168', fuelType: 'ДТ', mileage: 4200, fuelConsumptionNorm: 18.5,
      status: 'active', condition: 'good', garageNumber: 'С-002',
      ownerId: companies[0].id, location: 'Объект СтройМаш, МКАД',
    },
    {
      name: 'Автокран Liebherr LTM', type: 'спецтехника', brand: 'Liebherr', model: 'LTM 1055-3.2', year: 2022,
      serialNumber: 'LBR10552022C1234', registrationNum: 'М 345 МК 77', engineType: 'дизельный',
      enginePower: '240', fuelType: 'ДТ', loadCapacity: '55 т', mileage: 2900,
      fuelConsumptionNorm: 22.0, status: 'reserved', condition: 'excellent',
      garageNumber: 'С-003', ownerId: companies[0].id, location: 'База СтройМаш, Москва',
      notes: 'Зарезервирован под объект на Ленинградском шоссе',
    },
    // Прицепы
    {
      name: 'Прицеп-рефрижератор', type: 'прицеп', brand: 'Schmitz', model: 'Cargobull', year: 2020,
      vin: 'W1SSCNEEX0A567890', registrationNum: 'Р 678 МК 77', category: 'O3',
      loadCapacity: '30 т', mileage: 95000, status: 'active', condition: 'good',
      garageNumber: 'П-001', ownerId: companies[0].id, renterId: companies[1].id,
      rentalStartDate: daysAgo(60), rentalEndDate: daysAgo(-305), rentalCost: 65000,
      lastMaintenanceDate: daysAgo(30), nextMaintenanceDate: daysAgo(-90),
    },
    {
      name: 'Прицеп-самосвал', type: 'прицеп', brand: 'ТЗА', model: 'ПС-30', year: 2018,
      vin: 'X7ATZA30J98765432', registrationNum: 'Т 901 МК 77', category: 'O3',
      loadCapacity: '30 т', mileage: 148000, status: 'decommissioned', condition: 'poor',
      garageNumber: 'П-002', ownerId: companies[0].id,
      decommissionDate: daysAgo(10), decommissionReason: 'Износ рамы, экономически нецелесообразно восстанавливать',
    },
    // Сельхозтехника
    {
      name: 'Трактор John Deere 8R', type: 'спецтехника', brand: 'John Deere', model: '8R 370', year: 2023,
      serialNumber: 'JD8R3702023D5678', registrationNum: 'НЕТ', engineType: 'дизельный',
      enginePower: '370', fuelType: 'ДТ', mileage: 1200, fuelConsumptionNorm: 25.0,
      status: 'active', condition: 'excellent', garageNumber: 'А-001',
      ownerId: companies[2].id, location: 'Поле №3, Чертовицкое',
      lastMaintenanceDate: daysAgo(90), nextMaintenanceDate: daysAgo(-90),
    },
    {
      name: 'Комбайн Rostselmash Acros', type: 'спецтехника', brand: 'Rostselmash', model: 'Acros 595', year: 2022,
      serialNumber: 'RSM5952022E7890', registrationNum: 'НЕТ', engineType: 'дизельный',
      enginePower: '325', fuelType: 'ДТ', mileage: 680, fuelConsumptionNorm: 35.0,
      status: 'active', condition: 'good', garageNumber: 'А-002',
      ownerId: companies[2].id, location: 'Поле №1, Чертовицкое',
    },
    // Лёгкий транспорт
    {
      name: 'УАЗ Патриот', type: 'автомобиль', brand: 'УАЗ', model: 'Патриот', year: 2022,
      vin: 'XTY312600F2345678', registrationNum: 'С 234 МК 77', category: 'B',
      engineType: 'бензиновый', enginePower: '150', fuelType: 'АИ-92', passengerSeats: 5,
      mileage: 41300, fuelConsumptionNorm: 13.5, status: 'active', condition: 'good',
      garageNumber: 'Л-001', ownerId: companies[0].id, location: 'База СтройМаш, Москва',
    },
  ]

  const equipment: Awaited<ReturnType<typeof db.equipment.create>>[] = []
  for (const data of equipmentData) {
    const eq = await db.equipment.create({ data })
    equipment.push(eq)
  }
  console.log(`✅ Created ${equipment.length} equipment items`)

  // ════════════════════════════════════════════════════════════════
  // 5. СОТРУДНИКИ
  // ════════════════════════════════════════════════════════════════
  console.log('👷 Creating employees...')

  const employeesData = [
    {
      fullName: 'Петров Владимир Иванович', position: 'driver', phone: '+7 (916) 111-22-33',
      licenseNum: '77 14 567890', licenseCat: 'CE', licenseExpiry: new Date('2027-05-15'),
      hireDate: daysAgo(730), status: 'active', salary: 85000,
      equipmentId: equipment[0].id, // КАМАЗ-6520
    },
    {
      fullName: 'Семёнов Олег Петрович', position: 'driver', phone: '+7 (926) 222-33-44',
      licenseNum: '50 16 123456', licenseCat: 'CE', licenseExpiry: new Date('2026-11-20'),
      hireDate: daysAgo(365), status: 'active', salary: 80000,
      equipmentId: equipment[1].id, // КАМАЗ-5490
    },
    {
      fullName: 'Кузнецов Андрей Сергеевич', position: 'driver', phone: '+7 (903) 333-44-55',
      licenseNum: '77 12 987654', licenseCat: 'B', licenseExpiry: new Date('2028-03-10'),
      hireDate: daysAgo(180), status: 'active', salary: 65000,
      equipmentId: equipment[2].id, // ГАЗель NEXT
    },
    {
      fullName: 'Фёдоров Николай Дмитриевич', position: 'driver', phone: '+7 (977) 444-55-66',
      licenseNum: '77 18 456123', licenseCat: 'C', licenseExpiry: new Date('2026-08-01'),
      hireDate: daysAgo(500), status: 'active', salary: 78000,
      equipmentId: equipment[3].id, // МАЗ-6312
    },
    {
      fullName: 'Волков Максим Юрьевич', position: 'mechanic', phone: '+7 (916) 555-66-77',
      hireDate: daysAgo(900), status: 'active', salary: 72000,
      equipmentId: equipment[4].id, // JCB 3CX
    },
    {
      fullName: 'Лебедев Игорь Андреевич', position: 'mechanic', phone: '+7 (926) 666-77-88',
      hireDate: daysAgo(450), status: 'active', salary: 68000,
    },
    {
      fullName: 'Сорокин Павел Викторович', position: 'driver', phone: '+7 (903) 777-88-99',
      licenseNum: '77 20 789012', licenseCat: 'C', licenseExpiry: new Date('2027-01-15'),
      hireDate: daysAgo(200), status: 'active', salary: 70000,
      equipmentId: equipment[7].id, // Прицеп-рефрижератор
    },
    {
      fullName: 'Зайцев Роман Олегович', position: 'loader', phone: '+7 (977) 888-99-00',
      hireDate: daysAgo(120), status: 'active', salary: 55000,
    },
    {
      fullName: 'Павлов Дмитрий Анатольевич', position: 'driver', phone: '+7 (916) 999-00-11',
      licenseNum: '36 15 321654', licenseCat: 'B', licenseExpiry: new Date('2028-07-01'),
      hireDate: daysAgo(60), status: 'active', salary: 62000,
      equipmentId: equipment[11].id, // УАЗ Патриот
    },
    {
      fullName: 'Орлов Юрий Николаевич', position: 'mechanic', phone: '+7 (926) 000-11-22',
      hireDate: daysAgo(300), status: 'vacation', salary: 70000,
      notes: 'Отпуск до 15.06.2025',
    },
    {
      fullName: 'Григорьев Анатолий Васильевич', position: 'driver', phone: '+7 (473) 123-45-67',
      licenseNum: '36 10 111222', licenseCat: 'C', licenseExpiry: new Date('2026-12-01'),
      hireDate: daysAgo(600), status: 'active', salary: 70000,
      equipmentId: equipment[9].id, // John Deere 8R
    },
    {
      fullName: 'Белова Татьяна Сергеевна', position: 'other', phone: '+7 (495) 222-33-44',
      email: 'belova@stroymash.ru', hireDate: daysAgo(800), status: 'active', salary: 60000,
      notes: 'Диспетчер',
    },
  ]

  const employees: Awaited<ReturnType<typeof db.employee.create>>[] = []
  for (const data of employeesData) {
    const emp = await db.employee.create({ data })
    employees.push(emp)
  }
  console.log(`✅ Created ${employees.length} employees`)

  // ════════════════════════════════════════════════════════════════
  // 6. ЭКИПАЖИ
  // ════════════════════════════════════════════════════════════════
  console.log('👷‍♂️ Creating crews...')

  const crews = await Promise.all([
    db.crew.create({
      data: {
        name: 'Экипаж №1 — Грузоперевозки',
        description: 'Основной экипаж для дальних рейсов',
        type: 'driver', status: 'active',
        members: {
          create: [
            { employeeId: employees[0].id, fullName: employees[0].fullName, role: 'driver', phone: employees[0].phone, licenseNum: employees[0].licenseNum, licenseCat: employees[0].licenseCat },
            { fullName: 'Попов Алексей Иванович', role: 'assistant', phone: '+7 (916) 321-54-76' },
          ],
        },
      },
    }),
    db.crew.create({
      data: {
        name: 'Экипаж №2 — Стройка',
        description: 'Экипаж спецтехники на объекте',
        type: 'mixed', status: 'active',
        members: {
          create: [
            { employeeId: employees[4].id, fullName: employees[4].fullName, role: 'mechanic', phone: employees[4].phone },
            { employeeId: employees[5].id, fullName: employees[5].fullName, role: 'driver', phone: employees[5].phone },
          ],
        },
      },
    }),
    db.crew.create({
      data: {
        name: 'Экипаж №3 — Рефрижератор',
        description: 'Перевозка скоропортящихся грузов',
        type: 'driver', status: 'active',
        members: {
          create: [
            { employeeId: employees[6].id, fullName: employees[6].fullName, role: 'driver', phone: employees[6].phone, licenseNum: employees[6].licenseNum, licenseCat: employees[6].licenseCat },
            { employeeId: employees[7].id, fullName: employees[7].fullName, role: 'loader', phone: employees[7].phone },
          ],
        },
      },
    }),
    db.crew.create({
      data: {
        name: 'Экипаж №4 — Сельхоз',
        description: 'Экипаж для полевых работ',
        type: 'mixed', status: 'active',
        members: {
          create: [
            { employeeId: employees[10].id, fullName: employees[10].fullName, role: 'driver', phone: employees[10].phone, licenseNum: employees[10].licenseNum, licenseCat: employees[10].licenseCat },
          ],
        },
      },
    }),
  ])
  console.log(`✅ Created ${crews.length} crews`)

  // ════════════════════════════════════════════════════════════════
  // 7. РЕМОНТЫ
  // ════════════════════════════════════════════════════════════════
  console.log('🔧 Creating repairs...')

  const repairs = await Promise.all([
    // Текущий ремонт — МАЗ
    db.repair.create({
      data: {
        equipmentId: equipment[3].id, // МАЗ-6312
        description: 'Замена коробки передач',
        reason: 'Шум в КПП, затруднённое переключение передач',
        startDate: daysAgo(5),
        status: 'in_progress', priority: 'high', repairType: 'emergency',
        estimatedEndDate: daysAgo(-5), estimatedCost: 180000,
        contractor: 'ООО «ТрансРемонт»', contractorPhone: '+7 (495) 444-55-66',
        location: 'СТО ТрансРемонт, Москва, ул. Автозаводская, д. 23',
        mileageStart: 134000, downtimeHours: 120,
        stages: {
          create: [
            { name: 'Диагностика КПП', status: 'completed', startDate: daysAgo(5), endDate: daysAgo(4), cost: 5000, sortOrder: 0 },
            { name: 'Заказ запчастей', status: 'completed', startDate: daysAgo(4), endDate: daysAgo(1), cost: 95000, sortOrder: 1 },
            { name: 'Демонтаж старой КПП', status: 'in_progress', startDate: daysAgo(1), sortOrder: 2 },
            { name: 'Установка новой КПП', status: 'pending', sortOrder: 3, estimatedDuration: 8 },
            { name: 'Тест-драйв', status: 'pending', sortOrder: 4, estimatedDuration: 2 },
          ],
        },
        masters: {
          create: [
            { employeeId: employees[5].id, role: 'master' },
          ],
        },
        comments: {
          create: [
            { text: 'Запчасти приехали вчера, можно приступать к замене', author: 'Лебедев И.А.' },
          ],
        },
      },
    }),
    // Завершённый ремонт — JCB
    db.repair.create({
      data: {
        equipmentId: equipment[4].id, // JCB 3CX
        description: 'Замена гидравлических шлангов',
        reason: 'Утечка масла из гидросистемы',
        startDate: daysAgo(30), endDate: daysAgo(25),
        status: 'completed', priority: 'medium', repairType: 'planned',
        cost: 45000, contractor: 'ГидроСервис',
        workPerformed: 'Заменены 4 гидравлических шланга, долита гидравлическая жидкость',
        spareParts: 'Шланг РВД-12 (4 шт.), жидкость гидравлическая 20л',
        mileageStart: 6780, mileageEnd: 6800, downtimeHours: 48,
        stages: {
          create: [
            { name: 'Демонтаж старых шлангов', status: 'completed', startDate: daysAgo(30), endDate: daysAgo(29), sortOrder: 0 },
            { name: 'Установка новых шлангов', status: 'completed', startDate: daysAgo(29), endDate: daysAgo(26), sortOrder: 1 },
            { name: 'Прокачка гидросистемы', status: 'completed', startDate: daysAgo(26), endDate: daysAgo(25), cost: 8000, sortOrder: 2 },
          ],
        },
      },
    }),
    // Завершённый ремонт — ГАЗель
    db.repair.create({
      data: {
        equipmentId: equipment[2].id, // ГАЗель NEXT
        description: 'Замена тормозных колодок',
        reason: 'Плановое ТО',
        startDate: daysAgo(15), endDate: daysAgo(14),
        status: 'completed', priority: 'low', repairType: 'preventive',
        cost: 8500, workPerformed: 'Заменены передние и задние тормозные колодки',
        spareParts: 'Колодки тормозные (комплект)',
        downtimeHours: 6, warrantyRepair: false,
      },
    }),
    // Приостановленный ремонт — Прицеп-рефрижератор
    db.repair.create({
      data: {
        equipmentId: equipment[7].id, // Прицеп-рефрижератор
        description: 'Ремонт холодильной установки',
        reason: 'Не держит температуру, компрессор гудит',
        startDate: daysAgo(10),
        status: 'paused', priority: 'high', repairType: 'emergency',
        estimatedCost: 120000,
        contractor: 'ColdService',
        notes: 'Ожидаем запчасть — компрессор Carrier, поставка 2-3 недели',
        downtimeHours: 240,
      },
    }),
  ])
  console.log(`✅ Created ${repairs.length} repairs`)

  // ════════════════════════════════════════════════════════════════
  // 8. ШАБЛОНЫ МАРШРУТОВ
  // ════════════════════════════════════════════════════════════════
  console.log('🗺️ Creating route templates...')

  const routeTemplates = await Promise.all([
    db.routeTemplate.create({
      data: {
        name: 'Москва — Тула — Москва',
        description: 'Кольцевой маршрут доставки стройматериалов',
        startPoint: 'Москва, база СтройМаш', endPoint: 'Тула, склад ДСК',
        totalDistance: 360, estimatedDuration: 420,
        points: {
          create: [
            { name: 'База СтройМаш', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 0, plannedDeparture: '06:00' },
            { name: 'МКАД (южный)', address: 'МКАД, 30 км', latitude: 55.6411, longitude: 37.6195, sortOrder: 1, distanceFromPrev: 15, plannedArrival: '06:30' },
            { name: 'Склад Тула', address: 'г. Тула, ул. Промышленная, 10', latitude: 54.1961, longitude: 37.6182, sortOrder: 2, distanceFromPrev: 165, plannedArrival: '09:30', plannedDeparture: '11:00' },
            { name: 'База СтройМаш (возврат)', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 3, distanceFromPrev: 180, plannedArrival: '14:00' },
          ],
        },
      },
    }),
    db.routeTemplate.create({
      data: {
        name: 'Москва — Воронеж',
        description: 'Длинный маршрут для перевозки оборудования',
        startPoint: 'Москва, база СтройМаш', endPoint: 'Воронеж, АгроТех',
        totalDistance: 530, estimatedDuration: 480,
        points: {
          create: [
            { name: 'База СтройМаш', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 0, plannedDeparture: '05:00' },
            { name: 'Кафе «Дорожное» (М4)', address: 'М4, 200 км', latitude: 54.9000, longitude: 38.1000, sortOrder: 1, distanceFromPrev: 200, plannedArrival: '08:30', plannedDeparture: '09:00' },
            { name: 'АгроТех', address: 'Воронежская обл., с. Чертовицкое', latitude: 51.6720, longitude: 39.1843, sortOrder: 2, distanceFromPrev: 330, plannedArrival: '14:00' },
          ],
        },
      },
    }),
    db.routeTemplate.create({
      data: {
        name: 'Химки — Подольск',
        description: 'Маршрут арендованной техники между складами',
        startPoint: 'Химки, база ТрансЛогистик', endPoint: 'Подольск, склад',
        totalDistance: 75, estimatedDuration: 120,
        points: {
          create: [
            { name: 'База ТрансЛогистик', address: 'г. Химки, ул. Логистическая, 8', latitude: 55.8941, longitude: 37.4402, sortOrder: 0, plannedDeparture: '08:00' },
            { name: 'Склад Подольск', address: 'г. Подольск, ул. Заводская, 5', latitude: 55.4321, longitude: 37.5522, sortOrder: 1, distanceFromPrev: 75, plannedArrival: '10:00' },
          ],
        },
      },
    }),
  ])
  console.log(`✅ Created ${routeTemplates.length} route templates`)

  // ════════════════════════════════════════════════════════════════
  // 9. РЕЙСЫ
  // ════════════════════════════════════════════════════════════════
  console.log('🚚 Creating trips...')

  const trips = await Promise.all([
    // Завершённый рейс
    db.trip.create({
      data: {
        equipmentId: equipment[0].id, // КАМАЗ-6520
        crewId: crews[0].id,
        route: 'Москва — Тула — Москва',
        startPoint: 'Москва, база СтройМаш', endPoint: 'Тула, склад ДСК',
        cargo: 'Цемент М500, 20 тонн', cargoWeight: 20, distance: 360,
        startDate: daysAgo(7), endDate: daysAgo(7),
        status: 'completed', fuelStart: 180, fuelEnd: 65,
        mileageStart: 87400, mileageEnd: 87760,
        cost: 15000, revenue: 45000,
        avgSpeed: 52, maxSpeed: 78, fuelConsumed: 115, tripDuration: 28800,
        avgFuelRate: 31.9, idleTime: 1800, parkingsDuration: 5400,
        routeTemplateId: routeTemplates[0].id,
        routePoints: {
          create: [
            { name: 'База СтройМаш', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 0, actualArrival: daysAgo(7), plannedDeparture: daysAgo(7).toISOString() },
            { name: 'Склад Тула', address: 'г. Тула, ул. Промышленная, 10', latitude: 54.1961, longitude: 37.6182, sortOrder: 1, distanceFromPrev: 180, actualArrival: new Date(daysAgo(7).getTime() + 3 * 3600000) },
            { name: 'База СтройМаш (возврат)', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 2, distanceFromPrev: 180, actualArrival: new Date(daysAgo(7).getTime() + 8 * 3600000) },
          ],
        },
      },
    }),
    // Текущий рейс (в процессе)
    db.trip.create({
      data: {
        equipmentId: equipment[1].id, // КАМАЗ-5490
        crewId: crews[0].id,
        route: 'Москва — Воронеж',
        startPoint: 'Москва, база СтройМаш', endPoint: 'Воронеж, АгроТех',
        cargo: 'Запчасти для сельхозтехники', cargoWeight: 12, distance: 530,
        startDate: daysAgo(1), plannedEndDate: daysAgo(-1),
        status: 'in_progress', fuelStart: 250, mileageStart: 54100,
        cost: 22000, revenue: 65000,
        routeTemplateId: routeTemplates[1].id,
        routePoints: {
          create: [
            { name: 'База СтройМаш', address: 'г. Москва, ул. Строителей, 15', latitude: 55.7558, longitude: 37.6173, sortOrder: 0, actualArrival: daysAgo(1) },
            { name: 'Кафе «Дорожное» (М4)', address: 'М4, 200 км', latitude: 54.9000, longitude: 38.1000, sortOrder: 1, distanceFromPrev: 200, actualArrival: hoursAgo(8) },
            { name: 'АгроТех', address: 'Воронежская обл., с. Чертовицкое', latitude: 51.6720, longitude: 39.1843, sortOrder: 2, distanceFromPrev: 330, plannedArrival: daysAgo(-1) },
          ],
        },
      },
    }),
    // Запланированный рейс
    db.trip.create({
      data: {
        equipmentId: equipment[2].id, // ГАЗель NEXT
        crewId: crews[2].id,
        route: 'Химки — Подольск',
        startPoint: 'Химки, база ТрансЛогистик', endPoint: 'Подольск, склад',
        cargo: 'Продукты питания (охлаждённые)', cargoWeight: 1.2, distance: 75,
        startDate: daysAgo(-2), plannedEndDate: daysAgo(-2),
        status: 'planned', fuelStart: 45,
        cost: 5000, revenue: 12000,
        routeTemplateId: routeTemplates[2].id,
      },
    }),
    // Ещё один завершённый рейс
    db.trip.create({
      data: {
        equipmentId: equipment[0].id, // КАМАЗ-6520
        crewId: crews[0].id,
        route: 'Москва — Серпухов — Москва',
        startPoint: 'Москва, база СтройМаш', endPoint: 'Серпухов, стройплощадка',
        cargo: 'Арматура А500, 18 тонн', cargoWeight: 18, distance: 220,
        startDate: daysAgo(14), endDate: daysAgo(14),
        status: 'completed', fuelStart: 200, fuelEnd: 110,
        mileageStart: 87100, mileageEnd: 87320,
        cost: 10000, revenue: 35000,
        avgSpeed: 48, maxSpeed: 72, fuelConsumed: 90, tripDuration: 21600,
        avgFuelRate: 30.3, idleTime: 2400, parkingsDuration: 3600,
      },
    }),
    // Отменённый рейс
    db.trip.create({
      data: {
        equipmentId: equipment[6].id, // Автокран Liebherr
        route: 'Москва — Ленинградское шоссе',
        startPoint: 'База СтройМаш', endPoint: 'Ленинградское шоссе, 45 км',
        cargo: 'Монтаж конструкций', distance: 45,
        startDate: daysAgo(3),
        status: 'cancelled',
        notes: 'Отменён из-за отсутствия разрешения на работу крана',
      },
    }),
  ])
  console.log(`✅ Created ${trips.length} trips`)

  // ════════════════════════════════════════════════════════════════
  // 10. ГЛОНАСС ТРЕКЕРЫ
  // ════════════════════════════════════════════════════════════════
  console.log('📡 Creating GLONASS trackers...')

  const trackers = await Promise.all([
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[0].id, trackerId: 'TRK-001', trackerName: 'КАМАЗ-6520 GPS',
        imei: '353456789012345', phoneNumber: '+7 (916) 100-01-01',
        lastLatitude: 55.7558, lastLongitude: 37.6173, lastSpeed: 0,
        lastCourse: 180, lastIgnition: false, lastFuelLevel: 65, lastMileage: 87500,
        lastAddress: 'г. Москва, ул. Строителей, 15', lastSeenAt: hoursAgo(0.5),
        lastPositionAt: hoursAgo(0.5), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[1].id, trackerId: 'TRK-002', trackerName: 'КАМАЗ-5490 GPS',
        imei: '353456789012346', phoneNumber: '+7 (916) 100-01-02',
        lastLatitude: 54.2000, lastLongitude: 38.1500, lastSpeed: 68,
        lastCourse: 170, lastIgnition: true, lastFuelLevel: 42, lastMileage: 54350,
        lastEngineTemp: 88, lastAddress: 'М4, 350 км, Тульская обл.',
        lastSeenAt: hoursAgo(0.1), lastPositionAt: hoursAgo(0.1), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[2].id, trackerId: 'TRK-003', trackerName: 'ГАЗель NEXT GPS',
        imei: '353456789012347', phoneNumber: '+7 (916) 100-01-03',
        lastLatitude: 55.8941, lastLongitude: 37.4402, lastSpeed: 0,
        lastIgnition: false, lastFuelLevel: 55, lastMileage: 32100,
        lastAddress: 'г. Химки, ул. Логистическая, 8',
        lastSeenAt: hoursAgo(2), lastPositionAt: hoursAgo(2), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[3].id, trackerId: 'TRK-004', trackerName: 'МАЗ-6312 GPS',
        imei: '353456789012348', phoneNumber: '+7 (916) 100-01-04',
        lastLatitude: 55.7089, lastLongitude: 37.6564, lastSpeed: 0,
        lastIgnition: false, lastFuelLevel: 30, lastMileage: 134000,
        lastAddress: 'г. Москва, ул. Автозаводская, 23 (СТО)',
        lastSeenAt: daysAgo(3), lastPositionAt: daysAgo(3), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[4].id, trackerId: 'TRK-005', trackerName: 'JCB 3CX GPS',
        imei: '353456789012349', phoneNumber: '+7 (916) 100-01-05',
        lastLatitude: 55.7517, lastLongitude: 37.6319, lastSpeed: 5,
        lastIgnition: true, lastFuelLevel: 70, lastMileage: 6800,
        lastAddress: 'МКАД, строительный объект',
        lastSeenAt: hoursAgo(1), lastPositionAt: hoursAgo(1), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[5].id, trackerId: 'TRK-006', trackerName: 'Bulldozer Komatsu GPS',
        imei: '353456789012350', phoneNumber: '+7 (916) 100-01-06',
        lastLatitude: 55.7520, lastLongitude: 37.6325, lastSpeed: 3,
        lastIgnition: true, lastFuelLevel: 55, lastMileage: 4200,
        lastAddress: 'МКАД, строительный объект',
        lastSeenAt: hoursAgo(0.8), lastPositionAt: hoursAgo(0.8), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[7].id, trackerId: 'TRK-007', trackerName: 'Reefer Trailer GPS',
        imei: '353456789012351', phoneNumber: '+7 (916) 100-01-07',
        lastLatitude: 55.8941, lastLongitude: 37.4402, lastSpeed: 0,
        lastIgnition: false, lastFuelLevel: 80, lastMileage: 95000,
        lastAddress: 'г. Химки, ул. Логистическая, 8',
        lastSeenAt: hoursAgo(6), lastPositionAt: hoursAgo(6), isActive: true,
      },
    }),
    db.glonassTracker.create({
      data: {
        equipmentId: equipment[11].id, trackerId: 'TRK-008', trackerName: 'УАЗ Патриот GPS',
        imei: '353456789012352', phoneNumber: '+7 (916) 100-01-08',
        lastLatitude: 55.7500, lastLongitude: 37.6000, lastSpeed: 35,
        lastCourse: 90, lastIgnition: true, lastFuelLevel: 40, lastMileage: 41300,
        lastAddress: 'г. Москва, Ленинский проспект',
        lastSeenAt: hoursAgo(0.3), lastPositionAt: hoursAgo(0.3), isActive: true,
      },
    }),
  ])
  console.log(`✅ Created ${trackers.length} GLONASS trackers`)

  // ════════════════════════════════════════════════════════════════
  // 11. ДАННЫЕ ДАТЧИКОВ ГЛОНАСС
  // ════════════════════════════════════════════════════════════════
  console.log('📊 Creating sensor data...')

  const sensorDataItems: { trackerId: string; sensorType: string; sensorName: string; value: number; unit: string; timestamp: Date }[] = []

  // Fuel sensors for each tracker
  for (const tracker of trackers) {
    const fuelLevel = tracker.lastFuelLevel ?? 50
    sensorDataItems.push({ trackerId: tracker.id, sensorType: 'fuel', sensorName: 'Датчик уровня топлива', value: fuelLevel, unit: '%', timestamp: tracker.lastSeenAt ?? new Date() })
  }

  // Additional sensors for first 3 trackers
  sensorDataItems.push(
    { trackerId: trackers[0].id, sensorType: 'temperature', sensorName: 'Температура двигателя', value: 45, unit: '°C', timestamp: hoursAgo(0.5) },
    { trackerId: trackers[0].id, sensorType: 'ignition', sensorName: 'Зажигание', value: 0, unit: '', timestamp: hoursAgo(0.5) },
    { trackerId: trackers[0].id, sensorType: 'mileage', sensorName: 'Пробег', value: 87500, unit: 'км', timestamp: hoursAgo(0.5) },
    { trackerId: trackers[0].id, sensorType: 'speed', sensorName: 'Скорость', value: 0, unit: 'км/ч', timestamp: hoursAgo(0.5) },

    { trackerId: trackers[1].id, sensorType: 'temperature', sensorName: 'Температура двигателя', value: 88, unit: '°C', timestamp: hoursAgo(0.1) },
    { trackerId: trackers[1].id, sensorType: 'ignition', sensorName: 'Зажигание', value: 1, unit: '', timestamp: hoursAgo(0.1) },
    { trackerId: trackers[1].id, sensorType: 'mileage', sensorName: 'Пробег', value: 54350, unit: 'км', timestamp: hoursAgo(0.1) },
    { trackerId: trackers[1].id, sensorType: 'speed', sensorName: 'Скорость', value: 68, unit: 'км/ч', timestamp: hoursAgo(0.1) },

    { trackerId: trackers[2].id, sensorType: 'temperature', sensorName: 'Температура двигателя', value: 22, unit: '°C', timestamp: hoursAgo(2) },
    { trackerId: trackers[2].id, sensorType: 'ignition', sensorName: 'Зажигание', value: 0, unit: '', timestamp: hoursAgo(2) },
    { trackerId: trackers[2].id, sensorType: 'speed', sensorName: 'Скорость', value: 0, unit: 'км/ч', timestamp: hoursAgo(2) },

    { trackerId: trackers[4].id, sensorType: 'temperature', sensorName: 'Температура гидравлики', value: 72, unit: '°C', timestamp: hoursAgo(1) },
    { trackerId: trackers[4].id, sensorType: 'ignition', sensorName: 'Зажигание', value: 1, unit: '', timestamp: hoursAgo(1) },
    { trackerId: trackers[4].id, sensorType: 'speed', sensorName: 'Скорость', value: 5, unit: 'км/ч', timestamp: hoursAgo(1) },
  )

  await db.glonassSensorData.createMany({ data: sensorDataItems })
  console.log(`✅ Created ${sensorDataItems.length} sensor data records`)

  // ════════════════════════════════════════════════════════════════
  // 12. ИСТОРИЯ ТЕХНИКИ
  // ════════════════════════════════════════════════════════════════
  console.log('📜 Creating equipment history...')

  const historyData = [
    { equipmentId: equipment[0].id, event: 'registration', description: 'Постановка на учёт', date: daysAgo(730), performedBy: 'Администратор' },
    { equipmentId: equipment[0].id, event: 'inspection', description: 'Пройден техосмотр', date: daysAgo(200), performedBy: 'Сидоров С.' },
    { equipmentId: equipment[0].id, event: 'repair', description: 'Замена тормозных колодок', date: daysAgo(120), oldValue: 'Пробег 80 000', newValue: 'Пробег 80 000 (ТО выполнено)', performedBy: 'Лебедев И.А.' },
    { equipmentId: equipment[1].id, event: 'registration', description: 'Постановка на учёт', date: daysAgo(365), performedBy: 'Администратор' },
    { equipmentId: equipment[2].id, event: 'rental', description: 'Передача в аренду ООО «ТрансЛогистик»', date: daysAgo(90), oldValue: 'На балансе ООО «СтройМаш»', newValue: 'В аренде у ООО «ТрансЛогистик»', performedBy: 'Иванов И.' },
    { equipmentId: equipment[3].id, event: 'repair', description: 'Направлен в ремонт — замена КПП', date: daysAgo(5), oldValue: 'Активен', newValue: 'В ремонте', performedBy: 'Лебедев И.А.' },
    { equipmentId: equipment[4].id, event: 'repair', description: 'Ремонт гидравлики', date: daysAgo(30), oldValue: 'Утечка масла', newValue: 'Гидравлика заменена', performedBy: 'Волков М.Ю.' },
    { equipmentId: equipment[8].id, event: 'decommission', description: 'Списание прицепа', date: daysAgo(10), oldValue: 'Активен', newValue: 'Списан', performedBy: 'Администратор' },
    { equipmentId: equipment[9].id, event: 'registration', description: 'Поступление на баланс ЗАО «АгроТех»', date: daysAgo(180), performedBy: 'Кузнецова М.В.' },
  ]
  await db.equipmentHistory.createMany({ data: historyData })
  console.log(`✅ Created ${historyData.length} equipment history records`)

  // ════════════════════════════════════════════════════════════════
  // 13. ПРАВИЛА УВЕДОМЛЕНИЙ
  // ════════════════════════════════════════════════════════════════
  console.log('🔔 Creating notification rules...')

  const notificationRules = await Promise.all([
    db.notificationRule.create({
      data: { equipmentId: equipment[0].id, conditionType: 'offline', thresholdValue: 2, isActive: true, description: 'Уведомление если КАМАЗ-6520 оффлайн более 2 часов' },
    }),
    db.notificationRule.create({
      data: { equipmentId: equipment[1].id, conditionType: 'speed_exceeded', thresholdValue: 80, isActive: true, description: 'Превышение скорости 80 км/ч для КАМАЗ-5490' },
    }),
    db.notificationRule.create({
      data: { equipmentId: equipment[1].id, conditionType: 'fuel_low', thresholdValue: 15, isActive: true, description: 'Низкий уровень топлива (< 15%)' },
    }),
    db.notificationRule.create({
      data: { equipmentId: equipment[3].id, conditionType: 'not_synced', thresholdValue: 24, isActive: true, description: 'МАЗ-6312 не синхронизирован более 24 часов' },
    }),
  ])
  console.log(`✅ Created ${notificationRules.length} notification rules`)

  // ════════════════════════════════════════════════════════════════
  // ИТОГ
  // ════════════════════════════════════════════════════════════════
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🎉 Демо-данные успешно загружены!')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('📋 Пользователи (PIN-коды):')
  console.log('   Администратор   — PIN: 1234  (admin)')
  console.log('   Иванов Иван     — PIN: 2345  (manager)')
  console.log('   Петров Алексей  — PIN: 3456  (trip_master)')
  console.log('   Сидоров Сергей  — PIN: 4567  (repair_worker)')
  console.log('   Козлов Дмитрий  — PIN: 5678  (worker)')
  console.log('   Новикова Елена  — PIN: 6789  (manager)')
  console.log('   Морозов Андрей  — PIN: 7890  (repair_worker, неактивен)')
  console.log('')
  console.log(`🏢 Компаний: ${companies.length}`)
  console.log(`🚛 Техники: ${equipment.length}`)
  console.log(`👷 Сотрудников: ${employees.length}`)
  console.log(`👷‍♂️ Экипажей: ${crews.length}`)
  console.log(`🔧 Ремонтов: ${repairs.length}`)
  console.log(`🚚 Рейсов: ${trips.length}`)
  console.log(`📡 Трекеров: ${trackers.length}`)
  console.log(`🗺️ Маршрутов: ${routeTemplates.length}`)
  console.log('═══════════════════════════════════════════════════════════════')
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
