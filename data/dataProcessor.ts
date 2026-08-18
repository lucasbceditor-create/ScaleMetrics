import type { DashboardData, FilterState, TrafficItemData, FunnelViewData, MacroData } from '../types';
import { limparNumero } from '../utils/currency';

// Helper to parse ISO strings into Local Time correctly
const getLocalDateString = (isoString: string) => {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- DATE FILTERING ---

const getFilterDates = (period: FilterState['period'], startDateStr?: string, endDateStr?: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today':
            break;
        case 'yesterday':
            startDate.setDate(now.getDate() - 1);
            endDate.setDate(now.getDate() - 1);
            break;
        case 'last7days':
            startDate.setDate(now.getDate() - 6);
            break;
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'quarterly': {
            const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
            startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
            break;
        }
        case 'semiannually': {
            const currentSemester = Math.floor((now.getMonth() + 6) / 6);
            startDate = new Date(now.getFullYear(), (currentSemester - 1) * 6, 1);
            break;
        }
        case 'annually':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'custom':
            if (startDateStr && endDateStr) {
                startDate = new Date(startDateStr + 'T00:00:00');
                endDate = new Date(endDateStr + 'T23:59:59');
            }
            break;
    }
    return { startDate, endDate };
};

const filterSalesByDate = (sales: any[], filter: FilterState): any[] => {
    if (!sales || !Array.isArray(sales)) return [];
    const { startDate, endDate } = getFilterDates(filter.period, filter.startDate, filter.endDate);

    return sales.filter(sale => {
        if (!sale.created_at) return false;
        // Use the full ISO string to let the browser handle the timezone conversion to local time
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDate && saleDate <= endDate;
    });
};

const filterDataByPeriod = (rows: any[], filter: FilterState, dateKey: string): any[] => {
    if (!rows || !Array.isArray(rows)) return [];
    
    const now = new Date();
    const toLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = toLocalDateString(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterdayDate);

    // Pre-calculate range for efficiency
    let startRange = todayStr;
    let endRange = todayStr;

    if (filter.period === 'today') {
        startRange = todayStr;
        endRange = todayStr;
    } else if (filter.period === 'yesterday') {
        startRange = yesterdayStr;
        endRange = yesterdayStr;
    } else if (filter.period === 'last7days') {
        const d = new Date(now);
        d.setDate(now.getDate() - 6);
        startRange = toLocalDateString(d);
        endRange = todayStr;
    } else if (filter.period === 'thisMonth') {
        startRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        endRange = todayStr;
    } else if (filter.period === 'quarterly') {
        const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
        const qStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        startRange = toLocalDateString(qStart);
        endRange = todayStr;
    } else if (filter.period === 'semiannually') {
        const currentSemester = Math.floor((now.getMonth() + 6) / 6);
        const sStart = new Date(now.getFullYear(), (currentSemester - 1) * 6, 1);
        startRange = toLocalDateString(sStart);
        endRange = todayStr;
    } else if (filter.period === 'annually') {
        startRange = `${now.getFullYear()}-01-01`;
        endRange = todayStr;
    } else if (filter.period === 'custom' && filter.startDate && filter.endDate) {
        startRange = filter.startDate;
        endRange = filter.endDate;
    }

    return rows.filter(row => {
        const rawDate = row[dateKey];
        if (!rawDate) return false;
        
        let dateStr = String(rawDate).trim();
        if (dateStr.toLowerCase().includes('total')) return false;

        // Normalize DD/MM/YYYY or YYYY/MM/DD to YYYY-MM-DD
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts[0].length === 4) { // YYYY/MM/DD
                dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
            } else { // DD/MM/YYYY
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        // Extract YYYY-MM-DD
        const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;
        const normalized = match[0];

        switch(filter.period) {
            case 'today':
                return normalized === todayStr;
            case 'yesterday':
                return normalized === yesterdayStr;
            case 'last7days':
            case 'thisMonth':
            case 'custom':
                return normalized >= startRange && normalized <= endRange;
            default:
                return true;
        }
    });
};

