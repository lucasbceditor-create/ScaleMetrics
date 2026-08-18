export type FilterPeriod = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'quarterly' | 'semiannually' | 'annually' | 'custom';
export type CreativeStatus = 'Ativo' | 'Pausado';

export interface FilterState {
    period: FilterPeriod;
    startDate?: string;
    endDate?: string;
    selectedAccount?: string;
    selectedProduct?: string;
    selectedCampaign?: string;
}

export interface AdAccount {
    id: string;
    name: string;
}

export interface UserProfile {
    id: string;
    meta_tax: number;
    spreadsheet_url: string | null;
    fb_access_token?: string | null;
    ad_account_ids?: string | string[] | AdAccount[] | null;
    sales_source?: 'facebook' | 'platform'; // 'facebook' or 'platform'
}

// Data for Line Chart in Macro View
export interface TimeDataPoint {
  date: string;
  revenue: number;
  investment: number;
}

// FIX: Added missing SalesDistribution type for DoughnutChart.tsx.
export interface SalesDistribution {
  mainProduct: number;
  orderBump: number;
}

// Data for Macro View
export interface ChampionAd {
  name: string;
  sales: number;
  cpa: number;
}
export interface MacroData {
  investment: number;
  revenue: number;
  adsRevenue: number;
  organicRevenue: number;
  netProfit: number;
  roas: number;
  avgTicket: number;
  avgCpa: number;
  totalSales: number;
  organicSales: number;
  refunds: number;
  cpc: number;
  cpm: number;
  topCreatives: ChampionAd[];
  performanceHistory: TimeDataPoint[];
}

// Data for Traffic View Table (Campaigns, Adsets, Ads)
export interface TrafficItemData {
  name: string;
  campaignName?: string;
  adsetName?: string;
  utmContent?: string;
  utmTerm?: string;
  spent: number;
  cpm: number;
  cpc: number;
  ctr: number;
  clicks: number;
  impressions: number;
  sales: number;
  cpa: number;
  roas: number;
  revenue: number;
  visits: number;
  checkouts: number;
}

// Data for Funnel components
export interface FunnelData {
  clicks: number;
  visits: number;
  checkouts: number;
  sales: number;
}

// Data for Funnel Engineering View
export interface FunnelViewData {
  connectRate: number;
  pageConversionRate: number;
  checkoutConversionRate: number;
  globalConversionRate: number;
  costPerVisit: number;
  costPerCheckout: number;
  funnelSteps: FunnelData;
}

export interface Sale {
    id: string;
    amount: number;
    status: string;
    product_name: string;
    created_at: string;
    payment_method?: string;
    customer_email?: string;
    utm_source?: string;
}

// Main Data Structure passed from the data layer
export interface DashboardData {
  macro: MacroData;
  campaigns: TrafficItemData[];
  adsets: TrafficItemData[];
  ads: TrafficItemData[];
  funnel: FunnelViewData;
}