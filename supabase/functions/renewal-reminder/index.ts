import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 查询 7 天后到期的订阅
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        plan,
        current_period_end,
        users!inner(email)
      `)
      .eq('is_active', true)
      .gte('current_period_end', threeDaysFromNow.toISOString())
      .lte('current_period_end', sevenDaysFromNow.toISOString())
    
    if (error) throw error
    
    let sentCount = 0
    
    for (const sub of subscriptions || []) {
      const daysUntilRenewal = Math.ceil(
        (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      
      // 发送邮件
      const { error: emailError } = await supabase.auth.admin.sendEmail({
        email: sub.users.email,
        type: 'email',
        data: {
          subject: `Your ${sub.plan} subscription renews in ${daysUntilRenewal} days`,
          html: `
            <h2>Subscription Renewal Reminder</h2>
            <p>Hello,</p>
            <p>Your <strong>${sub.plan}</strong> subscription will automatically renew in <strong>${daysUntilRenewal} days</strong>.</p>
            <p>Renewal date: <strong>${new Date(sub.current_period_end).toLocaleDateString()}</strong></p>
            <p>If you wish to cancel, please visit your profile page.</p>
            <p><a href="https://fishtalk.app/profile.html">Manage Subscription</a></p>
            <br>
            <p>Thank you for using FishTalk.app!</p>
          `
        }
      })
      
      if (!emailError) sentCount++
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: subscriptions?.length || 0,
        sent: sentCount 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})



