import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stationName, stationId, status, comment, address, operator, lat, lng } = body;

    const statusText = status === "broken" ? "Arızalı" : status === "busy" ? "Dolu" : "Çalışıyor";
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    const { data, error } = await resend.emails.send({
      from: "OutaCharge <onboarding@resend.dev>",
      to: ["umitbora94@gmail.com"], // Simdilik kendi mailine gidecek
      subject: `🔌 Şarj İstasyonu Bildirimi: ${stationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">⚡ OutaCharge</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Şarj İstasyonu Durum Bildirimi</p>
          </div>
          
          <div style="padding: 30px; background: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0;">${stationName}</h2>
              
              <div style="background: ${status === "broken" ? "#fef2f2" : status === "busy" ? "#fefce8" : "#f0fdf4"}; border-left: 4px solid ${status === "broken" ? "#ef4444" : status === "busy" ? "#eab308" : "#10b981"}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <strong style="color: ${status === "broken" ? "#dc2626" : status === "busy" ? "#ca8a04" : "#16a34a"};">
                  Durum: ${statusText}
                </strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">İstasyon ID</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: right;">${stationId}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Operatör</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: right;">${operator || "Bilinmiyor"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Adres</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: right;">${address || "Belirtilmemiş"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #64748b;">Koordinatlar</td>
                  <td style="padding: 12px 0; color: #1e293b; text-align: right;">${lat}, ${lng}</td>
                </tr>
              </table>
              
              ${comment ? `
                <div style="margin-top: 20px; padding: 16px; background: #f1f5f9; border-radius: 8px;">
                  <strong style="color: #475569;">Kullanıcı Yorumu:</strong>
                  <p style="color: #1e293b; margin: 8px 0 0 0;">${comment}</p>
                </div>
              ` : ""}
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="${googleMapsUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold;">
                  📍 Haritada Görüntüle
                </a>
              </div>
            </div>
            
            <p style="text-align: center; color: #94a3b8; font-size: 14px; margin-top: 24px;">
              Bu bildirim OutaCharge kullanıcıları tarafından gönderilmiştir.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Email error:", error);
      return NextResponse.json({ error: "Email gönderilemedi" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}