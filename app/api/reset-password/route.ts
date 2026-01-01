import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Check if email exists
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ success: true });
    }

    // Generate reset token and expiry
    const resetToken = crypto.randomUUID() + "-" + Date.now();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Save token to database
    await supabase
      .from("users")
      .update({ 
        reset_token: resetToken,
        reset_token_expiry: resetExpiry
      })
      .eq("id", user.id);

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://outacharge.vercel.app"}/sifre-sifirla?token=${resetToken}`;

    await resend.emails.send({
      from: "OutaCharge <noreply@outacharge.com>",
      to: email,
      subject: "Şifre Sıfırlama - OutaCharge",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">OutaCharge Şifre Sıfırlama</h2>
          <p>Merhaba ${user.full_name || ""},</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 20px 0;">
            Şifremi Sıfırla
          </a>
          <p style="color: #666; font-size: 14px;">Bu link 1 saat geçerlidir.</p>
          <p style="color: #666; font-size: 14px;">Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">OutaCharge - Türkiye'nin EV Şarj Platformu</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}