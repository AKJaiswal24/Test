export const parsePlanMonths = (durationLabel) => {
  const parsed = parsePlanDuration(durationLabel);
  if (!parsed || parsed.unit !== "month") return null;
  return parsed.value;
};

export const parsePlanDuration = (durationLabel) => {
  if (!durationLabel || typeof durationLabel !== "string") return null;
  const normalized = durationLabel.trim().toLowerCase();
  if (!normalized) return null;

  // Handle simple labels (Daily, Weekly, Monthly)
  if (normalized === "daily") return { unit: "day", value: 1 };
  if (normalized === "weekly") return { unit: "day", value: 7 };
  if (normalized === "monthly") return { unit: "month", value: 1 };

  const monthMatch = normalized.match(/(\d+)\s*(month|months|mo)\b/i);
  if (monthMatch) {
    const months = Number(monthMatch[1]);
    if (!Number.isInteger(months) || months <= 0) return null;
    return { unit: "month", value: months };
  }

  const dayMatch = normalized.match(/(\d+)\s*(day|days|d)\b/i);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    if (!Number.isInteger(days) || days <= 0) return null;
    return { unit: "day", value: days };
  }

  return null;
};
