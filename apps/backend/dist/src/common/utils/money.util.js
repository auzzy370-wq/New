"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCents = toCents;
exports.fromCents = fromCents;
exports.formatMoney = formatMoney;
exports.calculatePlatformFee = calculatePlatformFee;
exports.calculateTax = calculateTax;
function toCents(amount) {
    return Math.round(amount * 100);
}
function fromCents(cents) {
    return cents / 100;
}
function formatMoney(cents, currency = 'usd') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(fromCents(cents));
}
function calculatePlatformFee(amount, rate) {
    return Math.round(amount * rate);
}
function calculateTax(amount, rate) {
    return Math.round(amount * rate);
}
//# sourceMappingURL=money.util.js.map