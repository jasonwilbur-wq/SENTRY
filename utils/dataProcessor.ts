/**
 * dataProcessor.ts — legacy stub.
 *
 * The vendor CSV is now served by the FastAPI backend via GET /api/vendors.
 * This file is kept so older imports compile, but PROCESSED_VENDORS is
 * intentionally empty — VendorContext loads live data from the API.
 *
 * To populate vendors: start the FastAPI backend (see README).
 */
import { Vendor, RiskLevel } from '../types';

export const PROCESSED_VENDORS: Vendor[] = [];