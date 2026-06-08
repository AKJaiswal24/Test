// Date utilities for IST (Indian Standard Time)
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30

export const formatYmdToEnIn = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN");
};

export const addDaysYmd = (ymd, days) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
};

export const addMonthsYmd = (ymd, months) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd);
  d.setMonth(d.getMonth() + Number(months || 0));
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
};

export const getTodayIstYmd = () => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const mo = String(istNow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(istNow.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
};

export const getTomorrowIstYmd = () => addDaysYmd(getTodayIstYmd(), 1);

export const isValidDeliveryDate = (ymd) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const today = getTodayIstYmd();
  return ymd >= today;
};