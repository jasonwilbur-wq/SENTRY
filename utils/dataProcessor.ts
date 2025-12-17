import { Vendor, RiskLevel } from '../types';
import { RAW_CSV_DATA } from '../constants';

// Helper to parse CSV line respecting quotes
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const calculateRiskLevel = (rating: number): RiskLevel => {
  // CSV ratings are 0-5 based.
  // Higher rating = Better security = Lower Risk
  if (rating >= 4.0) return RiskLevel.LOW;
  if (rating >= 3.0) return RiskLevel.MEDIUM;
  if (rating >= 2.0) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
};

// Simple Entity Resolution: Normalize names
const normalizeName = (name: string): string => {
  return name.trim()
    .replace(/, Inc\.$/i, '')
    .replace(/ Ltd\.$/i, '')
    .replace(/ LLC$/i, '')
    .replace(/\s+/g, ' ');
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Pending Assessment';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if parse fails

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const processVendorData = (): Vendor[] => {
  const lines = RAW_CSV_DATA.split('\n');
  const vendors: Vendor[] = [];
  const processedCompanies = new Set<string>();

  // Skip header (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    
    // Mapping based on CSV structure:
    // 0: Company
    // 1: Vendor Report (URL)
    // 2: Category
    // 3: Technology_Product
    // 4: CompanyUrl
    // 5: Overall Rating (1-5)
    // 6: Vendor Status
    // 7: Last Assessed Date
    if (cols.length < 5) continue;

    const rawName = cols[0].replace(/"/g, '');
    const normalizedName = normalizeName(rawName);

    // Entity Resolution: Deduplicate by normalized name
    if (processedCompanies.has(normalizedName.toLowerCase())) {
        continue; 
    }
    processedCompanies.add(normalizedName.toLowerCase());

    const ratingRaw = parseFloat(cols[5]);
    const overallRating = isNaN(ratingRaw) ? 0 : ratingRaw; // Scale 1-5
    
    const risk = calculateRiskLevel(overallRating);
    const dateStr = cols[7];

    vendors.push({
      id: `v-${i}`,
      companyName: rawName,
      reportUrl: cols[1] || '#',
      category: cols[2] || 'Uncategorized',
      technologyProduct: cols[3] || 'N/A',
      overallRating: overallRating,
      vendorStatus: cols[6] || 'Active',
      riskLevel: risk,
      lastAudited: formatDate(dateStr)
    });
  }

  return vendors.sort((a, b) => b.overallRating - a.overallRating);
};

export const PROCESSED_VENDORS = processVendorData();