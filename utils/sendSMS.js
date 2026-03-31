const sendSMS = async (phone, message) => {
    try {
        const response = await fetch("https://sms.textsms.co.ke/api/services/sendsms/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                apikey: process.env.TEXTSMS_API_KEY,
                partnerID: process.env.TEXTSMS_PARTNER_ID,
                message: message,
                shortcode: process.env.TEXTSMS_SHORTCODE,
                mobile: phone
            })
        });

        const result = await response.json();
        console.log("SMS Result:", JSON.stringify(result, null, 2));

        // Check response code
        const smsResponse = result?.responses?.[0];

        if (!smsResponse) {
            throw new Error("No response received from TextSMS");
        }

        if (smsResponse["response-code"] !== 200) {
            throw new Error(`SMS rejected: ${smsResponse["response-description"]}`);
        }

        return result;

    } catch (error) {
        console.error("SMS failed:", error.message);
        throw error;
    }
};

module.exports = sendSMS;