// --- HELPER TO PROCESS TRAFFIC ITEMS ---
const processTrafficItems = (
    rows: any[], 
    supabaseSales: any[], 
    utmKey: string, 
    nameKey: string, 
    taxMultiplier: number
): TrafficItemData[] => {
    const itemsMap = new Map<string, any>();

    rows.forEach((row: any) => {
        const name = row[nameKey];
        if (!name) return;

        const spent = limparNumero(row['Amount Spent']);
        const existing = itemsMap.get(name) || {
            spent: 0, 
            impressions: 0, 
            clicks: 0, 
            sales: 0, 
            revenue: 0,
            visits: 0,
            checkouts: 0,
            campaignName: row['Campaign Name'],
            adsetName: row['Ad Set Name'],
            utmContent: row['utm_content'],
            utmTerm: row['utm_term']
        };

        existing.spent += spent;
        existing.impressions += parseInt(row['Impressions'], 10) || 0;
        existing.clicks += parseInt(row['Link Clicks'], 10) || 0;
        
        itemsMap.set(name, existing);
    });

    // Match with Supabase Sales
    supabaseSales.forEach(sale => {
        const status = (sale.status || '').toLowerCase();
        const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';
        
        if (isApproved) {
            const utmValue = sale[utmKey];
            if (utmValue && itemsMap.has(utmValue)) {
                const item = itemsMap.get(utmValue);
                item.sales += 1;
                item.revenue += Number(sale.amount || 0);
            }
        }
    });

    return Array.from(itemsMap.entries()).map(([name, totals]) => {
        const realSpent = totals.spent * taxMultiplier;
        const cpc = totals.clicks > 0 ? realSpent / totals.clicks : 0;
        const cpm = totals.impressions > 0 ? (realSpent / totals.impressions) * 1000 : 0;
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const cpa = totals.sales > 0 ? realSpent / totals.sales : 0;
        const roas = realSpent > 0 ? totals.revenue / realSpent : 0;

        return {
            name,
            campaignName: totals.campaignName,
            adsetName: totals.adsetName,
            utmContent: totals.utmContent,
            utmTerm: totals.utmTerm,
            spent: realSpent,
            cpm,
            cpc,
            ctr,
            clicks: totals.clicks,
            impressions: totals.impressions,
            sales: totals.sales,
            cpa,
            roas,
            revenue: totals.revenue,
            visits: totals.visits || 0,
            checkouts: totals.checkouts || 0
        };
    });
};

