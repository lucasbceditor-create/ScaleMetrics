import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()

    // 1. Função utilitária de extração (Hunter)
    const getValue = (obj: any, paths: string[]) => {
      for (const path of paths) {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj)
        if (value !== undefined && value !== null) return value
      }
      return null
    }

    // 2. Mapeamento Universal
    const amountRaw = getValue(payload, ['data.payment.amount', 'amount', 'data.price', 'price'])
    const status = getValue(payload, ['data.payment.status', 'status', 'data.status'])
    const email = getValue(payload, ['data.customer.email', 'customer.email', 'buyer.email', 'email'])
    const utm_source = getValue(payload, ['data.tracking.utm_source', 'tracking.utm_source', 'utm_source'])
    const utm_campaign = getValue(payload, ['data.tracking.utm_campaign', 'tracking.utm_campaign', 'utm_campaign'])
    const utm_medium = getValue(payload, ['data.tracking.utm_medium', 'tracking.utm_medium', 'utm_medium'])
    const utm_content = getValue(payload, ['data.tracking.utm_content', 'tracking.utm_content', 'utm_content'])
    const product_name = getValue(payload, ['data.product.name', 'product.name', 'product_name', 'product']) || 'Produto Desconhecido'

    // 3. Normalização de Valor e Centavos
    let amount = 0
    if (amountRaw !== null) {
      // Converte para string e limpa caracteres não numéricos exceto ponto e vírgula
      const cleanedAmount = amountRaw.toString().replace(/[^\d.,]/g, '').replace(',', '.')
      amount = parseFloat(cleanedAmount)
      
      // Se for um número inteiro maior que 100, provavelmente está em centavos (ex: 990 para 9.90)
      if (amount > 100 && amount % 1 === 0) {
        amount = amount / 100
      }
    }

    // Inicializa o cliente Supabase dentro da função para garantir que as variáveis de ambiente estejam frescas
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert into Supabase
    const { error } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        amount: amount,
        status: status || 'paid',
        customer_email: email,
        utm_source,
        utm_campaign,
        utm_medium,
        utm_content,
        product_name,
        created_at: new Date().toISOString()
      })

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Webhook processed successfully', data: { amount, status, email } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
