import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientEmail, senderName, tripTitle, shareId } = req.body;

  if (!recipientEmail || !senderName || !tripTitle || !shareId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const acceptLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accept-trip-share?shareId=${shareId}`;

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"AI Travel Guide" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `🌍 ${senderName} shared a trip with you!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f5f7fa;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: white;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content { 
              padding: 40px 30px;
            }
            .trip-box { 
              background: #f8f9ff; 
              padding: 25px; 
              margin: 25px 0; 
              border-radius: 12px; 
              border-left: 5px solid #667eea;
            }
            .trip-box h2 {
              margin-top: 0; 
              color: #667eea;
              font-size: 22px;
            }
            .button { 
              display: inline-block; 
              padding: 16px 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white !important; 
              text-decoration: none; 
              border-radius: 10px; 
              font-weight: bold; 
              margin: 25px 0;
              font-size: 16px;
            }
            .features {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .features ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .features li {
              margin: 8px 0;
              color: #555;
            }
            .footer { 
              text-align: center; 
              color: #888; 
              font-size: 13px; 
              padding: 30px;
              border-top: 1px solid #e0e0e0;
            }
            .link-box {
              background: #f0f0f0;
              padding: 15px;
              border-radius: 6px;
              margin: 15px 0;
              word-break: break-all;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Trip Shared With You!</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 16px;">Hi there!</p>
              
              <p style="font-size: 16px;">
                <strong>${senderName}</strong> has shared their travel itinerary with you through AI Travel Guide.
              </p>
              
              <div class="trip-box">
                <h2>📍 ${tripTitle}</h2>
                <p style="color: #666; margin: 0;">
                  You've been invited to view this complete trip itinerary including activities, schedules, and personalized recommendations.
                </p>
              </div>

              <center>
                <a href="${acceptLink}" class="button">
                  👉 View & Accept Trip
                </a>
              </center>

              <div class="features">
                <p style="margin-top: 0;"><strong>Once you accept, you'll be able to:</strong></p>
                <ul>
                  <li>✅ View the complete day-by-day itinerary</li>
                  <li>✅ See all activities, locations, and timings</li>
                  <li>✅ Chat with our AI assistant about the trip</li>
                  <li>✅ Make your own modifications</li>
                  <li>✅ Access weather forecasts and recommendations</li>
                </ul>
              </div>

              <p style="color: #666; font-size: 14px;">
                <strong>Can't click the button?</strong> Copy and paste this link into your browser:
              </p>
              <div class="link-box">
                ${acceptLink}
              </div>

              <div class="footer">
                <p style="margin: 5px 0;"><strong>Best regards,</strong></p>
                <p style="margin: 5px 0;">AI Travel Guide Team 🌍</p>
                <p style="margin-top: 20px; color: #aaa;">
                  If you didn't expect this email, you can safely ignore it.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully to:', recipientEmail);
    console.log('Message ID:', info.messageId);
    
    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      recipient: recipientEmail 
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
}