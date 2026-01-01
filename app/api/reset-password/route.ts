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
    console.log("Reset password request for:", email);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("email", email.toLowerCase().trim())
      .single();

    console.log("User lookup result:", { user, userError });

    if (!user) {
      console.log("User not found, returning success anyway");
      return NextResponse.json({ success: true });
    }

    const resetToken = crypto.randomUUID() + "-" + Date.now();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("users")
      .update({ 
        reset_token: resetToken,
        reset_token_expiry: resetExpiry
      })
      .eq("id", user.id);

    console.log("Token update result:", { updateError });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sifre-sifirla?token=${resetToken}`;
    console.log("Reset URL:", resetUrl);

    const emailResult = await resend.emails.send({
      from: "OutaCharge <onboarding@resend.dev>",
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
        </div>
      `,
    });

    console.log("Email send result:", emailResult);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}