// --- HELPER TO PROCESS FACEBOOK INSIGHTS ---
const processFacebookInsights = (
    insights: any[],
    supabaseSales: any[],
    salesSource: 'facebook' | 'platform',
    taxMultiplier: number
): { campaigns: TrafficItemData[], adsets: TrafficItemData[], ads: TrafficItemData[] } => {
    // We need to aggregate by campaign, adset, and ad
    const campaignsMap = new Map<string, any>();
    const adsetsMap = new Map<string, any>();
    const adsMap = new Map<string, any>();

    insights.forEach(insight => {
        const spend = parseFloat(insight.spend || '0');
        const impressions = parseInt(insight.impressions || '0', 10);
        // Use inline_link_clicks if available, otherwise clicks
        const clicks = parseInt(insight.inline_link_clicks || insight.clicks || '0', 10);
        
        // Extract actions (purchases, etc)
        let purchases = 0;
        let purchaseValue = 0;
        let checkouts = 0;
        let visits = 0; // Landing Page Views

        if (insight.actions) {
            insight.actions.forEach((action: any) => {
                if (action.action_type === 'purchase') purchases += parseInt(action.value, 10);
                if (action.action_type === 'initiate_checkout') checkouts += parseInt(action.value, 10);
                if (action.action_type === 'landing_page_view') visits += parseInt(action.value, 10);
            });
        }

        if (insight.action_values) {
            insight.action_values.forEach((action: any) => {
                if (action.action_type === 'purchase') purchaseValue += parseFloat(action.value);
            });
        }

        // Helper to update map
        const updateMap = (map: Map<string, any>, key: string, name: string, context: any) => {
            const existing = map.get(key) || {
                name: name,
                spent: 0,
                impressions: 0,
                clicks: 0,
                sales: 0,
                revenue: 0,
                fb_sales: 0,
                fb_revenue: 0,
                platform_sales: 0,
                platform_revenue: 0,
                visits: 0,
                checkouts: 0,
                campaignName: context.campaign_name,
                adsetName: context.adset_name,
            };
            existing.spent += spend;
            existing.impressions += impressions;
            existing.clicks += clicks;
            existing.visits += visits;
            existing.checkouts += checkouts;
            
            existing.fb_sales += purchases;
            existing.fb_revenue += purchaseValue;

            if (salesSource === 'facebook') {
                existing.sales += purchases;
                existing.revenue += purchaseValue;
            }
            
            map.set(key, existing);
        };

        updateMap(campaignsMap, insight.campaign_name, insight.campaign_name, insight);
        updateMap(adsetsMap, insight.adset_name, insight.adset_name, insight);
        updateMap(adsMap, insight.ad_name, insight.ad_name, insight);
    });

    if (salesSource === 'platform') {
        const matchSales = (map: Map<string, any>, utmKey: string) => {
             supabaseSales.forEach(sale => {
                const status = (sale.status || '').toLowerCase();
                const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';
                
                if (isApproved) {
                    const utmValue = sale[utmKey];
                    if (utmValue && map.has(utmValue)) {
                        const item = map.get(utmValue);
                        item.platform_sales += 1;
                        item.platform_revenue += Number(sale.amount || 0);
                    }
                }
            });
        };

        matchSales(campaignsMap, 'utm_campaign');
        matchSales(adsetsMap, 'utm_medium'); 
        matchSales(adsMap, 'utm_content'); 

        // HYBRID MERGE: Use the max of Facebook and Platform
        const applyHybrid = (map: Map<string, any>) => {
            map.forEach(item => {
                item.sales = Math.max(item.fb_sales, item.platform_sales);
                item.revenue = Math.max(item.fb_revenue, item.platform_revenue);
            });
        };
        applyHybrid(campaignsMap);
        applyHybrid(adsetsMap);
        applyHybrid(adsMap);
    }

    const transformToTrafficItem = (map: Map<string, any>): TrafficItemData[] => {
        return Array.from(map.values()).map(totals => {
            const realSpent = totals.spent * taxMultiplier;
            const cpc = totals.clicks > 0 ? realSpent / totals.clicks : 0;
            const cpm = totals.impressions > 0 ? (realSpent / totals.impressions) * 1000 : 0;
            const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
            const cpa = totals.sales > 0 ? realSpent / totals.sales : 0;
            const roas = realSpent > 0 ? totals.revenue / realSpent : 0;

            return {
                name: totals.name,
                campaignName: totals.campaignName,
                adsetName: totals.adsetName,
                spent: realSpent,
                cpm,
                cpc,
                ctr,
                clicks: totals.clicks,
                impressions: totals.impressions,
                sales: totals.sales,
                cpa,
                roas,
                revenue: totals.revenue,
                visits: totals.visits,
                checkouts: totals.checkouts
            };
        });
    };

    return {
        campaigns: transformToTrafficItem(campaignsMap),
        adsets: transformToTrafficItem(adsetsMap),
        ads: transformToTrafficItem(adsMap)
    };
};

