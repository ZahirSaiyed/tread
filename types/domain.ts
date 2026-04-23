import type {
  Role,
  PlanTier,
  JobStatus,
  ServiceType,
  ServiceVariant,
  VehicleClass,
  LocationType,
  JobSource,
  MessageDirection,
  PhotoType,
  SopCategory,
  FeeTier,
} from './enums'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  twilio_number: string | null
  stripe_account_id: string | null
  plan_tier: PlanTier
  after_hours_fee_cents: number
  after_hours_start: string // HH:MM format
  after_hours_end: string   // HH:MM format
  highway_minimum_fee_cents: number
  created_at: string
}

export interface User {
  id: string
  tenant_id: string
  role: Role
  name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface Job {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone: string
  address: string
  lat: number | null
  lng: number | null
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  service_type: ServiceType
  service_variant: ServiceVariant | null
  status: JobStatus
  assigned_tech_id: string | null
  price_cents: number | null
  notes: string | null
  source: JobSource
  tracking_token: string
  tracking_expires_at: string | null
  created_at: string
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  // joined
  assigned_tech?: User
}

export interface JobEvent {
  id: string
  job_id: string
  tenant_id: string
  event_type: string
  payload: Record<string, unknown>
  created_by: string | null
  created_at: string
  // joined
  created_by_user?: User
}

export interface JobPhoto {
  id: string
  job_id: string
  tenant_id: string
  photo_type: PhotoType
  storage_url: string
  uploaded_by: string
  created_at: string
}

export interface PricingRule {
  id: string
  tenant_id: string
  service_type: ServiceType
  vehicle_class: VehicleClass
  location_type: LocationType
  base_price_cents: number
  mobile_fee_cents: number
  disposal_fee_cents: number
  tax_rate: number          // e.g. 0.0600 for 6%
  is_active: boolean
  created_at: string
}

export interface LocationFee {
  id: string
  tenant_id: string
  city: string
  state_code: string
  country_code: string
  fee_cents: number
  fee_tier: FeeTier
  is_active: boolean
  created_at: string
}

export interface Message {
  id: string
  tenant_id: string
  job_id: string | null
  direction: MessageDirection
  from_number: string
  to_number: string
  body: string
  status: string
  twilio_sid: string | null
  created_at: string
}

export interface ReviewRequest {
  id: string
  tenant_id: string
  job_id: string
  customer_phone: string
  sent_at: string
  clicked_at: string | null
  review_url: string
  twilio_sid: string | null
}

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface SopDocument {
  id: string
  tenant_id: string
  title: string
  category: SopCategory
  content_markdown: string
  is_published: boolean
  created_at: string
  updated_at: string
}

// Auth session user (what we attach to the request context)
export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  tenant_id: string
  role: Role
  name: string
}
