const SMS_BASE_URL = "https://sms.textsms.co.ke/api/services";
const DLR_MAX_ATTEMPTS = 3;
const DLR_RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const parseJsonSafely = async (response) => {
    const rawText = await response.text();

    try {
        return rawText ? JSON.parse(rawText) : {};
    } catch (error) {
        throw new Error(`TextSMS returned invalid JSON: ${rawText || "empty response"}`);
    }
};

const getProviderResponse = (result) => {
    if (Array.isArray(result?.responses) && result.responses.length > 0) {
        return result.responses[0];
    }

    if (result?.response && typeof result.response === "object") {
        return result.response;
    }

    return result;
};

const getResponseCode = (payload) => {
    const value = payload?.["response-code"]
        ?? payload?.respose_code
        ?? payload?.["respose-code"]
        ?? payload?.response_code
        ?? payload?.code
        ?? payload?.status;

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
};

const getResponseDescription = (payload) => {
    return payload?.["response-description"]
        ?? payload?.response_description
        ?? payload?.description
        ?? payload?.message
        ?? payload?.statusDescription
        ?? payload?.status_description
        ?? "";
};

const collectTextValues = (value, values = []) => {
    if (value == null) {
        return values;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        values.push(String(value));
        return values;
    }

    if (Array.isArray(value)) {
        value.forEach(item => collectTextValues(item, values));
        return values;
    }

    if (typeof value === "object") {
        Object.values(value).forEach(item => collectTextValues(item, values));
    }

    return values;
};

const normalizeDeliveryStatus = (payload) => {
    const code = getResponseCode(payload);
    const description = getResponseDescription(payload);
    const searchableText = collectTextValues(payload).join(" ").toLowerCase();

    if (code === 1008) {
        return {
            final: false,
            delivered: false,
            state: "pending",
            code,
            description: description || "Delivery report not available yet."
        };
    }

    if (
        searchableText.includes("undelivered")
        || searchableText.includes("not delivered")
        || searchableText.includes("failed")
        || searchableText.includes("rejected")
        || searchableText.includes("expired")
    ) {
        return {
            final: true,
            delivered: false,
            state: "failed",
            code,
            description: description || "SMS was sent to the gateway but was not delivered to the mother's phone."
        };
    }

    if (searchableText.includes("delivered")) {
        return {
            final: true,
            delivered: true,
            state: "delivered",
            code,
            description: description || "SMS delivered successfully."
        };
    }

    return {
        final: false,
        delivered: false,
        state: "pending",
        code,
        description: description || "SMS was accepted by the gateway, but delivery is still pending confirmation."
    };
};

const callTextSms = async (endpoint, body) => {
    const response = await fetch(`${SMS_BASE_URL}/${endpoint}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    return parseJsonSafely(response);
};

const sendSMS = async (phone, message) => {
    try {
        const result = await callTextSms("sendsms", {
            apikey: process.env.TEXTSMS_API_KEY,
            partnerID: process.env.TEXTSMS_PARTNER_ID,
            message,
            shortcode: process.env.TEXTSMS_SHORTCODE,
            mobile: phone
        });

        const providerResponse = getProviderResponse(result);
        const responseCode = getResponseCode(providerResponse);
        const responseDescription = getResponseDescription(providerResponse);
        const messageId = providerResponse?.messageid ?? providerResponse?.messageID ?? null;

        console.log("SMS Result:", JSON.stringify(result, null, 2));

        if (responseCode !== 200) {
            throw new Error(`SMS rejected: ${responseDescription || "Unknown provider error"}`);
        }

        return {
            accepted: true,
            messageId,
            responseCode,
            responseDescription: responseDescription || "Accepted by SMS gateway",
            raw: result
        };
    } catch (error) {
        console.error("SMS failed:", error.message);
        throw error;
    }
};

const getDeliveryReport = async (messageId) => {
    const result = await callTextSms("getdlr", {
        apikey: process.env.TEXTSMS_API_KEY,
        partnerID: process.env.TEXTSMS_PARTNER_ID,
        messageID: messageId
    });

    const providerResponse = getProviderResponse(result);
    const status = normalizeDeliveryStatus(providerResponse);

    return {
        messageId,
        ...status,
        checkedAt: new Date().toISOString(),
        raw: result
    };
};

const buildDeliverySnapshot = (trackingResult) => {
    const delivery = trackingResult.delivery || {};
    const messageId = trackingResult.messageId || delivery.messageId || null;
    const deliveryState = delivery.state || "pending";
    const providerDescription = delivery.description
        || trackingResult.responseDescription
        || "No provider description available.";
    const statusLabel = deliveryState === "delivered"
        ? "Delivered"
        : deliveryState === "failed"
            ? "Not delivered"
            : "Delivery pending";
    const messageStatus = `${statusLabel}: ${providerDescription}${messageId ? ` [Message ID: ${messageId}]` : ""}`;

    return {
        messageId,
        deliveryState,
        providerDescription,
        messageStatus,
        lastCheckedAt: delivery.checkedAt || new Date().toISOString()
    };
};

const logDeliveryReport = (contextLabel, trackingResult) => {
    const snapshot = buildDeliverySnapshot(trackingResult);
    const providerCode = trackingResult.delivery?.code ?? trackingResult.responseCode ?? "n/a";

    console.log(`[TextSMS] ${contextLabel}`);
    console.log(`  Message ID: ${snapshot.messageId || "not returned"}`);
    console.log(`  Delivery state: ${snapshot.deliveryState}`);
    console.log(`  Provider code: ${providerCode}`);
    console.log(`  Provider description: ${snapshot.providerDescription}`);
    console.log(`  Last checked: ${snapshot.lastCheckedAt}`);
};

const sendAndTrackSMS = async (phone, message) => {
    const sendResult = await sendSMS(phone, message);

    if (!sendResult.messageId) {
        return {
            ...sendResult,
            delivery: {
                final: false,
                delivered: false,
                state: "pending",
                description: "SMS was accepted by the gateway, but no message ID was returned for delivery tracking."
            }
        };
    }

    let latestDelivery = {
        final: false,
        delivered: false,
        state: "pending",
        description: "SMS was accepted by the gateway, but delivery is still pending confirmation."
    };

    for (let attempt = 1; attempt <= DLR_MAX_ATTEMPTS; attempt++) {
        latestDelivery = await getDeliveryReport(sendResult.messageId);

        if (latestDelivery.final) {
            break;
        }

        if (attempt < DLR_MAX_ATTEMPTS) {
            await sleep(DLR_RETRY_DELAY_MS);
        }
    }

    return {
        ...sendResult,
        delivery: latestDelivery
    };
};

module.exports = {
    buildDeliverySnapshot,
    sendSMS,
    getDeliveryReport,
    logDeliveryReport,
    sendAndTrackSMS
};
