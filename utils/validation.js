// Password Validation
// Requirements: 8 characters (min and max), must include digit, special character, and capital letter
const validatePassword = (password) => {
    if (!password) {
        return { valid: false, error: "Password is required" };
    }

    if (password.length !== 8) {
        return { valid: false, error: "Password must be exactly 8 characters long" };
    }

    const hasDigit = /\d/.test(password);
    if (!hasDigit) {
        return { valid: false, error: "Password must include at least one digit (0-9)" };
    }

    const hasCapitalLetter = /[A-Z]/.test(password);
    if (!hasCapitalLetter) {
        return { valid: false, error: "Password must include at least one capital letter (A-Z)" };
    }

    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasSpecialChar) {
        return { valid: false, error: "Password must include at least one special character (!@#$%^&*)" };
    }

    return { valid: true };
};

// Email Validation
// Only accepts @gmail.com addresses
// No dots allowed in email address
const validateEmail = (email) => {
    if (!email) {
        return { valid: false, error: "Email is required" };
    }

    const gmailRegex = /^[a-zA-Z0-9_-]+@gmail\.com$/;

    if (!gmailRegex.test(email)) {
        return { 
            valid: false, 
            error: "Email must be a valid Gmail address (e.g., user@gmail.com)" 
        };
    }

    return { valid: true };
};

module.exports = {
    validatePassword,
    validateEmail
};
