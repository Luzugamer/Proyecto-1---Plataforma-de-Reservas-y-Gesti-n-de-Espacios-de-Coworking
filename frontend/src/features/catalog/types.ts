export type ResourceType = 'HOT_DESK' | 'DEDICATED_DESK' | 'MEETING_ROOM';

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';

export interface OperatingHour {
  dayOfWeek: string;
  opensAt: string; // "08:00"
  closesAt: string; // "20:00"
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  openingTime?: string;
  closingTime?: string;
  operatingHours: OperatingHour[];
}

export interface CreditCost {
  amount: number;
  unit: 'HOUR' | 'BLOCK_4_HOURS' | 'MONTH';
  minBlockMinutes: number;
}

export interface Resource {
  id: string;
  siteId: string;
  type: ResourceType;
  name: string;
  capacity: number;
  amenities?: string[];
  creditCost: CreditCost;
}

export interface AvailabilitySlot {
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
  status: SlotStatus;
}

export interface ResourceAvailability {
  resourceId: string;
  date: string; // "YYYY-MM-DD"
  slots: AvailabilitySlot[];
}

export interface CancelledReservationImpact {
  reservationId: string;
  refundedCredits: number;
}

export interface BlockResourceRequest {
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
  reason: string;
}

export interface BlockResourceResponse {
  blockId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  cancelledReservations: CancelledReservationImpact[];
}
