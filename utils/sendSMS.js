const africastalking = require("africastalking")({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME
});

const sms = africastalking.SMS;

const sendSMS = async (phone, message) => {
    try {
        const result = await sms.send({ 
            to: phone,
            message: message,
       });

     console.log("SMS Result:", JSON.stringify(result, null, 2));

         // ✅ Safely check if Recipients exists before accessing it
        const recipients = result?.SMSMessageData?.Recipients;

        if (!recipients || recipients.length === 0) {
            throw new Error(`No recipients in response: ${JSON.stringify(result)}`);
        }

        const recipient = recipients[0];

        if (recipient.status !== "Success") {
            throw new Error(`SMS rejected: ${recipient.status}`);
        }

        return result;

    } catch (error) {
        console.error("SMS failed:", error);
        throw error;
    }
};

module.exports = sendSMS;
