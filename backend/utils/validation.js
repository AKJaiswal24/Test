const HEX24_REGEX = /^[a-f\d]{24}$/i;
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const toTrimmedString = (value) => String(value || "").trim();

const isObjectIdHex = (value) => typeof value === "string" && HEX24_REGEX.test(value);

const isYmd = (value) => typeof value === "string" && YMD_REGEX.test(value);

module.exports = {
  isNonEmptyString,
  toTrimmedString,
  isObjectIdHex,
  isYmd,
};

