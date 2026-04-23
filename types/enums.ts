export type Role = 'operator' | 'tech' | 'admin'

export type PlanTier = 'starter' | 'pro' | 'enterprise'

export type JobStatus =
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'on_site'
  | 'complete'
  | 'cancelled'

export type ServiceType =
  | 'mount_balance'
  | 'tire_repair'
  | 'wheel_repair'
  | 'jumpstart'
  | 'spare_installation'
  | 'tire_rotation'
  | 'tire_balancing'
  | 'tpms_service'
  | 'oil_change'
  | 'brake_service'

// Mount & balance wheel class
export type MountBalanceVariant = 'stock' | 'aftermarket' | 'lt' | 'extreme' | 'beadlock'

// Tire repair type
export type TireRepairVariant = 'plug' | 'patch' | 'plug_n_patch'

// Wheel repair type
export type WheelRepairVariant = 'oem_crack' | 'aftermarket' | 'aluminum_bent' | 'steel_bent'

export type ServiceVariant = MountBalanceVariant | TireRepairVariant | WheelRepairVariant

export type VehicleClass = 'standard' | 'suv' | 'truck' | 'lt' | 'specialty'

export type LocationType = 'suburban' | 'highway'

export type JobSource = 'sms' | 'web' | 'manual'

export type MessageDirection = 'inbound' | 'outbound'

export type PhotoType = 'before' | 'during' | 'after'

export type SopCategory = 'safety' | 'procedures' | 'customer_service'

export type FeeTier = 1 | 2 | 3 | 4 | 5

export const FEE_TIER_AMOUNTS: Record<FeeTier, number> = {
  1: 10000, // $100 — Woodbridge only
  2: 11000, // $110 — close suburbs
  3: 12500, // $125 — mid suburbs
  4: 15000, // $150 — DC + outer NoVA
  5: 17500, // $175 — far suburbs + highway minimum
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  mount_balance: 'Mount & Balance',
  tire_repair: 'Tire Repair',
  wheel_repair: 'Wheel Repair',
  jumpstart: 'Jumpstart',
  spare_installation: 'Spare Installation',
  tire_rotation: 'Tire Rotation',
  tire_balancing: 'Tire Balancing',
  tpms_service: 'TPMS Service',
  oil_change: 'Oil Change',
  brake_service: 'Brake Service',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  en_route: 'En Route',
  on_site: 'On Site',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  standard:  'Standard (sedan/coupe)',
  suv:       'SUV / Crossover',
  truck:     'Pickup Truck / Full-Size SUV',
  lt:        'Light Truck / Heavy Duty',
  specialty: 'Specialty (low-profile / run-flat / performance)',
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  suburban: 'Suburban',
  highway:  'Highway / Interstate',
}
