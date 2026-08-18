import type { FilterState } from '../types';

interface FacebookInsight {
  account_id?: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  reach: string;
  frequency: string;
  date_start: string;
  date_stop: string;
}

interface FacebookApiResponse {
  data: FacebookInsight[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

const getFacebookDateRange = (filter: FilterState) => {
  const today = new Date();
  
  // Helper to format date as YYYY-MM-DD in LOCAL time
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(today);

  switch (filter.period) {
    case 'today':
      return { since: todayStr, until: todayStr };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { since: formatDate(yesterday), until: formatDate(yesterday) };
    }
    case 'last7days': {
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 6);
      return { since: formatDate(last7), until: todayStr };
    }
    case 'thisMonth': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { since: formatDate(firstDay), until: todayStr };
    }
    case 'quarterly': {
        const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
        const qStart = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        return { since: formatDate(qStart), until: todayStr };
    }
    case 'semiannually': {
         const currentSemester = Math.floor((today.getMonth() + 6) / 6);
         const sStart = new Date(today.getFullYear(), (currentSemester - 1) * 6, 1);
         return { since: formatDate(sStart), until: todayStr };
    }
    case 'annually': {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { since: formatDate(yearStart), until: todayStr };
    }
    case 'custom':
      if (filter.startDate && filter.endDate) {
        // Compare strings for safety if they are both YYYY-MM-DD
        const finalEnd = filter.endDate > todayStr ? todayStr : filter.endDate;
        return { since: filter.startDate, until: finalEnd };
      }
      return { since: todayStr, until: todayStr };
    default:
      return { since: todayStr, until: todayStr };
  }
};

export const fetchFacebookInsights = async (
  accessToken: string,
  adAccountIds: any,
  filter: FilterState
): Promise<FacebookInsight[]> => {
  const { since, until } = getFacebookDateRange(filter);
  const timeRange = JSON.stringify({ since, until });
  
  let parsedIds: string[] = [];

  // Robust parsing logic as requested
  try {
    // If it's already an array, we handle it, but if it's a string (possibly JSON), we parse it.
    const rawData = typeof adAccountIds === 'string' ? adAccountIds.trim() : adAccountIds;
    
    if (typeof rawData === 'string') {
      if (rawData.startsWith('[') || rawData.startsWith('{')) {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          parsedIds = parsed.map((acc: any) => {
            if (typeof acc === 'object' && acc !== null) return acc.id;
            return String(acc);
          });
        } else if (typeof parsed === 'object' && parsed !== null) {
          parsedIds = [parsed.id || parsed];
        }
      } else if (rawData.includes(',')) {
        parsedIds = rawData.split(',').map(id => id.trim());
      } else if (rawData) {
        parsedIds = [rawData];
      }
    } else if (Array.isArray(rawData)) {
      parsedIds = rawData.map((acc: any) => {
        if (typeof acc === 'object' && acc !== null) return acc.id;
        return String(acc);
      });
    }
  } catch {
    // Fallback for comma-separated string if JSON.parse fails
    if (typeof adAccountIds === 'string') {
      parsedIds = adAccountIds.split(',').map(id => id.trim());
    } else {
      parsedIds = Array.isArray(adAccountIds) ? adAccountIds.map(String) : [];
    }
  }

  // Clean IDs: Absolute Sanitization
  const cleanIds = Array.from(new Set(
    parsedIds
      .filter(Boolean)
      .map(id => {
        const cleanId = String(id).trim().replace('act_', '');
        return 'act_' + cleanId;
      })
  ));

  console.log('🚀 IDs sendo enviados para a API:', cleanIds);

  const allInsights: FacebookInsight[] = [];

  for (const accountId of cleanIds) {
    console.log(`Fetching insights for account: ${accountId}`);
    // Using time_range as it is the standard for the insights endpoint
    let url = `https://graph.facebook.com/v23.0/${accountId}/insights?fields=campaign_name,adset_name,ad_name,spend,impressions,clicks,inline_link_clicks,actions,action_values,reach,frequency,date_start,date_stop&level=ad&time_range=${encodeURIComponent(timeRange)}&time_increment=1&access_token=${accessToken}&limit=500`;

    try {
      while (url) {
        console.log('🔎 URL ENVIADA PRO FACEBOOK:', url);
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ ERRO DETALHADO DA GRAPH API:', errorData);
            
            const errorMessage = `Falha ao buscar dados do Facebook: ${errorData.error?.message || 'Erro desconhecido'}`;
            throw new Error(errorMessage);
        }

        const data: FacebookApiResponse = await response.json();
        console.log('📦 DADOS RECEBIDOS:', data);
        if (data.data) {
          allInsights.push(...data.data.map(item => ({ ...item, account_id: accountId })));
        }

        url = data.paging?.next || '';
      }
    } catch (error: any) {
      console.error(`Failed to fetch data for account ${accountId}`, error);
      // Rethrow to ensure the UI (App.tsx) catches it and can show a toast/error state
      throw error;
    }
  }

  return allInsights;
};
