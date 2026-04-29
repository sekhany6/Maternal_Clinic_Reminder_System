const paymentForm = document.getElementById("paymentForm");
const paymentPhone = document.getElementById("paymentPhone");
const paymentAmount = document.getElementById("paymentAmount");
const paymentSubmit = document.getElementById("paymentSubmit");
const paymentAlert = document.getElementById("paymentAlert");
const paymentStatusTitle = document.getElementById("paymentStatusTitle");
const paymentStatusText = document.getElementById("paymentStatusText");
const paymentReference = document.getElementById("paymentReference");

const showPaymentAlert = (message, type = "success") => {
    const className = type === "error" ? "alert error" : "alert success";
    paymentAlert.innerHTML = `<div class="${className}">${message}</div>`;
};

const setPaymentStatus = (title, text, reference = "") => {
    paymentStatusTitle.textContent = title;
    paymentStatusText.textContent = text;
    paymentReference.textContent = reference;
    paymentReference.classList.toggle("hidden", !reference);
};

const normalizePaymentPhone = (phone) => phone.replace(/[\s-]/g, "");
const kenyanMobilePattern = /^(\+?254[71]\d{8}|0[71]\d{8})$/;

if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const phone = normalizePaymentPhone(paymentPhone.value);
        const amount = Number(paymentAmount.value);

        if (!kenyanMobilePattern.test(phone)) {
            showPaymentAlert("Enter a valid phone number, for example 0712345678 or 0112345678.", "error");
            return;
        }

        if (!Number.isFinite(amount) || amount < 1) {
            showPaymentAlert("Enter a valid amount of at least KES 1.", "error");
            return;
        }

        paymentSubmit.disabled = true;
        paymentSubmit.textContent = "Sending...";
        showPaymentAlert("Sending the payment request to M-Pesa...");
        setPaymentStatus("Waiting for M-Pesa", "The request is being sent. Keep the client on this screen until their phone prompt appears.");

        try {
            const response = await fetch("/api/payments/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, amount })
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Payment request failed.");
            }

            const reference = result.checkoutRequestId
                ? `Checkout reference: ${result.checkoutRequestId}`
                : "";

            showPaymentAlert(result.customerMessage || result.message || "Payment request sent successfully.");
            setPaymentStatus("Request sent", "Ask the client to enter their M-Pesa PIN to complete the payment.", reference);
        } catch (error) {
            showPaymentAlert(error.message, "error");
            setPaymentStatus("Request failed", "Check the phone number, amount, and server M-Pesa credentials, then try again.");
        } finally {
            paymentSubmit.disabled = false;
            paymentSubmit.textContent = "Send STK push";
        }
    });

    paymentForm.addEventListener("reset", () => {
        paymentAlert.innerHTML = "";
        setPaymentStatus("Ready for checkout", "Enter the client's number and amount, then send the request while they have their phone nearby.");
    });
}
