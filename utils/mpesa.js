const axios = require("axios");
require("dotenv").config();

// 1. Get OAuth token
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
  ).toString("base64");

  const res = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${auth}` },
      proxy: false,
      timeout: 20000
    }
  );

  return res.data.access_token;
}

// 2. Send STK Push
async function stkPush(phone, amount) {
  const token = await getAccessToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  const password = Buffer.from(
    `${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`
  ).toString("base64");

  // Format phone: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, or +2541XXXXXXXX.
  const formattedPhone = String(phone).replace(/\s|-/g, "").replace(/^\+/, "").replace(/^0/, "254");

  const res = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: process.env.SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: "TestPayment",
      TransactionDesc: "Payment",
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      proxy: false,
      timeout: 20000
    }
  );

  return res.data;
}

module.exports = { stkPush };
