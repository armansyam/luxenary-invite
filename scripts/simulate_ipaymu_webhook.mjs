import crypto from "crypto";
import fetch from "node-fetch"; // Next.js 14 environment usually supports global fetch, but we'll use a standard script

// Ganti dengan konfigurasi Anda
const IPAYMU_VA = process.env.IPAYMU_VA || "0000000000000000"; // Sesuaikan dengan VA iPaymu Anda di .env
const IPAYMU_API_KEY = process.env.IPAYMU_API_KEY || "your_ipaymu_api_key"; // Sesuaikan dengan API Key Anda di .env
const TARGET_URL = "http://localhost:3000/api/webhook/ipaymu"; // URL Webhook lokal Anda

// Ganti dengan Order ID yang sedang PENDING di database Anda (cek di table Order)
const TARGET_ORDER_ID = "INV-LUX-YOUR-ORDER-ID-HERE"; 

async function simulateWebhook() {
  console.log(`Mengirim simulasi webhook iPaymu ke ${TARGET_URL}...`);

  // Payload iPaymu
  const payload = {
    trx_id: "100200300",
    status: "berhasil",
    status_code: 1, // 1 = PAID
    sid: "69E1F03C-F7B6-4A0B-9B94-73CC8B9DE9A5",
    reference_id: TARGET_ORDER_ID, // Harus sama persis dengan Order ID di DB
  };

  const rawBody = JSON.stringify(payload);
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/-/g, '').replace(/:/g, '').replace(/ /g, ''); // Format YYYYMMDDHHmmss
  
  // Buat Signature HMAC
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex").toLowerCase();
  const toSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}:${timestamp}`;
  const signature = crypto.createHmac("sha256", IPAYMU_API_KEY).update(toSign).digest("hex");

  try {
    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "signature": signature,
        "va": IPAYMU_VA,
        "timestamp": timestamp
      },
      body: rawBody
    });

    const responseText = await response.text();
    console.log(`\nStatus HTTP: ${response.status}`);
    console.log(`Response Webhook:`, responseText);
    
    if (response.status === 200) {
      console.log(`\n✅ SUKSES! Jika response adalah {"status":"ok"}, silakan cek database (tabel Order & WebhookLog). Status order ${TARGET_ORDER_ID} seharusnya sudah menjadi PAID.`);
    } else {
      console.log(`\n❌ GAGAL! Terjadi error. Pastikan VA dan API KEY di script ini sama persis dengan yang ada di .env aplikasi Anda.`);
    }

  } catch (error) {
    console.error("Gagal menghubungi server:", error);
  }
}

simulateWebhook();
