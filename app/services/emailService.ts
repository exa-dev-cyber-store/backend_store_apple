/**
 * Email Service for Transactional Emails (Password Reset, Verification, Notifications)
 * Integrates with Resend API with fallback to console logging in development.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
  token: string;
}

export interface PaymentReceiptEmailParams {
  order: any;
  user: {
    name?: string;
    email: string;
  };
  invoice?: any;
}

export class EmailService {
  private static resendApiKey = process.env.RESEND_API_KEY || '';
  private static defaultFrom = process.env.RESEND_FROM_EMAIL || 'Cyber Store <noreply@resend.dev>';

  /**
   * Format Rupiah currency
   */
  private static formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Send an email via Resend API or console fallback
   */
  public static async sendEmail({ to, subject, html, from }: SendEmailParams): Promise<{ success: boolean; id?: string; note?: string }> {
    const fromAddress = from || this.defaultFrom;
    const apiKey = process.env.RESEND_API_KEY || this.resendApiKey;
    const isAppleRelay = to.toLowerCase().endsWith('@privaterelay.appleid.com');

    console.log(`[EmailService] Preparing email to ${to} (Apple Relay: ${isAppleRelay})`);

    // If Resend API Key is available, make HTTP request to Resend API
    if (apiKey && apiKey.trim() !== '') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to.trim()],
            subject,
            html,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error('[EmailService] Resend API Error:', data);
          // Return non-fatal note so flow still continues
          return { success: false, note: data?.message || 'Resend delivery rejected' };
        }

        console.log(`[EmailService] Email sent successfully via Resend to ${to}. Email ID:`, data?.id);
        return { success: true, id: data?.id };
      } catch (err: any) {
        console.error('[EmailService] Network exception while sending email:', err.message);
        return { success: false, note: err.message };
      }
    }

    // Fallback in dev/local mode when RESEND_API_KEY is not configured
    console.log('================================================================');
    console.log(`📬 [DEV EMAIL SIMULATOR] TO: ${to}`);
    console.log(`📌 SUBJECT: ${subject}`);
    console.log(`ℹ️  NOTE: Configure RESEND_API_KEY in .env to deliver real emails.`);
    console.log('================================================================');

    return {
      success: true,
      note: 'Simulated dev dispatch. Configure RESEND_API_KEY in .env for live inbox delivery.',
    };
  }

  /**
   * Send Password Reset Email with Apple Store styling
   */
  public static async sendPasswordResetEmail({ to, name, resetUrl, token }: PasswordResetEmailParams): Promise<boolean> {
    const isAppleRelay = to.toLowerCase().endsWith('@privaterelay.appleid.com');
    const recipientDisplayName = name || 'Customer';

    console.log('================================================================');
    console.log(`🔑 [PASSWORD RESET TOKEN] User: ${to}`);
    console.log(`🔗 RESET LINK: ${resetUrl}`);
    console.log(`🎫 TOKEN: ${token}`);
    console.log('================================================================');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Cyber Store Account Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f1115;
            margin: 0;
            padding: 32px 16px;
            color: #f5f5f7;
          }
          .container {
            max-width: 540px;
            margin: 0 auto;
            background: #181b22;
            border: 1px solid #282d37;
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
          .logo-area {
            text-align: center;
            margin-bottom: 28px;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
          }
          .logo span {
            color: #0071e3;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            color: #ffffff;
            margin: 0 0 12px 0;
            letter-spacing: -0.3px;
          }
          .subtitle {
            font-size: 14px;
            line-height: 1.6;
            color: #86868b;
            text-align: center;
            margin-bottom: 28px;
          }
          .relay-notice {
            background: rgba(88, 86, 214, 0.12);
            border: 1px solid rgba(88, 86, 214, 0.3);
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 12px;
            color: #a5a3ff;
            margin-bottom: 24px;
            text-align: center;
          }
          .btn-container {
            text-align: center;
            margin: 32px 0;
          }
          .btn {
            display: inline-block;
            background: #0071e3;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            padding: 14px 32px;
            border-radius: 9999px;
            box-shadow: 0 4px 14px rgba(0, 113, 227, 0.4);
          }
          .footer {
            border-top: 1px solid #232731;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #636366;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-area">
            <div class="logo">Cyber<span>.</span> Apple</div>
          </div>
          <h1 class="title">Password Reset Request</h1>
          <p class="subtitle">
            Hello <strong>${recipientDisplayName}</strong>, we received a request to reset the password for your Cyber Store account.
          </p>

          ${isAppleRelay
        ? `<div class="relay-notice">
                  🍏 <strong>Apple Private Relay Active</strong>: This email is routed to your iCloud inbox securely via the Apple ID relay system.
                </div>`
        : ''
      }

          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
          </div>

          <div class="footer">
            <p>This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
            <p>© ${new Date().getFullYear()} Cyber Apple Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.sendEmail({
      to,
      subject: 'Reset Your Cyber Store Account Password',
      html,
    });

    return result.success;
  }

  /**
   * Send 6-digit Email Verification Code for User Onboarding
   */
  public static async sendVerificationCodeEmail({ to, name, code }: { to: string; name: string; code: string }): Promise<boolean> {
    const recipientDisplayName = name || 'Customer';

    console.log('================================================================');
    console.log(`✉️ [EMAIL VERIFICATION CODE] User: ${to}`);
    console.log(`🔑 6-DIGIT CODE: ${code}`);
    console.log('================================================================');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Cyber Store Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #080b11;
            margin: 0;
            padding: 32px 16px;
            color: #f5f5f7;
          }
          .container {
            max-width: 520px;
            margin: 0 auto;
            background: #0f141f;
            border: 1px solid #1e2638;
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          .logo-area {
            text-align: center;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
            display: inline-block;
          }
          .logo span {
            color: #06b6d4;
          }
          .badge {
            display: inline-block;
            background: rgba(6, 182, 212, 0.12);
            border: 1px solid rgba(6, 182, 212, 0.3);
            color: #06b6d4;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 4px 12px;
            border-radius: 100px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 12px;
            text-align: center;
          }
          .subtitle {
            font-size: 14px;
            line-height: 1.6;
            color: #94a3b8;
            margin: 0 0 28px;
            text-align: center;
          }
          .code-box {
            background: #050811;
            border: 1.5px dashed #06b6d4;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            margin: 0 0 28px;
          }
          .code-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .code-value {
            font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #06b6d4;
            text-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
          }
          .expiry-notice {
            font-size: 12px;
            color: #cbd5e1;
            text-align: center;
            margin-bottom: 24px;
          }
          .expiry-notice strong {
            color: #38bdf8;
          }
          .footer {
            border-top: 1px solid #1e2638;
            padding-top: 24px;
            font-size: 11px;
            color: #64748b;
            text-align: center;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-area">
            <div class="badge">Email Verification</div>
            <div class="logo">Cyber<span>.</span> Apple Store</div>
          </div>
          <h1 class="title">Verify Your Email Address</h1>
          <p class="subtitle">
            Hello <strong>${recipientDisplayName}</strong>, welcome to Cyber! Please enter the following 6-digit verification code to complete your registration.
          </p>

          <div class="code-box">
            <div class="code-label">Verification Code</div>
            <div class="code-value">${code}</div>
          </div>

          <p class="expiry-notice">
            ⏱️ This code is valid for <strong>15 minutes</strong>. Never share this code with anyone.
          </p>

          <div class="footer">
            <p>If you did not sign up for a Cyber Store account, please ignore this email.</p>
            <p>© ${new Date().getFullYear()} Cyber Apple Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.sendEmail({
      to,
      subject: `${code} is your Cyber Store verification code`,
      html,
    });

    return result.success;
  }

  /**
   * Send Official Tax Invoice & Payment Receipt Email matching frontend invoice design
   */
  public static async sendPaymentReceiptEmail({ order, user, invoice }: PaymentReceiptEmailParams): Promise<boolean> {
    if (!order || !user || !user.email) {
      console.warn('[EmailService] Cannot send receipt: missing order or user email');
      return false;
    }

    const recipientEmail = user.email.trim();
    const recipientName = user.name || order.delivery_address?.name || 'Valued Customer';
    const isAppleRelay = recipientEmail.toLowerCase().endsWith('@privaterelay.appleid.com');

    const orderIdStr = String(order._id || '');
    const invoiceNumber = `INV-${(invoice?._id ? String(invoice._id) : orderIdStr).slice(-8).toUpperCase()}`;
    const orderRefNumber = `ORD-${orderIdStr.slice(-8).toUpperCase()}`;

    const webUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    const invoiceUrl = `${webUrl}/account/order/${orderIdStr}`;

    const orderDate = new Date(order.createdAt || Date.now());
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = orderDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const items = order.order_items || [];
    const totalQty = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);

    const subTotalAmount =
      order.subTotal ||
      items.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.quantity || 1)), 0);

    const taxAmount = order.tax || 0;
    const shippingAmount = order.shipping || 0;
    const discountAmount = order.discount || 0;
    const totalAmount = order.total || (subTotalAmount + taxAmount + shippingAmount - discountAmount);

    // Format payment method text
    let paymentMethodDisplay = 'Midtrans Online Payment';
    const rawPm = (order.payment_method || invoice?.payment_method || '').toLowerCase();
    if (rawPm.includes('qris')) paymentMethodDisplay = 'QRIS (GoPay / OVO / ShopeePay / BCA)';
    else if (rawPm.includes('bca')) paymentMethodDisplay = 'BCA Virtual Account';
    else if (rawPm.includes('bni')) paymentMethodDisplay = 'BNI Virtual Account';
    else if (rawPm.includes('bri')) paymentMethodDisplay = 'BRI Virtual Account';
    else if (rawPm.includes('mandiri') || rawPm.includes('echannel')) paymentMethodDisplay = 'Mandiri Bill Payment';
    else if (rawPm.includes('permata')) paymentMethodDisplay = 'Permata Virtual Account';
    else if (rawPm.includes('gopay')) paymentMethodDisplay = 'GoPay Direct Charge';
    else if (rawPm.includes('cstore') || rawPm.includes('indomaret')) paymentMethodDisplay = 'Retail Store (Indomaret / Alfamart)';
    else if (rawPm) paymentMethodDisplay = rawPm.toUpperCase();

    const deliveryAddr = order.delivery_address || {};

    const itemsHtml = items.map((item: any, idx: number) => {
      const lineTotal = (item.price || 0) * (item.quantity || 1);
      const sku = String(item._id?._id || item._id || '').slice(-8).toUpperCase();
      return `
        <tr style="border-bottom: 1px solid #232731;">
          <td style="padding: 16px 8px; vertical-align: top; font-family: monospace; color: #86868b; font-size: 12px; width: 28px;">
            ${idx + 1}.
          </td>
          <td style="padding: 16px 12px; vertical-align: top;">
            <div style="font-weight: 700; color: #ffffff; font-size: 13px; line-height: 1.4;">
              ${item.name || 'Apple Product'}
            </div>
            <div style="font-size: 11px; color: #0071e3; margin-top: 2px;">
              Official Apple 1-Year Warranty (AASP Certified)
            </div>
            ${sku ? `<div style="font-size: 10px; color: #636366; font-family: monospace; margin-top: 2px;">SKU: ${sku}</div>` : ''}
          </td>
          <td style="padding: 16px 12px; vertical-align: top; text-align: center; color: #f5f5f7; font-size: 13px; font-weight: 600;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 16px 12px; vertical-align: top; text-align: right; color: #86868b; font-size: 12px; font-family: monospace;">
            ${this.formatRupiah(item.price || 0)}
          </td>
          <td style="padding: 16px 8px; vertical-align: top; text-align: right; color: #ffffff; font-size: 13px; font-weight: 700; font-family: monospace;">
            ${this.formatRupiah(lineTotal)}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt: ${orderRefNumber}</title>
      </head>
      <body style="margin: 0; padding: 32px 16px; background-color: #0f1115; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f7;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <div style="max-width: 620px; margin: 0 auto; background: #181b22; border: 1px solid #282d37; border-radius: 24px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); text-align: left;">
                
                <!-- 1. Header: Branding & Legal Information -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 2px solid #2d3340; padding-bottom: 24px;">
                  <tr>
                    <td valign="top" style="vertical-align: top;">
                      <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                        CYBER STORE
                      </div>
                      <div style="font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #0071e3; text-transform: uppercase; margin-top: 2px;">
                        Authorized Premium Apple Reseller
                      </div>
                      <div style="font-size: 11px; color: #86868b; line-height: 1.5; margin-top: 8px;">
                        <strong>PT Cyber Store Indonesia</strong><br>
                        Menara Cyber Lt. 18, Jl. HR Rasuna Said Blok X-5<br>
                        South Jakarta 12950, Indonesia<br>
                        Tax ID (NPWP): 01.345.678.9-012.000<br>
                        Support: cs@cyberstore.id | (021) 5088-8888
                      </div>
                    </td>
                    <td align="right" valign="top" style="vertical-align: top; text-align: right;">
                      <span style="display: inline-block; background: rgba(52, 199, 89, 0.15); border: 1px solid rgba(52, 199, 89, 0.4); color: #34c759; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 5px 14px; border-radius: 9999px; margin-bottom: 12px;">
                        ✓ PAID
                      </span>
                      <div style="font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: #86868b; text-transform: uppercase;">
                        OFFICIAL RECEIPT
                      </div>
                      <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 4px; font-family: monospace;">
                        ${invoiceNumber}
                      </div>
                      <div style="font-size: 11px; color: #86868b; margin-top: 2px;">
                        Ref: <span style="color: #f5f5f7; font-family: monospace;">${orderRefNumber}</span>
                      </div>
                      <div style="font-size: 11px; color: #86868b; margin-top: 2px;">
                        ${formattedDate}
                      </div>
                    </td>
                  </tr>
                </table>

                ${isAppleRelay
        ? `<div style="background: rgba(88, 86, 214, 0.12); border: 1px solid rgba(88, 86, 214, 0.3); border-radius: 12px; padding: 10px 16px; font-size: 12px; color: #a5a3ff; margin-top: 20px; text-align: center;">
                        🍏 <strong>Apple Private Relay Delivery</strong>: Receipt securely delivered to your Apple ID associated inbox.
                      </div>`
        : ''
      }

                <!-- 2. Customer & Shipping Details (2 Columns) -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; margin-bottom: 24px;">
                  <tr>
                    <td width="48%" valign="top" style="background: #101216; border: 1px solid #282d37; border-radius: 16px; padding: 18px; vertical-align: top;">
                      <div style="font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #86868b; margin-bottom: 6px;">
                        BILLED TO
                      </div>
                      <div style="font-size: 14px; font-weight: 700; color: #ffffff;">
                        ${recipientName}
                      </div>
                      <div style="font-size: 11px; font-family: monospace; color: #86868b; margin-top: 2px;">
                        ${recipientEmail}
                      </div>
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #86868b; margin-top: 14px;">
                        Payment Method
                      </div>
                      <div style="font-size: 12px; font-weight: 600; color: #34c759; margin-top: 2px;">
                        ${paymentMethodDisplay}
                      </div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" valign="top" style="background: #101216; border: 1px solid #282d37; border-radius: 16px; padding: 18px; vertical-align: top;">
                      <div style="font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #86868b; margin-bottom: 6px;">
                        SHIP TO
                      </div>
                      <div style="font-size: 14px; font-weight: 700; color: #ffffff;">
                        ${deliveryAddr.name || recipientName}
                      </div>
                      <div style="font-size: 11px; color: #86868b; line-height: 1.5; margin-top: 2px;">
                        ${deliveryAddr.detail ? `${deliveryAddr.detail}, ` : ''}
                        ${deliveryAddr.kelurahan ? `${deliveryAddr.kelurahan}, ` : ''}
                        ${deliveryAddr.kecamatan ? `${deliveryAddr.kecamatan}, ` : ''}
                        ${deliveryAddr.kabupaten ? `${deliveryAddr.kabupaten}, ` : ''}
                        ${deliveryAddr.provinsi || 'Registered Address'}
                      </div>
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #86868b; margin-top: 10px;">
                        Shipping Carrier
                      </div>
                      <div style="font-size: 11px; font-weight: 600; color: #2997ff; margin-top: 2px;">
                        Cyber Express Insured
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 3. Itemized Products Table -->
                <div style="margin-top: 24px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid #282d37; text-align: left;">
                        <th style="padding: 10px 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #86868b; letter-spacing: 1px;">No.</th>
                        <th style="padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #86868b; letter-spacing: 1px;">Item Description</th>
                        <th style="padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #86868b; letter-spacing: 1px; text-align: center;">Qty</th>
                        <th style="padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #86868b; letter-spacing: 1px; text-align: right;">Unit Price</th>
                        <th style="padding: 10px 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #86868b; letter-spacing: 1px; text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </div>

                <!-- 4. Totals Breakdown -->
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #282d37;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #86868b;">
                    <tr>
                      <td align="left">Product Subtotal (${totalQty} ${totalQty === 1 ? 'item' : 'items'})</td>
                      <td align="right" style="font-family: monospace; color: #ffffff; font-weight: 600;">
                        ${this.formatRupiah(subTotalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td align="left">VAT / Tax (5%)</td>
                      <td align="right" style="font-family: monospace; color: #86868b;">
                        ${taxAmount > 0 ? this.formatRupiah(taxAmount) : 'Included'}
                      </td>
                    </tr>
                    <tr>
                      <td align="left">Shipping & Full Transit Insurance</td>
                      <td align="right" style="font-family: monospace; color: #86868b;">
                        ${shippingAmount === 0 ? 'FREE' : this.formatRupiah(shippingAmount)}
                      </td>
                    </tr>
                    ${discountAmount > 0
        ? `<tr>
                            <td align="left" style="color: #34c759; font-weight: 600;">Cyber Store Promo Discount</td>
                            <td align="right" style="font-family: monospace; color: #34c759; font-weight: 600;">
                              -${this.formatRupiah(discountAmount)}
                            </td>
                          </tr>`
        : ''
      }
                    <tr>
                      <td colspan="2" style="padding-top: 12px; border-bottom: 1px solid #282d37;"></td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size: 16px; font-weight: 800; color: #ffffff; padding-top: 12px;">
                        Total Amount Paid
                      </td>
                      <td align="right" style="font-size: 18px; font-weight: 800; color: #ffffff; font-family: monospace; padding-top: 12px;">
                        ${this.formatRupiah(totalAmount)}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- 5. Action Button & Tracking -->
                <div style="text-align: center; margin-top: 36px; margin-bottom: 24px;">
                  <a href="${invoiceUrl}" target="_blank" style="display: inline-block; background: #0071e3; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0, 113, 227, 0.4);">
                    View Official Invoice & Track Order
                  </a>
                </div>

                <!-- 6. Legal Guarantee & Footer -->
                <div style="border-top: 1px solid #232731; padding-top: 20px; font-size: 11px; color: #636366; line-height: 1.6; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #86868b;">
                    🛡️ <strong>Authenticity Guarantee & Official Warranty:</strong> This electronic invoice serves as official proof of purchase recognized by all Apple Authorized Service Providers (iBox, Digimap, Story-i, MitraCare) across Indonesia.
                  </p>
                  <p style="margin: 0 0 8px 0;">
                    Issued electronically by PT Cyber Store Indonesia ERP system. Valid and legally binding without a physical signature or wet stamp.
                  </p>
                  <p style="margin: 0;">
                    © ${new Date().getFullYear()} Cyber Store Indonesia. All rights reserved.
                  </p>
                </div>

              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: recipientEmail,
      subject: `Payment Receipt: Order #${orderIdStr.slice(-6).toUpperCase()} [${invoiceNumber}]`,
      html,
    });

    return result.success;
  }
}
