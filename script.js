const API_URL = "https://api.frankfurter.dev/v2";

const form = document.getElementById("converter-form");
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("from-currency");
const toSelect = document.getElementById("to-currency");
const swapButton = document.getElementById("swap-button");
const convertButton = document.getElementById("convert-button");
const statusMessage = document.getElementById("status-message");
const resultBox = document.getElementById("result");
const resultAmount = document.getElementById("result-amount");
const exchangeRate = document.getElementById("exchange-rate");
const rateDate = document.getElementById("rate-date");

const fallbackCurrencies = [
    { iso_code: "AUD", name: "Australian Dollar" },
    { iso_code: "CAD", name: "Canadian Dollar" },
    { iso_code: "CHF", name: "Swiss Franc" },
    { iso_code: "CNY", name: "Chinese Yuan" },
    { iso_code: "EUR", name: "Euro" },
    { iso_code: "GBP", name: "British Pound" },
    { iso_code: "HKD", name: "Hong Kong Dollar" },
    { iso_code: "IDR", name: "Indonesian Rupiah" },
    { iso_code: "INR", name: "Indian Rupee" },
    { iso_code: "JPY", name: "Japanese Yen" },
    { iso_code: "KRW", name: "South Korean Won" },
    { iso_code: "PHP", name: "Philippine Peso" },
    { iso_code: "SGD", name: "Singapore Dollar" },
    { iso_code: "THB", name: "Thai Baht" },
    { iso_code: "USD", name: "US Dollar" }
];

function showMessage(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";

    if (type) {
        statusMessage.classList.add(type);
    }
}

function formatMoney(amount, currency) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency
        }).format(amount);
    } catch (error) {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

function populateCurrencies(currencies) {
    const sortedCurrencies = [...currencies].sort((a, b) =>
        a.iso_code.localeCompare(b.iso_code)
    );

    fromSelect.replaceChildren();
    toSelect.replaceChildren();

    sortedCurrencies.forEach(currency => {
        const label = `${currency.iso_code} - ${currency.name}`;

        const fromOption = new Option(label, currency.iso_code);
        const toOption = new Option(label, currency.iso_code);

        fromSelect.add(fromOption);
        toSelect.add(toOption);
    });

    fromSelect.value = "USD";
    toSelect.value = "PHP";
}

async function loadCurrencies() {
    try {
        const response = await fetch(`${API_URL}/currencies`);

        if (!response.ok) {
            throw new Error("Could not load currencies.");
        }

        const currencies = await response.json();

        if (!Array.isArray(currencies) || currencies.length === 0) {
            throw new Error("The currency list is empty.");
        }

        const validCurrencies = currencies.filter(currency =>
            /^[A-Z]{3}$/.test(currency.iso_code) &&
            currency.name
        );

        if (validCurrencies.length === 0) {
            throw new Error("No valid currencies were returned.");
        }

        populateCurrencies(validCurrencies);
        return true;
    } catch (error) {
        populateCurrencies(fallbackCurrencies);
        showMessage(
            "Could not load all currencies. Using the available backup list.",
            "error"
        );
        return false;
    }
}

async function convertCurrency() {
    const amount = Number(amountInput.value);
    const fromCurrency = fromSelect.value;
    const toCurrency = toSelect.value;

    if (
        amountInput.value.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        resultBox.hidden = true;
        showMessage("Please enter an amount greater than zero.", "error");
        amountInput.focus();
        return;
    }

    if (!fromCurrency || !toCurrency) {
        resultBox.hidden = true;
        showMessage("Please select both currencies.", "error");
        return;
    }

    convertButton.disabled = true;
    convertButton.textContent = "Converting...";
    resultBox.hidden = true;
    showMessage("Getting the latest available exchange rate...");

    try {
        let rate;
        let date = new Date().toISOString().slice(0, 10);

        if (fromCurrency === toCurrency) {
            rate = 1;
        } else {
            const url =
                `${API_URL}/rate/${encodeURIComponent(fromCurrency)}` +
                `/${encodeURIComponent(toCurrency)}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    "Could not fetch the exchange rate. Please try again."
                );
            }

            const data = await response.json();

            if (
                typeof data.rate !== "number" ||
                !Number.isFinite(data.rate) ||
                data.rate <= 0
            ) {
                throw new Error("The API returned an invalid exchange rate.");
            }

            rate = data.rate;
            date = data.date || date;
        }

        const convertedAmount = amount * rate;

        if (!Number.isFinite(convertedAmount)) {
            throw new Error("The converted amount is too large.");
        }

        resultAmount.textContent = formatMoney(
            convertedAmount,
            toCurrency
        );

        exchangeRate.textContent =
            `1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`;

        rateDate.textContent = `Exchange-rate date: ${date}`;

        resultBox.hidden = false;
        showMessage("Conversion completed successfully.", "success");
    } catch (error) {
        resultBox.hidden = true;

        if (error instanceof TypeError) {
            showMessage(
                "Could not fetch data. Check your internet connection and try again.",
                "error"
            );
        } else {
            showMessage(
                error.message || "Something went wrong. Please try again.",
                "error"
            );
        }
    } finally {
        convertButton.disabled = false;
        convertButton.textContent = "Convert Currency";
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    convertCurrency();
});

swapButton.addEventListener("click", () => {
    const previousFrom = fromSelect.value;

    fromSelect.value = toSelect.value;
    toSelect.value = previousFrom;

    convertCurrency();
});

async function initializeApp() {
    await loadCurrencies();
    await convertCurrency();
}

initializeApp();

