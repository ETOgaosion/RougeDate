const timeFileModules = import.meta.glob("../date_arrangement/time_*.json", {
  eager: true,
});

const dayBackgroundModules = import.meta.glob(
  "../assets/images/day_*_background.png",
  {
    eager: true,
    import: "default",
  },
);

const dayBackgroundByIndex = Object.fromEntries(
  Object.entries(dayBackgroundModules)
    .map(([path, fileUrl]) => {
      const match = path.match(/day_(\d+)_background\.png$/);
      if (!match) {
        return null;
      }
      return [String(Number(match[1])), fileUrl];
    })
    .filter(Boolean),
);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function asId(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function normalizeActivity(rawActivity) {
  const stars = Number(
    rawActivity?.recommendation_stars ?? rawActivity?.recommendationStars,
  );

  return {
    tags: asArray(rawActivity?.tags).map((tag) => asText(tag)),
    akTag: asText(rawActivity?.ak_tag ?? rawActivity?.akTag),
    activity: asText(rawActivity?.activity ?? rawActivity?.title),
    location: asText(rawActivity?.location),
    geography: asText(rawActivity?.geography),
    duration: asText(rawActivity?.duration),
    notes: asText(rawActivity?.notes),
    negatives: asText(rawActivity?.negatives),
    recommendationStars: Number.isFinite(stars) ? stars : null,
    links: asArray(rawActivity?.links)
      .map((link) => ({
        name: asText(link?.name),
        url: asText(link?.url),
      }))
      .filter((link) => link.name || link.url),
  };
}

function extractRawCards(rawColumn) {
  if (Array.isArray(rawColumn?.cards)) {
    return rawColumn.cards;
  }

  if (Array.isArray(rawColumn?.activities)) {
    return rawColumn.activities.map((activity, idx) => ({
      id: `activity-${idx + 1}`,
      activities: [activity],
      connect_from: asArray(rawColumn?.connect_from),
      time: rawColumn?.time,
    }));
  }

  if (rawColumn?.activity || rawColumn?.ak_tag || rawColumn?.tags) {
    return [
      {
        id: rawColumn?.id ?? "activity-1",
        activities: [rawColumn],
        connect_from: asArray(rawColumn?.connect_from),
        time: rawColumn?.time,
      },
    ];
  }

  return [];
}

function normalizeCard(rawCard, columnIndex, cardPosition) {
  const cardId = asId(rawCard?.id, `${columnIndex}-${cardPosition + 1}`);
  const rawActivities = Array.isArray(rawCard?.activities)
    ? rawCard.activities
    : rawCard?.activity || rawCard?.ak_tag || rawCard?.tags
      ? [rawCard]
      : [];
  const activities = rawActivities.map(normalizeActivity);
  const leadActivity = activities[0] ?? {};
  const akTags = [...new Set(activities.map((activity) => activity.akTag))].filter(
    Boolean,
  );

  return {
    id: cardId,
    key: `column-${columnIndex}-card-${cardId}-${cardPosition}`,
    columnIndex,
    position: cardPosition,
    time: asText(rawCard?.time),
    connectFrom: asArray(rawCard?.connect_from ?? rawCard?.connectFrom).map(
      (from) => asId(from, ""),
    ),
    activities,
    akTags,
    title: asText(leadActivity.activity) || `Card ${cardPosition + 1}`,
    subtitle:
      asText(leadActivity.location) ||
      asText(leadActivity.geography) ||
      asText(rawCard?.time),
  };
}

function normalizeColumn(rawColumn, columnPosition) {
  const explicitIndex = Number(rawColumn?.column ?? rawColumn?.index);
  const columnIndex = Number.isFinite(explicitIndex)
    ? explicitIndex
    : columnPosition + 1;
  const cards = extractRawCards(rawColumn)
    .map((rawCard, idx) => normalizeCard(rawCard, columnIndex, idx))
    .sort((a, b) => a.position - b.position);

  return {
    columnIndex,
    cards,
  };
}

function normalizeDay(rawDay, dayPosition) {
  const columns = asArray(rawDay?.plans ?? rawDay?.columns)
    .map((column, idx) => normalizeColumn(column, idx))
    .sort((a, b) => a.columnIndex - b.columnIndex);

  const cardByKey = {};
  const cardById = {};
  for (const column of columns) {
    for (const card of column.cards) {
      cardByKey[card.key] = card;
      if (!cardById[card.id]) {
        cardById[card.id] = card;
      }
    }
  }

  return {
    key: `day-${dayPosition + 1}`,
    dayValue: rawDay?.day,
    date: asText(rawDay?.date),
    debuff: asText(rawDay?.debuff ?? rawDay?.debuf),
    debuffHint: asText(
      rawDay?.debuff_hint ?? rawDay?.debuffHint ?? rawDay?.debuf_hint,
    ),
    columns,
    cardByKey,
    cardById,
  };
}

function normalizeTimeData(timeIndex, rawData) {
  return {
    index: timeIndex,
    city: asText(rawData?.city),
    province: asText(rawData?.province),
    country: asText(rawData?.country),
    duration: asText(rawData?.duration),
    withPerson: asText(rawData?.mate ?? rawData?.with_person),
    days: asArray(rawData?.days ?? rawData?.arrangement).map((day, idx) =>
      normalizeDay(day, idx),
    ),
  };
}

export function buildTimelineData() {
  const detailByIndex = {};
  let maxIndex = 0;

  for (const [path, fileData] of Object.entries(timeFileModules)) {
    const match = path.match(/time_(\d+)\.json$/);
    if (!match) {
      continue;
    }
    const idx = Number(match[1]);
    if (!Number.isFinite(idx)) {
      continue;
    }

    detailByIndex[idx] = normalizeTimeData(idx, fileData?.default ?? fileData);
    maxIndex = Math.max(maxIndex, idx);
  }

  const safeMaxIndex = maxIndex > 0 ? maxIndex : 1;
  const lines = Array.from({ length: safeMaxIndex }, (_, linePosition) => {
    const idx = safeMaxIndex - linePosition;
    const detail = detailByIndex[idx];
    return {
      index: idx,
      city: detail?.city ?? "",
      province: detail?.province ?? "",
      country: detail?.country ?? "",
      duration: detail?.duration ?? "",
      withPerson: detail?.withPerson ?? "",
      hasData: Boolean(detail),
    };
  });

  return {
    lines,
    detailByIndex,
    latestIndex: safeMaxIndex,
  };
}

export function resolveDayBackground(dayData, dayPosition, fallbackImage) {
  const candidates = [];
  const dayValue = Number(dayData?.dayValue);
  if (Number.isFinite(dayValue)) {
    candidates.push(String(dayValue));
    candidates.push(String(dayValue + 1));
  }
  candidates.push(String(dayPosition + 1));

  for (const candidate of candidates) {
    if (dayBackgroundByIndex[candidate]) {
      return dayBackgroundByIndex[candidate];
    }
  }

  return fallbackImage;
}
