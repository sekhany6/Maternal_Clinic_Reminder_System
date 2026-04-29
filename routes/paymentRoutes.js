const express = require("express");
const router = express.Router();
const { stkPush } = require("../utils/mpesa");

const normalizePhone = (phone) => String(phone || "").replace(/[\s().-]/g, "");
const kenyanMobilePattern = /^(\+?254[71]\d{8}|0[71]\d{8})$/;

router.post("/stk-push", async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const amount = Number(req.body.amount);

    if (!phone || !kenyanMobilePattern.test(phone)) {
        return res.status(400).json({
            error: "Enter a valid phone number, for example 0712345678 or 0112345678."
        });
    }

    if (!Number.isFinite(amount) || amount < 1) {
        return res.status(400).json({
            error: "Enter a valid amount of at least KES 1."
        });
    }

    try {
        const result = await stkPush(phone, Math.round(amount));

        res.json({
            message: "Payment request sent. Ask the client to enter their M-Pesa PIN.",
            checkoutRequestId: result.CheckoutRequestID,
            merchantRequestId: result.MerchantRequestID,
            responseCode: result.ResponseCode,
            responseDescription: result.ResponseDescription,
            customerMessage: result.CustomerMessage
        });
    } catch (error) {
        const responseError = error.response?.data;
        const errorMessage = responseError?.errorMessage
            || responseError?.ResponseDescription
            || responseError?.CustomerMessage
            || error.message
            || "Unable to send the payment request right now.";

        console.error("M-Pesa STK push error:", responseError || error.message);
        res.status(500).json({ error: errorMessage });
    }
});

router.post("/callback", (req, res) => {
    console.log("M-Pesa callback:", JSON.stringify(req.body, null, 2));
    res.json({ received: true });
});

module.exports = router;
