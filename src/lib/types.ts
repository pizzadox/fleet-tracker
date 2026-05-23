import React from 'react'

// ═══════════════════════════════════════════════════════════════
// TYPES — All TypeScript interfaces
// ═══════════════════════════════════════════════════════════════

export interface Company {
  id: string; name: string; inn?: string | null; kpp?: string | null;
  ogrn?: string | null; address?: string | null; factAddress?: string | null;
  phone?: string | null; email?: string | null; director?: string | null;
  type: string; createdAt: string; updatedAt: string;
  _count?: { ownedEquipment: number; rentedEquipment: number };
}

export interface EquipmentPhoto {
  id: string; equipmentId: string; url: string;
  description?: string | null; category: string; createdAt: string;
}

export interface RepairStage {
  id: string; repairId: string; name: string; description?: string | null;
  status: string; startDate?: string | null; endDate?: string | null;
  performer?: string | null; cost?: number | null; sortOrder: number;
  estimatedDuration?: number | null; notes?: string | null;
}

export interface RepairPhoto {
  id: string; repairId: string; url: string;
  description?: string | null; stageId?: string | null;
  category: string;
}

export interface RepairEmployee {
  id: string; repairId: string; employeeId: string; role: string;
  assignedAt: string; notes?: string | null;
  employee: { id: string; fullName: string; position: string; phone?: string | null; status: string; licenseCat?: string | null };
}

export interface RepairComment {
  id: string; repairId: string; text: string; author?: string | null; createdAt: string;
}

export interface Repair {
  id: string; equipmentId: string; description: string;
  reason?: string | null; startDate: string; endDate?: string | null;
  status: string; cost?: number | null; contractor?: string | null;
  contractorPhone?: string | null; workPerformed?: string | null;
  spareParts?: string | null; nextInspection?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  priority: string; repairType: string;
  estimatedEndDate?: string | null; estimatedCost?: number | null;
  contractorEmail?: string | null; location?: string | null;
  mileageStart?: number | null; mileageEnd?: number | null;
  downtimeHours?: number | null; warrantyRepair: boolean;
  insuranceClaim: boolean; insuranceNumber?: string | null;
  comments?: RepairComment[];
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null; type?: string | null };
  photos?: RepairPhoto[]; stages?: RepairStage[];
  masters?: RepairEmployee[];
}

export interface EquipmentHistory {
  id: string; equipmentId: string; event: string;
  description?: string | null; date: string;
  oldValue?: string | null; newValue?: string | null; performedBy?: string | null;
}

export interface EquipmentDocument {
  id: string; equipmentId: string; name: string; type: string;
  url: string; expiryDate?: string | null; notes?: string | null;
}

export interface Equipment {
  id: string; name: string; type: string; brand?: string | null;
  model?: string | null; year?: number | null; vin?: string | null;
  serialNumber?: string | null; registrationNum?: string | null;
  stsNumber?: string | null; ptsNumber?: string | null;
  category?: string | null; color?: string | null;
  engineType?: string | null; engineVolume?: string | null;
  enginePower?: string | null; mileage?: number | null;
  fuelType?: string | null; loadCapacity?: string | null;
  passengerSeats?: number | null; purchaseDate?: string | null;
  purchasePrice?: number | null; currentPrice?: number | null;
  insuranceNumber?: string | null; insuranceExpiry?: string | null;
  inspectionDate?: string | null; inspectionExpiry?: string | null;
  status: string; notes?: string | null; ownerId?: string | null;
  renterId?: string | null; createdAt: string; updatedAt: string;
  condition?: string; location?: string | null; depot?: string | null;
  lastMaintenanceDate?: string | null; nextMaintenanceDate?: string | null;
  maintenanceInterval?: number | null; fuelConsumptionNorm?: number | null;
  tireSize?: string | null; tireReplacementDate?: string | null;
  oilChangeDate?: string | null; oilChangeMileage?: number | null;
  oilChangeInterval?: number | null; assignedDriver?: string | null;
  garageNumber?: string | null; unitNumber?: string | null;
  rentalStartDate?: string | null; rentalEndDate?: string | null;
  rentalCost?: number | null; decommissionDate?: string | null;
  decommissionReason?: string | null;
  owner?: Company | null; renter?: Company | null;
  _count?: { repairs: number; photos: number };
  photos?: EquipmentPhoto[]; repairs?: Repair[];
  history?: EquipmentHistory[]; documents?: EquipmentDocument[];
  trackers?: GlonassTracker[];
  employees?: { id: string; fullName: string; position: string; phone?: string | null; status: string; licenseCat?: string | null }[];
}

