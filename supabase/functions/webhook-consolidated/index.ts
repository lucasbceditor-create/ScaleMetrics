import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório na URL' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let platformName: string = 'Desconhecida';
    let productName: string | undefined;
    let customerName: string | undefined;
    let customerEmail: string | undefined;
    let netAmount: number = 0;

    // Regra 1: Estrutura da KIWIFY
    if (payload?.order?.Commissions) {
      platformName = 'Kiwify';
      productName = payload.order.Product?.product_name;
      customerName = payload.order.Customer?.full_name;
      customerEmail = payload.order.Customer?.email;
      
      const myCommission = payload.order.Commissions?.my_commission;
      if (typeof myCommission === 'number') {
        netAmount = myCommission / 100;
      }

    // Regra 2: Estrutura da WIAPY
    } else if (payload?.data?.payment) {
      platformName = 'Wiapy';
      
      if (Array.isArray(payload.data.products) && payload.data.products.length > 0) {
        productName = payload.data.products[0]?.title;
      }
      customerName = payload.data.customer?.name;
      customerEmail = payload.data.customer?.email;

      const grossAmount = payload.data.payment?.amount;
      const fee = payload.data.payment?.fee;

      if (typeof grossAmount === 'number' && typeof fee === 'number') {
        netAmount = (grossAmount - fee) / 100;
      }
    }

    // Se a plataforma não for identificada, retorna erro.
    if (platformName === 'Desconhecida') {
        return new Response(JSON.stringify({ error: 'Plataforma não reconhecida ou payload inválido.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('sales')
      .insert([
        {
          user_id: userId,
          amount: netAmount,
          status: 'paid',
          platform: platformName,
          product_name: productName,
          customer_name: customerName,
          customer_email: customerEmail,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data: data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