// --- CORE DATA PROCESSING FUNCTION ---
export const processApiData = (
    apiResponse: any, 
    supabaseSales: any[], 
    filter: FilterState, 
    platformTax: number,
    salesSource: 'facebook' | 'platform' = 'platform'
): DashboardData | null => {
    if (!apiResponse) {
        console.error("API response is null or undefined");
        return null;
    }

    const taxMultiplier = platformTax > 0 ? 1 / (1 - (platformTax / 100)) : 1;
    
    // Check if apiResponse is from Facebook (array) or Google Sheets (object with keys)
    const isFacebookData = Array.isArray(apiResponse);

    let campaignsData: TrafficItemData[];
    let adsetsData: TrafficItemData[];
    let adsData: TrafficItemData[];
    let filteredSales: any[];

    if (isFacebookData) {
        // Facebook Data Processing
        
        // 1. Filter raw Facebook data by Account ID and Campaign Name
        let filteredInsights = apiResponse;

        if (filter.selectedAccount) {
            filteredInsights = filteredInsights.filter((insight: any) => insight.account_id === filter.selectedAccount);
        }

        if (filter.selectedCampaign) {
            filteredInsights = filteredInsights.filter((insight: any) => insight.campaign_name === filter.selectedCampaign);
        }

        // 2. Filter Supabase sales by Date, Product, and Campaign (UTM)
        filteredSales = filterSalesByDate(supabaseSales, filter);

        if (filter.selectedProduct) {
            filteredSales = filteredSales.filter(sale => sale.product_name === filter.selectedProduct);
        }

        if (filter.selectedCampaign) {
            // Cross-referencing: Filter sales where utm_campaign matches the selected campaign name
            // Note: This assumes utm_campaign exactly matches the campaign name from Facebook
            filteredSales = filteredSales.filter(sale => sale.utm_campaign === filter.selectedCampaign);
        }
        
        const processed = processFacebookInsights(filteredInsights, filteredSales, salesSource, taxMultiplier);
        campaignsData = processed.campaigns;
        adsetsData = processed.adsets;
        adsData = processed.ads;

    } else {
        // Legacy Google Sheets Processing
        // 1. Filter data based on the selected period
        const filteredCampaigns = filterDataByPeriod(apiResponse.campanhas || [], filter, 'Day');
        const filteredAdsets = filterDataByPeriod(apiResponse.conjuntos || [], filter, 'Day');
        const filteredAds = filterDataByPeriod(apiResponse.criativos || [], filter, 'Day');
        filteredSales = filterSalesByDate(supabaseSales, filter);

        // 2. Process each level
        campaignsData = processTrafficItems(filteredCampaigns, filteredSales, 'utm_campaign', 'Campaign Name', taxMultiplier);
        adsetsData = processTrafficItems(filteredAdsets, filteredSales, 'utm_medium', 'Ad Set Name', taxMultiplier);
        adsData = processTrafficItems(filteredAds, filteredSales, 'utm_content', 'Ad Name', taxMultiplier);
    }

    // 3. Global Totals & Organic Sales
    let realRevenue = 0;
    let realSalesCount = 0;
    let adsRevenue = 0;
    let adsSalesCount = 0;
    let refunds = 0;

    // Calculate Global Totals from Campaigns Data
    // Note: If Facebook source, campaignsData already has revenue/sales from FB.
    // If Platform source, campaignsData has revenue/sales from Supabase matching.
    
    const globalTotals = campaignsData.reduce((acc, item) => {
        acc.spent += item.spent; // Already includes tax
        acc.impressions += item.impressions;
        acc.clicks += item.clicks;
        acc.sales += item.sales;
        acc.revenue += item.revenue;
        acc.visits += item.visits;
        acc.checkouts += item.checkouts;
        return acc;
    }, { spent: 0, impressions: 0, clicks: 0, sales: 0, revenue: 0, visits: 0, checkouts: 0 });


    // Calculate Refunds from Supabase Sales (always available)
    filteredSales.forEach(sale => {
        const amount = Number(sale.amount || 0);
        const status = (sale.status || '').toLowerCase();
        const isRefunded = status === 'reembolsada' || status === 'refunded' || status === 'devolvida';
        if (isRefunded) {
            refunds += Math.abs(amount);
        }
    });

    if (salesSource === 'facebook' && isFacebookData) {
        // If source is Facebook, Total Revenue = Ads Revenue (from FB) + Organic (unknown/zero unless we mix sources?)
        // The requirement says: "ignore Supabase sales table... extract revenue from action_values"
        // So Real Revenue = Facebook Revenue. Organic is effectively 0 or unmeasured by FB.
        // However, usually users want Total = FB + Organic. 
        // But the prompt says "ignore Supabase sales table". So we assume only FB sales exist or matter.
        
        realRevenue = globalTotals.revenue;
        realSalesCount = globalTotals.sales;
        adsRevenue = globalTotals.revenue;
        adsSalesCount = globalTotals.sales;
        
    } else {
        // Platform/Webhook Source (Legacy Logic)
        // Real Revenue comes from Supabase Filtered Sales
        
        // Identify which sales are from ads (based on campaigns match)
        const campaignNames = new Set(campaignsData.map(c => c.name));
        
        filteredSales.forEach(sale => {
            const amount = Number(sale.amount || 0);
            const status = (sale.status || '').toLowerCase();
            
            const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';

            if (isApproved) {
                realRevenue += amount;
                realSalesCount += 1;
                
                if (sale.utm_campaign && campaignNames.has(sale.utm_campaign)) {
                    adsRevenue += amount;
                    adsSalesCount += 1;
                }
            }
        });
    }

    const organicRevenue = realRevenue - adsRevenue;
    const organicSalesCount = realSalesCount - adsSalesCount;
    
    // For Funnel Data, we need visits/checkouts.
    // If FB data, we need to aggregate from the raw response again or pass it through.
    // Let's do a quick re-reduce on the raw FB data if available, or just use what we have.
    // Since we don't pass raw FB data easily here without refactoring, let's approximate or skip if missing.
    // Actually, for FB data, we can sum up the actions from the raw response if we had it.
    // But we only have campaignsData.
    // Let's assume for now funnel might be limited for FB source unless we extend TrafficItemData.
    // Ideally we should extend TrafficItemData to include visits/checkouts.
    
    // Let's extend TrafficItemData locally or just calculate funnel from campaignsData if we add props.
    // For now, let's just use what we have.
    
    const realGlobalSpent = globalTotals.spent; // Already taxed
    const globalAvgTicket = realSalesCount > 0 ? realRevenue / realSalesCount : 0;
    const globalCPM = globalTotals.impressions > 0 ? (realGlobalSpent / globalTotals.impressions) * 1000 : 0;

    // Performance History
    // For FB, we need to aggregate by date. The FB API returns data by date if we ask, 
    // but here we asked for 'level=ad' and 'time_range'. 
    // If we want daily breakdown, we usually need 'time_increment=1'.
    // The current FB fetch implementation fetches for the WHOLE range.
    // So we won't have daily history for the chart if we select "Last 7 Days".
    // We only get the total for the range.
    // TO FIX: The FB API call should probably use `time_increment=1` if we want the chart to work.
    // OR we just accept that the chart will be flat or single point.
    // The prompt didn't explicitly ask for `time_increment=1`, but "Mapeado dinamicamente com base no filtro".
    // If we want the chart, we need daily data.
    // Let's assume for this step we might not have detailed history for FB unless we change the fetch.
    // But let's try to map what we have.
    
    // If we are in "Today" or "Yesterday", FB returns one row per ad.
    // If we are in "Last 7 Days", FB returns one row per ad with the TOTAL for 7 days.
    // So we can't build the daily chart from this response.
    // We would need a separate call or `time_increment=1`.
    // Given the constraints, I will leave the history empty or aggregate what I have (which is just total).
    
    const performanceHistory: any[] = []; // Placeholder for FB history
    
    if (isFacebookData) {
        const historyMap = new Map<string, { investment: number; revenue: number }>();

        // 1. Process Spend (and Revenue if source is Facebook) from Insights
        apiResponse.forEach((insight: any) => {
            const date = insight.date_start; // YYYY-MM-DD
            if (!date) return;

            const spend = parseFloat(insight.spend || '0') * taxMultiplier;
            let revenue = 0;

            if (salesSource === 'facebook' && insight.action_values) {
                insight.action_values.forEach((action: any) => {
                    if (action.action_type === 'purchase') {
                        revenue += parseFloat(action.value);
                    }
                });
            }

            const existing = historyMap.get(date) || { investment: 0, revenue: 0 };
            existing.investment += spend;
            existing.revenue += revenue;
            historyMap.set(date, existing);
        });

        // 2. Process Revenue if source is Platform (Supabase)
        if (salesSource === 'platform') {
            filteredSales.forEach(sale => {
                if (!sale.created_at) return;
                const status = (sale.status || '').toLowerCase();
                const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';
                
                if (isApproved) {
                    // Extract YYYY-MM-DD from ISO string
                    const date = getLocalDateString(sale.created_at);
                    
                    const existing = historyMap.get(date) || { investment: 0, revenue: 0 };
                    existing.revenue += Number(sale.amount || 0);
                    historyMap.set(date, existing);
                }
            });
        }

        // 3. Convert Map to Array and Aggregate by Month if needed
        const isLongPeriod = ['annually', 'semiannually', 'quarterly'].includes(filter.period);
        
        if (isLongPeriod) {
            const monthlyMap = new Map<string, { investment: number; revenue: number }>();
            Array.from(historyMap.entries()).forEach(([date, totals]) => {
                const [year, month] = date.split('-');
                const monthKey = `${year}-${month}`;
                const existing = monthlyMap.get(monthKey) || { investment: 0, revenue: 0 };
                existing.investment += totals.investment;
                existing.revenue += totals.revenue;
                monthlyMap.set(monthKey, existing);
            });

            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            Array.from(monthlyMap.entries()).forEach(([monthKey, totals]) => {
                const [year, month] = monthKey.split('-');
                const monthName = monthNames[parseInt(month) - 1];
                performanceHistory.push({
                    date: `${monthName}/${year.substring(2)}`,
                    investment: totals.investment,
                    revenue: totals.revenue,
                    fullDate: monthKey
                });
            });
        } else {
            Array.from(historyMap.entries()).forEach(([date, totals]) => {
                performanceHistory.push({
                    date: date.split('-').reverse().slice(0, 2).join('/'), // DD/MM
                    investment: totals.investment,
                    revenue: totals.revenue,
                    fullDate: date
                });
            });
        }

        // 4. Sort by Date
        performanceHistory.sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // --- HOURLY BREAKDOWN FOR TODAY/YESTERDAY ---
        if (filter.period === 'today' || filter.period === 'yesterday') {
            // Create 24 hourly buckets
            const hourlyHistory = Array.from({ length: 24 }, (_, i) => {
                const hourStr = i.toString().padStart(2, '0');
                return {
                    date: `${hourStr}h`,
                    fullDate: `${hourStr}:00`,
                    investment: 0,
                    revenue: 0,
                    hourIndex: i
                };
            });

            // 1. Distribute Revenue (Real timestamps from Supabase)
            if (salesSource === 'platform') {
                filteredSales.forEach(sale => {
                    if (!sale.created_at) return;
                    const status = (sale.status || '').toLowerCase();
                    const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';
                    
                    if (isApproved) {
                        // Use new Date(sale.created_at) to get the correct local hour
                        const dateObj = new Date(sale.created_at);
                        const hour = dateObj.getHours(); 
                        
                        if (hourlyHistory[hour]) {
                            hourlyHistory[hour].revenue += Number(sale.amount || 0);
                        }
                    }
                });
            } else {
                // If source is Facebook, we don't have timestamps. Distribute Revenue proportionally like Spend.
                const totalRevenue = globalTotals.revenue;
                
                if (filter.period === 'yesterday') {
                    const revenuePerHour = totalRevenue / 24;
                    hourlyHistory.forEach(bucket => {
                        bucket.revenue = revenuePerHour;
                    });
                } else {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const elapsedHours = Math.max(1, currentHour + (now.getMinutes() / 60));
                    const revenuePerHour = totalRevenue / elapsedHours;

                    hourlyHistory.forEach((bucket, index) => {
                        if (index < currentHour) {
                            bucket.revenue = revenuePerHour;
                        } else if (index === currentHour) {
                            bucket.revenue = revenuePerHour * (now.getMinutes() / 60);
                        } else {
                            bucket.revenue = 0;
                        }
                    });
                }
            }

            // 2. Distribute Spend (Facebook doesn't give hourly, so we distribute proportionally)
            const totalSpend = globalTotals.spent; // Already taxed

            if (filter.period === 'yesterday') {
                const spendPerHour = totalSpend / 24;
                hourlyHistory.forEach(bucket => {
                    bucket.investment = spendPerHour;
                });
            } else {
                const now = new Date();
                const currentHour = now.getHours();
                const elapsedHours = Math.max(1, currentHour + (now.getMinutes() / 60));
                const spendPerHour = totalSpend / elapsedHours;

                hourlyHistory.forEach((bucket, index) => {
                    if (index < currentHour) {
                        bucket.investment = spendPerHour;
                    } else if (index === currentHour) {
                        bucket.investment = spendPerHour * (now.getMinutes() / 60);
                    } else {
                        bucket.investment = 0;
                    }
                });
            }

            // 3. Accumulate values
            let acumuladoFaturamento = 0;
            let acumuladoInvestimento = 0;
            const now = new Date();
            const currentHour = now.getHours();

            performanceHistory.length = 0;
            hourlyHistory.forEach((h, index) => {
                acumuladoFaturamento += h.revenue;
                acumuladoInvestimento += h.investment;

                let finalRevenue: number | null = acumuladoFaturamento;
                let finalInvestment: number | null = acumuladoInvestimento;

                if (filter.period === 'today' && index > currentHour) {
                    finalRevenue = null;
                    finalInvestment = null;
                }

                performanceHistory.push({
                    date: h.date,
                    investment: finalInvestment,
                    revenue: finalRevenue,
                    fullDate: h.fullDate
                });
            });
        }

    } else {
         // Legacy history logic...
         // (Keep existing logic for Sheets)
         const historyMap = new Map<string, { investment: number; revenue: number }>();
         const isSingleDay = filter.period === 'today' || filter.period === 'yesterday';
         
         // Re-implement legacy history loop...
         // (Copied from previous file content)
         const filteredCampaigns = filterDataByPeriod(apiResponse.campanhas || [], filter, 'Day');
         filteredCampaigns.forEach(row => {
            let date = row['Day'];
            if (date && date.includes('/')) {
                const parts = date.split('/');
                if (parts[0].length === 4) date = `${parts[0]}-${parts[1]}-${parts[2]}`;
                else date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            const match = date.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                date = match[0];
                if (isSingleDay) {
                    date = `${date}T00:00:00`;
                }
            }
            const spent = limparNumero(row['Amount Spent']) * taxMultiplier;
            const existing = historyMap.get(date) || { investment: 0, revenue: 0 };
            existing.investment += spent;
            historyMap.set(date, existing);
        });
        
        filteredSales.forEach(sale => {
            if (!sale.created_at) return;
            const status = (sale.status || '').toLowerCase();
            const isApproved = status === 'aprovada' || status === 'approved' || status === 'completa' || status === 'paid';
            
            if (isApproved) {
                let date = getLocalDateString(sale.created_at);
                if (isSingleDay) {
                    const d = new Date(sale.created_at);
                    date = `${date}T${String(d.getHours()).padStart(2, '0')}:00:00`;
                }
                const existing = historyMap.get(date) || { investment: 0, revenue: 0 };
                existing.revenue += Number(sale.amount || 0);
                historyMap.set(date, existing);
            }
        });
        
        Array.from(historyMap.entries()).forEach(([date, totals]) => {
            performanceHistory.push({
                date: date,
                investment: totals.investment,
                revenue: totals.revenue,
                fullDate: date
            });
        });
        performanceHistory.sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    }

    const macro: MacroData = {
        investment: realGlobalSpent,
        revenue: realRevenue,
        adsRevenue: adsRevenue,
        organicRevenue: organicRevenue,
        netProfit: realRevenue - realGlobalSpent,
        roas: realGlobalSpent > 0 ? realRevenue / realGlobalSpent : 0,
        avgTicket: globalAvgTicket,
        avgCpa: realSalesCount > 0 ? realGlobalSpent / realSalesCount : 0,
        totalSales: realSalesCount,
        organicSales: organicSalesCount,
        refunds: refunds,
        cpc: globalTotals.clicks > 0 ? realGlobalSpent / globalTotals.clicks : 0,
        cpm: globalCPM,
        topCreatives: adsData
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 3)
            .map(ad => ({ name: ad.name, sales: ad.sales, cpa: ad.cpa })),
        performanceHistory,
    };

    // Funnel Data
    const funnel: FunnelViewData = {
        connectRate: globalTotals.clicks > 0 ? (globalTotals.visits / globalTotals.clicks) * 100 : 0,
        pageConversionRate: globalTotals.visits > 0 ? (globalTotals.checkouts / globalTotals.visits) * 100 : 0,
        checkoutConversionRate: globalTotals.checkouts > 0 ? (realSalesCount / globalTotals.checkouts) * 100 : 0,
        globalConversionRate: globalTotals.clicks > 0 ? (realSalesCount / globalTotals.clicks) * 100 : 0,
        costPerVisit: globalTotals.visits > 0 ? realGlobalSpent / globalTotals.visits : 0,
        costPerCheckout: globalTotals.checkouts > 0 ? realGlobalSpent / globalTotals.checkouts : 0,
        funnelSteps: {
            clicks: globalTotals.clicks,
            visits: globalTotals.visits,
            checkouts: globalTotals.checkouts,
            sales: realSalesCount,
        },
    };

    return {
        macro,
        campaigns: campaignsData,
        adsets: adsetsData,
        ads: adsData,
        funnel,
    };
};