export interface GlonassTracker {
  id: string; equipmentId: string; trackerId: string; trackerName?: string | null;
  imei?: string | null; phoneNumber?: string | null;
  lastLatitude?: number | null; lastLongitude?: number | null;
  lastSpeed?: number | null; lastCourse?: number | null; lastAltitude?: number | null;
  lastIgnition?: boolean | null; lastFuelLevel?: number | null;
  lastMileage?: number | null; lastEngineTemp?: number | null;
  lastAddress?: string | null; lastSeenAt?: string | null; lastPositionAt?: string | null;
  axentaCloudId?: string | null; isActive: boolean;
  createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null };
  sensorData?: GlonassSensorData[];
}

export interface GlonassSensorData {
  id: string; trackerId: string; sensorType: string; sensorName?: string | null;
  value?: number | null; stringValue?: string | null; unit?: string | null;
  timestamp: string; createdAt: string;
}

export interface AxentaSettings {
  id?: string; apiUrl: string; apiKey: string; username?: string | null;
  password?: string | null; syncInterval: number; lastSyncAt?: string | null;
  isActive: boolean;
}

export interface CrewMember {
  id: string; crewId: string; employeeId?: string | null; fullName: string; role: string;
  phone?: string | null; licenseNum?: string | null; licenseCat?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; fullName: string; position: string; phone?: string | null; status: string } | null;
}

export interface Employee {
  id: string; fullName: string; position: string; phone?: string | null; email?: string | null;
  birthDate?: string | null; hireDate?: string | null; fireDate?: string | null;
  licenseNum?: string | null; licenseCat?: string | null; licenseExpiry?: string | null;
  passportSeries?: string | null; passportNum?: string | null; address?: string | null;
  status: string; salary?: number | null; notes?: string | null; crewId?: string | null;
  equipmentId?: string | null;
  createdAt: string; updatedAt: string;
  crew?: { id: string; name: string; type: string; status: string } | null;
  equipment?: { id: string; name: string; registrationNum?: string | null; type: string } | null;
  repairAssignments?: { id: string; repairId: string; role: string; assignedAt: string; repair: { id: string; description: string; status: string; equipment: { id: string; name: string } } }[];
}

export interface Crew {
  id: string; name: string; description?: string | null; type: string;
  status: string; notes?: string | null; createdAt: string; updatedAt: string;
  members?: CrewMember[]; employees?: Employee[]; _count?: { trips: number };
}

export interface RoutePoint {
  id: string; tripId: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; sortOrder: number;
  plannedArrival?: string | null; plannedDeparture?: string | null;
  actualArrival?: string | null; distanceFromPrev?: number | null;
  notes?: string | null; createdAt: string; updatedAt: string;
}

export interface RouteTemplatePoint {
  id: string; routeTemplateId: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; sortOrder: number;
  plannedArrival?: string | null; plannedDeparture?: string | null;
  distanceFromPrev?: number | null; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface RouteTemplate {
  id: string; name: string; description?: string | null;
  startPoint?: string | null; endPoint?: string | null;
  totalDistance?: number | null; estimatedDuration?: number | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  points: RouteTemplatePoint[];
}

export interface Trip {
  id: string; equipmentId: string; crewId?: string | null;
  route: string; startPoint?: string | null; endPoint?: string | null;
  cargo?: string | null; cargoWeight?: number | null; distance?: number | null;
  startDate: string; endDate?: string | null; plannedEndDate?: string | null;
  status: string; fuelStart?: number | null; fuelEnd?: number | null;
  mileageStart?: number | null; mileageEnd?: number | null;
  cost?: number | null; revenue?: number | null; notes?: string | null;
  avgSpeed?: number | null; maxSpeed?: number | null; fuelConsumed?: number | null;
  tripDuration?: number | null; engineHours?: number | null; avgFuelRate?: number | null;
  refuelVolume?: number | null; plumVolume?: number | null; idleTime?: number | null;
  parkingsDuration?: number | null; trackerSnapshot?: string | null; trackerSnapshotStart?: string | null;
  trackDataJson?: string | null; trackDataLoadedAt?: string | null;
  hasCachedTrack?: boolean;
  routeTemplateId?: string | null;
  createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null };
  crew?: { id: string; name: string; members?: { fullName: string; role: string }[] } | null;
  routePoints?: RoutePoint[];
  routeTemplate?: { id: string; name: string; points: RouteTemplatePoint[] } | null;
}

export interface AppUserType {
  id: string; name: string; role: string; isActive: boolean; avatar: string | null;
  createdAt?: string; updatedAt?: string;
}

export type RoleKey = 'admin' | 'manager' | 'trip_master' | 'repair_worker' | 'worker'

export interface EquipmentTypeInfo {
  label: string
  icon: React.ReactNode
  color: string
  darkColor: string
  category: string
}
