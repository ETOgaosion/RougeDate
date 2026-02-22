import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mainBackground from "../assets/images/main_background_heng.png";
import successBackground from "../assets/images/success_page.png";
import checkCircleIcon from "../assets/icons/check_circle.svg";
import battleIcon from "../assets/icons/battle.svg";
import bossIcon from "../assets/icons/boss.svg";
import boxIcon from "../assets/icons/box.svg";
import coinIcon from "../assets/icons/coin.svg";
import dialogIcon from "../assets/icons/dialog.svg";
import diceIcon from "../assets/icons/dice.svg";
import exitIcon from "../assets/icons/exit.svg";
import flowerIcon from "../assets/icons/flower.svg";
import towerIcon from "../assets/icons/tower.svg";
import viewerProfile from "../date_arrangement/user.json";
import { ak_tag_color_map, ak_tag_icon_map } from "./definedMaps";
import { buildTimelineData, resolveDayBackground } from "./rougeData";

const LEFT_LABEL = "\u8bf7\u541b\u8fdb\u5165";
const VIEWER_LABEL = "\u6e38\u5ba2";
const ENTER_EXPLORE_LABEL = "\u8fdb\u5165\u63a2\u7d22";
const START_ACTION_LABEL = "\u524d\u5f80\u51fa\u53d1";
const RESET_LABEL = "\u91cd\u7f6e";
const RETURN_ENTRY_LABEL = "\u8fd4\u56de\u5165\u53e3";
const RESET_CONFIRM_TEXT =
  "\u5c06\u6e05\u7a7a\u6240\u6709\u5df2\u9009\u5361\u7247\u5e76\u8fd4\u56de\u9875\u9762\u8d77\u70b9\uff0c\u786e\u8ba4\u5417\uff1f";
const DOCTOR_LABEL = "Dr.";
const VISITOR_LIST_LABEL = "\u6e38\u89c8\u8005\u540d\u5355";
const UP_MARK = "\u25b2";
const DOWN_MARK = "\u25bc";
const DRAG_THRESHOLD = 6;

const PHASE_ENTRY = "entry";
const PHASE_FADE = "fade-content";
const PHASE_BRIGHT = "bright-main";
const PHASE_CROSS = "cross-dissolve";
const PHASE_ROUGE = "rouge";
const PHASE_SUCCESS_FADE = "success-fade-content";
const PHASE_SUCCESS_CROSS = "success-cross-dissolve";
const PHASE_SUCCESS = "success";
const EXIT_AK_TAG = "\u51fa\u56ed";
const EXIT_AK_TAG_FALLBACK = "鍑哄洯";
const EXIT_TAG_SET = new Set([EXIT_AK_TAG, EXIT_AK_TAG_FALLBACK]);

const iconByKey = {
  battle: battleIcon,
  boss: bossIcon,
  box: boxIcon,
  coin: coinIcon,
  dialog: dialogIcon,
  dice: diceIcon,
  exit: exitIcon,
  flower: flowerIcon,
  tower: towerIcon,
};

function withAlpha(hexColor, alpha) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return `rgba(76, 144, 184, ${alpha})`;
  }
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getCardColor(card) {
  const tag = card.akTags[0];
  return getTagColor(tag);
}

function normalizeTag(tag) {
  return typeof tag === "string" ? tag.trim() : "";
}

function buildSelectionKey(timeIndex, dayPosition) {
  return `${timeIndex}-${dayPosition}`;
}

function isExitTag(tag) {
  return EXIT_TAG_SET.has(normalizeTag(tag));
}

function isExitCard(card) {
  if (!card) {
    return false;
  }
  if (card.akTags.some((tag) => isExitTag(tag))) {
    return true;
  }
  return card.activities.some((activity) => isExitTag(activity.akTag));
}

function getTagColor(tag) {
  const normalizedTag = normalizeTag(tag);
  if (normalizedTag && ak_tag_color_map[normalizedTag]) {
    return ak_tag_color_map[normalizedTag];
  }
  return "#13b4cc";
}

function getTagIcon(tag) {
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) {
    return boxIcon;
  }
  const iconKey = ak_tag_icon_map[normalizedTag];
  return iconByKey[iconKey] || boxIcon;
}

function formatStars(stars) {
  if (!Number.isFinite(stars)) {
    return "-";
  }
  return `${stars.toFixed(1)} / 5`;
}

export default function App() {
  const timeline = useMemo(() => buildTimelineData(), []);
  const username = typeof viewerProfile?.username === "string"
    ? viewerProfile.username.trim()
    : "";
  const nickname = typeof viewerProfile?.nickname === "string"
    ? viewerProfile.nickname.trim()
    : "";
  const viewerName = nickname || username || "-";
  const doctorName = username || viewerName;
  const lines = timeline.lines;
  const latestIndex = timeline.latestIndex;

  const scrollAreaRef = useRef(null);
  const rowRefs = useRef({});
  const initializedRef = useRef(false);
  const startupRef = useRef(true);

  const boardRef = useRef(null);
  const boardCanvasRef = useRef(null);
  const cardRefs = useRef({});
  const debuffTimerRef = useRef(null);
  const topBarRef = useRef(null);
  const detailDrawerRef = useRef(null);
  const detailScrollRef = useRef(null);
  const cursorRef = useRef(null);
  const entryLeftPanelRef = useRef(null);
  const boardTouchDragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
  });
  const boardMouseDragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
  });
  const detailTouchDragRef = useRef({
    active: false,
    axis: "y",
    sign: 1,
    startX: 0,
    startY: 0,
    startScrollTop: 0,
  });
  const detailMouseDragRef = useRef({
    active: false,
    startY: 0,
    startScrollTop: 0,
    didDrag: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(latestIndex);
  const [activeTimeIndex, setActiveTimeIndex] = useState(latestIndex);
  const [activeDayPosition, setActiveDayPosition] = useState(0);
  const [phase, setPhase] = useState(PHASE_ENTRY);
  const [centerSpacer, setCenterSpacer] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [chosenCardsByDay, setChosenCardsByDay] = useState({});
  const [detailCardKey, setDetailCardKey] = useState("");
  const [detailActivityIndex, setDetailActivityIndex] = useState(0);
  const [connections, setConnections] = useState([]);
  const [debuffHintOpen, setDebuffHintOpen] = useState(false);
  const [isBoardMouseDragging, setIsBoardMouseDragging] = useState(false);
  const [isDetailMouseDragging, setIsDetailMouseDragging] = useState(false);
  const [entryShadowReady, setEntryShadowReady] = useState(false);
  const entryShadowTimerRef = useRef(null);
  const [entryCircleSize, setEntryCircleSize] = useState(0);

  const updateDetailLayout = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    if (!width || !height) {
      return;
    }
    const widthScale = width / 1400;
    const heightScale = height / 800;
    const scale = Math.max(0.92, Math.min(1.35, Math.min(widthScale, heightScale)));
    document.documentElement.style.setProperty(
      "--detail-font-scale",
      scale.toFixed(3),
    );
    const rawDrawerWidth = Math.max(width / 3, Math.min(width * 0.38, 520));
    const drawerWidth = Math.min(rawDrawerWidth, width - 16);
    document.documentElement.style.setProperty(
      "--detail-drawer-width",
      `${Math.round(drawerWidth)}px`,
    );
  }, []);
  const [boardLayout, setBoardLayout] = useState({
    cardWidth: 220,
    cardHeight: 82,
    cardTagHeight: 24,
    cardItemGap: 6,
    columnGap: 72,
    columnTrack: 300,
    chainGap: 26,
    columnStackGap: 36,
  });

  const activeTime = timeline.detailByIndex[activeTimeIndex] ?? null;
  const activeDays = activeTime?.days ?? [];
  const resolvedDayPosition =
    activeDays.length === 0
      ? 0
      : Math.min(activeDayPosition, activeDays.length - 1);
  const activeDay = activeDays[resolvedDayPosition] ?? null;
  const dayValueNumber = Number(activeDay?.dayValue);
  const displayDayNumber = Number.isFinite(dayValueNumber)
    ? Math.max(1, dayValueNumber + 1)
    : resolvedDayPosition + 1;
  const debuffText = activeDay?.debuff || "-";
  const debuffHintText = activeDay?.debuffHint || "-";
  const dayBackground = resolveDayBackground(
    activeDay,
    resolvedDayPosition,
    mainBackground,
  );
  const activeDaySelectionKey = buildSelectionKey(
    activeTimeIndex,
    resolvedDayPosition,
  );
  const selectedByColumn = useMemo(
    () => chosenCardsByDay[activeDaySelectionKey] ?? {},
    [activeDaySelectionKey, chosenCardsByDay],
  );
  const mateText = activeTime?.withPerson || "-";

  const chosenCardTitles = useMemo(() => {
    if (!activeTime) {
      return [];
    }

    const titles = [];
    activeTime.days.forEach((day, dayPosition) => {
      const selectionKey = buildSelectionKey(activeTimeIndex, dayPosition);
      const selections = chosenCardsByDay[selectionKey] ?? {};
      day.columns.forEach((column) => {
        const cardKey = selections[String(column.columnIndex)];
        if (!cardKey) {
          return;
        }
        const card = day.cardByKey[cardKey];
        if (card?.title) {
          titles.push(card.title);
        }
      });
    });

    return titles;
  }, [activeTime, activeTimeIndex, chosenCardsByDay]);

  const columnStates = useMemo(() => {
    if (!activeDay) {
      return [];
    }

    return activeDay.columns.map((column, columnPosition) => {
      const isFirst = columnPosition === 0;
      const previous = isFirst ? null : activeDay.columns[columnPosition - 1];
      const previousSelection = previous
        ? selectedByColumn[String(previous.columnIndex)]
        : "";
      const previousCard = previousSelection
        ? activeDay.cardByKey[previousSelection]
        : null;
      const unlocked = isFirst || Boolean(previousCard);
      const cards = column.cards.map((card) => {
        const reachable =
          isFirst ||
          (unlocked &&
            (!card.connectFrom.length ||
              (previousCard ? card.connectFrom.includes(previousCard.id) : false)));
        return {
          card,
          reachable,
        };
      });

      return {
        column,
        unlocked,
        selectedKey: selectedByColumn[String(column.columnIndex)] ?? "",
        cards,
      };
    });
  }, [activeDay, selectedByColumn]);

  const revealByCardKey = useMemo(() => {
    const map = {};
    for (const columnState of columnStates) {
      const showRealCards = columnState.unlocked;
      for (const cardState of columnState.cards) {
        map[cardState.card.key] = showRealCards && cardState.reachable;
      }
    }
    return map;
  }, [columnStates]);

  const detailCard = activeDay?.cardByKey[detailCardKey] ?? null;
  const detailActivity = detailCard
    ? detailCard.activities[
        Math.max(0, Math.min(detailActivityIndex, detailCard.activities.length - 1))
      ] ?? null
    : null;
  const detailTag = detailActivity?.akTag || detailCard?.akTags?.[0] || "";
  const detailTitleColor = getTagColor(detailTag);

  const updateScrollState = useCallback((container) => {
    if (!container) {
      return;
    }
    setCanScrollUp(container.scrollTop > 4);
    setCanScrollDown(
      container.scrollTop + container.clientHeight < container.scrollHeight - 4,
    );
  }, []);

  const updateCenterSpacer = useCallback(() => {
    const container = scrollAreaRef.current;
    const firstRow = lines.length ? rowRefs.current[lines[0].index] : null;
    if (!container || !firstRow) {
      setCenterSpacer(0);
      return;
    }

    const spacer = Math.max(
      0,
      container.clientHeight / 2 - firstRow.offsetHeight / 2,
    );
    setCenterSpacer(spacer);
  }, [lines]);

  const updateSelectionByCenter = useCallback(() => {
    const container = scrollAreaRef.current;
    if (!container) {
      return;
    }

    const centerY =
      container.getBoundingClientRect().top +
      container.getBoundingClientRect().height / 2;
    let nearestIndex = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const line of lines) {
      const row = rowRefs.current[line.index];
      if (!row) {
        continue;
      }

      const rowCenter = row.getBoundingClientRect().top + row.offsetHeight / 2;
      const distance = Math.abs(rowCenter - centerY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = line.index;
      }
    }

    if (nearestIndex !== null) {
      setSelectedIndex((prev) => (prev === nearestIndex ? prev : nearestIndex));
    }
  }, [lines]);

  const updateBoardLayout = useCallback(() => {
    const boardElement = boardRef.current;
    if (!boardElement) {
      return;
    }

    const viewportWidth = Math.max(320, boardElement.clientWidth);
    const measuredBoardHeight = Math.max(180, boardElement.clientHeight);
    const topBarHeight = Math.max(
      0,
      topBarRef.current?.getBoundingClientRect().height ?? 0,
    );
    const visualViewportHeight =
      window.visualViewport?.height ?? window.innerHeight ?? measuredBoardHeight;
    const viewportBoardHeight = Math.max(
      120,
      visualViewportHeight - topBarHeight - 28,
    );
    const availableHeight = Math.max(
      120,
      Math.min(measuredBoardHeight - 12, viewportBoardHeight),
    );

    const unit = (viewportWidth * 0.9) / 3;
    const desiredCardWidth = Math.max(196, Math.min(340, Math.round(unit * 0.56)));
    const desiredCardHeight = Math.max(24, Math.round(desiredCardWidth / 4));

    const baseCardTagHeight = Math.max(
      16,
      Math.min(24, Math.round(desiredCardHeight * 0.34)),
    );
    const baseCardItemGap = Math.max(
      3,
      Math.min(8, Math.round(desiredCardHeight * 0.1)),
    );
    const baseChainGap = Math.max(8, Math.round(desiredCardHeight * 0.2));
    const baseColumnStackGap = Math.max(
      12,
      Math.round(desiredCardHeight * 0.48),
    );

    let maxActivityCards = 1;
    let maxInnerGaps = 0;
    let maxChains = 1;
    const columns = activeDay?.columns ?? [];
    for (const column of columns) {
      const cards = column.cards ?? [];
      const chainCount = Math.max(1, cards.length);
      let activityCards = 0;
      let innerGaps = 0;
      for (const card of cards) {
        const count = Math.max(1, card.activities.length || 0);
        activityCards += count;
        innerGaps += Math.max(0, count - 1);
      }
      if (activityCards <= 0) {
        activityCards = 1;
      }
      const currentDemand =
        activityCards + innerGaps * 0.22 + Math.max(0, chainCount - 1) * 0.45;
      const previousDemand =
        maxActivityCards + maxInnerGaps * 0.22 + Math.max(0, maxChains - 1) * 0.45;
      if (currentDemand > previousDemand) {
        maxActivityCards = activityCards;
        maxInnerGaps = innerGaps;
        maxChains = chainCount;
      }
    }

    const reservedGapHeight =
      maxInnerGaps * baseChainGap + Math.max(0, maxChains - 1) * baseColumnStackGap;
    const reservedLabelHeight =
      maxActivityCards * (baseCardTagHeight + baseCardItemGap);
    const fittedCardHeight = Math.floor(
      (availableHeight - reservedGapHeight - reservedLabelHeight) /
        Math.max(1, maxActivityCards),
    );
    const safeFittedCardHeight = Number.isFinite(fittedCardHeight)
      ? fittedCardHeight
      : desiredCardHeight;
    const cardHeight = Math.max(
      24,
      Math.min(desiredCardHeight, safeFittedCardHeight),
    );
    const cardWidth = Math.max(96, Math.round(cardHeight * 4));
    const columnGap = Math.max(52, Math.round(unit - cardWidth));
    const columnTrack = Math.max(cardWidth + 20, Math.round(unit + cardWidth * 0.1));
    const cardTagHeight = Math.max(
      12,
      Math.min(baseCardTagHeight, Math.round(cardHeight * 0.4)),
    );
    const cardItemGap = Math.max(
      2,
      Math.min(baseCardItemGap, Math.round(cardHeight * 0.12)),
    );
    const chainGap = Math.max(6, Math.min(baseChainGap, Math.round(cardHeight * 0.22)));
    const columnStackGap = Math.max(
      8,
      Math.min(baseColumnStackGap, Math.round(cardHeight * 0.45)),
    );

    setBoardLayout((previous) => {
      if (
        previous.cardWidth === cardWidth &&
        previous.cardHeight === cardHeight &&
        previous.cardTagHeight === cardTagHeight &&
        previous.cardItemGap === cardItemGap &&
        previous.columnGap === columnGap &&
        previous.columnTrack === columnTrack &&
        previous.chainGap === chainGap &&
        previous.columnStackGap === columnStackGap
      ) {
        return previous;
      }
      return {
        cardWidth,
        cardHeight,
        cardTagHeight,
        cardItemGap,
        columnGap,
        columnTrack,
        chainGap,
        columnStackGap,
      };
    });
  }, [activeDay]);

  const stopBoardMouseDrag = useCallback(() => {
    boardMouseDragRef.current.active = false;
    setIsBoardMouseDragging(false);
  }, []);

  const handleBoardMouseMove = useCallback((event) => {
    const boardElement = boardRef.current;
    const dragState = boardMouseDragRef.current;
    if (!boardElement || !dragState.active) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    if (!dragState.didDrag && Math.abs(deltaX) < DRAG_THRESHOLD) {
      return;
    }
    if (!dragState.didDrag) {
      dragState.didDrag = true;
      setIsBoardMouseDragging(true);
    }
    boardElement.scrollLeft = dragState.startScrollLeft - deltaX;
    event.preventDefault();
  }, []);

  const handleBoardMouseUp = useCallback(() => {
    if (!boardMouseDragRef.current.active) {
      return;
    }
    stopBoardMouseDrag();
    window.removeEventListener("mousemove", handleBoardMouseMove);
    window.removeEventListener("mouseup", handleBoardMouseUp);
  }, [handleBoardMouseMove, stopBoardMouseDrag]);

  const handleBoardMouseDown = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }
      const boardElement = boardRef.current;
      if (!boardElement) {
        return;
      }

      boardMouseDragRef.current = {
        active: true,
        startX: event.clientX,
        startScrollLeft: boardElement.scrollLeft,
        didDrag: false,
      };
      window.addEventListener("mousemove", handleBoardMouseMove);
      window.addEventListener("mouseup", handleBoardMouseUp);
    },
    [handleBoardMouseMove, handleBoardMouseUp],
  );

  const handleBoardClickCapture = useCallback((event) => {
    if (boardMouseDragRef.current.didDrag) {
      boardMouseDragRef.current.didDrag = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const stopBoardTouchDrag = useCallback(() => {
    boardTouchDragRef.current.active = false;
  }, []);

  const handleBoardTouchStart = useCallback(
    (event) => {
      const boardElement = boardRef.current;
      if (!boardElement || event.touches.length !== 1) {
        stopBoardTouchDrag();
        return;
      }

      const touch = event.touches[0];
      boardTouchDragRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollLeft: boardElement.scrollLeft,
      };
    },
    [stopBoardTouchDrag],
  );

  const handleBoardTouchMove = useCallback((event) => {
    const boardElement = boardRef.current;
    const dragState = boardTouchDragRef.current;
    if (!boardElement || !dragState.active || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - dragState.startX;
    const deltaY = touch.clientY - dragState.startY;
    const dominantDelta =
      Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
    if (Math.abs(dominantDelta) < 4) {
      return;
    }

    boardElement.scrollLeft = dragState.startScrollLeft - dominantDelta;
    if (event.cancelable) {
      event.preventDefault();
    }
  }, []);

  const handleBoardTouchEnd = useCallback(() => {
    stopBoardTouchDrag();
  }, [stopBoardTouchDrag]);

  const stopDetailMouseDrag = useCallback(() => {
    detailMouseDragRef.current.active = false;
    setIsDetailMouseDragging(false);
  }, []);

  const handleDetailMouseMove = useCallback((event) => {
    const detailElement = detailScrollRef.current;
    const dragState = detailMouseDragRef.current;
    if (!detailElement || !dragState.active) {
      return;
    }

    const deltaY = event.clientY - dragState.startY;
    if (!dragState.didDrag && Math.abs(deltaY) < DRAG_THRESHOLD) {
      return;
    }
    if (!dragState.didDrag) {
      dragState.didDrag = true;
      setIsDetailMouseDragging(true);
    }
    const nextScrollTop = dragState.startScrollTop - deltaY;
    const maxScrollTop = Math.max(
      0,
      detailElement.scrollHeight - detailElement.clientHeight,
    );
    detailElement.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));
    event.preventDefault();
  }, []);

  const handleDetailMouseUp = useCallback(() => {
    if (!detailMouseDragRef.current.active) {
      return;
    }
    stopDetailMouseDrag();
    window.removeEventListener("mousemove", handleDetailMouseMove);
    window.removeEventListener("mouseup", handleDetailMouseUp);
  }, [handleDetailMouseMove, stopDetailMouseDrag]);

  const handleDetailMouseDown = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }
      const detailElement = detailScrollRef.current;
      if (!detailElement) {
        return;
      }

      detailMouseDragRef.current = {
        active: true,
        startY: event.clientY,
        startScrollTop: detailElement.scrollTop,
        didDrag: false,
      };
      window.addEventListener("mousemove", handleDetailMouseMove);
      window.addEventListener("mouseup", handleDetailMouseUp);
    },
    [handleDetailMouseMove, handleDetailMouseUp],
  );

  const handleDetailClickCapture = useCallback((event) => {
    if (detailMouseDragRef.current.didDrag) {
      detailMouseDragRef.current.didDrag = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const stopDetailTouchDrag = useCallback(() => {
    detailTouchDragRef.current.active = false;
  }, []);

  const handleDetailTouchStart = useCallback(
    (event) => {
      const detailElement = detailScrollRef.current;
      if (!detailElement || event.touches.length !== 1) {
        stopDetailTouchDrag();
        return;
      }
      const portraitQuery = window.matchMedia(
        "(max-width: 1024px) and (orientation: portrait)",
      );
      const landscapeQuery = window.matchMedia(
        "(max-width: 1024px) and (orientation: landscape)",
      );
      if (!portraitQuery.matches && !landscapeQuery.matches) {
        stopDetailTouchDrag();
        return;
      }

      const resolveLandscapeSign = () => {
        const orientation = window.screen?.orientation;
        const type = orientation?.type ?? "";
        if (type.includes("landscape-primary")) {
          return 1;
        }
        if (type.includes("landscape-secondary")) {
          return -1;
        }

        const rawAngle = orientation?.angle ?? window.orientation ?? 0;
        if (rawAngle === 270 || rawAngle === -270) {
          return -1;
        }
        if (rawAngle === -90 || rawAngle === 90) {
          return 1;
        }
        return 1;
      };

      const touch = event.touches[0];
      detailTouchDragRef.current = {
        active: true,
        axis: landscapeQuery.matches ? "x" : "y",
        sign: landscapeQuery.matches ? resolveLandscapeSign() : 1,
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollTop: detailElement.scrollTop,
      };
    },
    [stopDetailTouchDrag],
  );

  const handleDetailTouchMove = useCallback((event) => {
    const detailElement = detailScrollRef.current;
    const dragState = detailTouchDragRef.current;
    if (!detailElement || !dragState.active || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - dragState.startX;
    const deltaY = touch.clientY - dragState.startY;
    const primaryDelta =
      (dragState.axis === "x" ? deltaX : deltaY) * dragState.sign;
    if (Math.abs(primaryDelta) < 3) {
      return;
    }

    const nextScrollTop = dragState.startScrollTop + primaryDelta;
    const maxScrollTop = Math.max(
      0,
      detailElement.scrollHeight - detailElement.clientHeight,
    );
    detailElement.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));
    if (event.cancelable) {
      event.preventDefault();
    }
  }, []);

  const handleDetailTouchEnd = useCallback(() => {
    stopDetailTouchDrag();
  }, [stopDetailTouchDrag]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleBoardMouseMove);
      window.removeEventListener("mouseup", handleBoardMouseUp);
      window.removeEventListener("mousemove", handleDetailMouseMove);
      window.removeEventListener("mouseup", handleDetailMouseUp);
    };
  }, [handleBoardMouseMove, handleBoardMouseUp, handleDetailMouseMove, handleDetailMouseUp]);

  useEffect(() => {
    updateDetailLayout();
    window.addEventListener("resize", updateDetailLayout);
    window.addEventListener("orientationchange", updateDetailLayout);
    return () => {
      window.removeEventListener("resize", updateDetailLayout);
      window.removeEventListener("orientationchange", updateDetailLayout);
    };
  }, [updateDetailLayout]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const cursor = cursorRef.current;
    if (!cursor) {
      return;
    }
    const media = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!media?.matches) {
      return;
    }

    let hotspotX = 8;
    let hotspotY = 8;
    const readHotspot = () => {
      const styles = window.getComputedStyle(document.documentElement);
      const parsePx = (value, fallback) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      hotspotX = parsePx(
        styles.getPropertyValue("--rouge-cursor-hotspot-x"),
        hotspotX,
      );
      hotspotY = parsePx(
        styles.getPropertyValue("--rouge-cursor-hotspot-y"),
        hotspotY,
      );
    };
    readHotspot();

    const position = { x: 0, y: 0 };
    let frame = 0;
    let visible = false;

    const updatePosition = () => {
      frame = 0;
      cursor.style.transform = `translate3d(${Math.round(
        position.x - hotspotX,
      )}px, ${Math.round(position.y - hotspotY)}px, 0)`;
    };

    const handleMove = (event) => {
      position.x = event.clientX;
      position.y = event.clientY;
      if (!visible) {
        cursor.style.opacity = "1";
        visible = true;
      }
      if (!frame) {
        frame = window.requestAnimationFrame(updatePosition);
      }
    };

    const handleMouseDown = (event) => {
      if (event.button !== 0) {
        return;
      }
      cursor.classList.remove("rouge-cursor-click");
      void cursor.offsetWidth;
      cursor.classList.add("rouge-cursor-click");
    };

    const handleAnimationEnd = (event) => {
      if (event.animationName === "cursorClickRotate") {
        cursor.classList.remove("rouge-cursor-click");
      }
    };

    const handleWindowOut = (event) => {
      if (event.relatedTarget) {
        return;
      }
      cursor.style.opacity = "0";
      visible = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("blur", handleWindowOut);
    window.addEventListener("mouseout", handleWindowOut);
    window.addEventListener("resize", readHotspot);
    window.addEventListener("orientationchange", readHotspot);
    cursor.addEventListener("animationend", handleAnimationEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("blur", handleWindowOut);
      window.removeEventListener("mouseout", handleWindowOut);
      window.removeEventListener("resize", readHotspot);
      window.removeEventListener("orientationchange", readHotspot);
      cursor.removeEventListener("animationend", handleAnimationEnd);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const recalculateConnections = useCallback(() => {
    if (
      !boardRef.current ||
      !boardCanvasRef.current ||
      !activeDay ||
      phase !== PHASE_ROUGE
    ) {
      setConnections([]);
      return;
    }

    const getElementRectWithinCanvas = (element) => {
      const canvas = boardCanvasRef.current;
      let left = 0;
      let top = 0;
      let node = element;

      while (node && node !== canvas) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent;
      }

      if (node === canvas) {
        return {
          left,
          top,
          width: element.offsetWidth,
          height: element.offsetHeight,
        };
      }

      const canvasRect = canvas.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - canvasRect.left,
        top: rect.top - canvasRect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const getAnchor = (element, side) => {
      const rect = getElementRectWithinCanvas(element);

      if (side === "right") {
        return {
          x: rect.left + rect.width,
          y: rect.top + rect.height / 2,
        };
      }
      if (side === "left") {
        return {
          x: rect.left,
          y: rect.top + rect.height / 2,
        };
      }
      if (side === "bottom") {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height,
        };
      }
      return {
        x: rect.left + rect.width / 2,
        y: rect.top,
      };
    };

    const nextConnections = [];

    for (let colPos = 1; colPos < columnStates.length; colPos += 1) {
      const columnState = columnStates[colPos];
      for (const targetState of columnState.cards) {
        const targetCard = targetState.card;
        const targetElement = cardRefs.current[`${targetCard.key}::start`];
        if (!targetElement) {
          continue;
        }

        for (const fromId of targetCard.connectFrom) {
          const sourceCard = activeDay.cardById[fromId];
          if (!sourceCard) {
            continue;
          }

          const sourceElement = cardRefs.current[`${sourceCard.key}::end`];
          if (!sourceElement) {
            continue;
          }

          const start = getAnchor(sourceElement, "right");
          const end = getAnchor(targetElement, "left");
          const startX = start.x;
          const startY = start.y;
          const endX = end.x;
          const endY = end.y;
          const span = Math.max(52, (endX - startX) * 0.45);
          const targetRevealed = Boolean(revealByCardKey[targetCard.key]);

          nextConnections.push({
            key: `${sourceCard.key}=>${targetCard.key}`,
            color: targetRevealed
              ? getCardColor(targetCard)
              : "rgba(255,255,255,0.95)",
            path: `M ${startX} ${startY} C ${startX + span} ${startY}, ${endX - span} ${endY}, ${endX} ${endY}`,
          });
        }
      }
    }

    for (const columnState of columnStates) {
      for (const cardState of columnState.cards) {
        const activityCount =
          cardState.card.activities.length > 0 ? cardState.card.activities.length : 1;

        for (let activityIndex = 0; activityIndex < activityCount - 1; activityIndex += 1) {
          const sourceElement =
            cardRefs.current[`${cardState.card.key}::activity-${activityIndex}`];
          const targetElement =
            cardRefs.current[`${cardState.card.key}::activity-${activityIndex + 1}`];
          if (!sourceElement || !targetElement) {
            continue;
          }

          const start = getAnchor(sourceElement, "bottom");
          const end = getAnchor(targetElement, "top");
          const startX = start.x;
          const startY = start.y;
          const endX = end.x;
          const endY = end.y;
          const direction = endY >= startY ? 1 : -1;
          const span = Math.max(26, Math.abs(endY - startY) * 0.45);
          const targetRevealed = Boolean(revealByCardKey[cardState.card.key]);

          nextConnections.push({
            key: `${cardState.card.key}::inner-${activityIndex}`,
            color: targetRevealed
              ? getCardColor(cardState.card)
              : "rgba(255,255,255,0.95)",
            path: `M ${startX} ${startY} C ${startX} ${startY + span * direction}, ${endX} ${endY - span * direction}, ${endX} ${endY}`,
          });
        }
      }
    }

    setConnections(nextConnections);
  }, [activeDay, columnStates, phase, revealByCardKey]);

  const openRouge = useCallback(
    (index) => {
      if (!timeline.detailByIndex[index] || phase !== PHASE_ENTRY) {
        return;
      }
      setActiveTimeIndex(index);
      setActiveDayPosition(0);
      setChosenCardsByDay({});
      setDetailCardKey("");
      setDetailActivityIndex(0);
      setPhase(PHASE_FADE);
    },
    [phase, timeline.detailByIndex],
  );

  const chooseCard = useCallback(
    (card) => {
      if (!activeDay) {
        return;
      }

      const columnKey = String(card.columnIndex);
      const orderedKeys = activeDay.columns.map((column) =>
        String(column.columnIndex),
      );

      setChosenCardsByDay((previous) => {
        const daySelections = { ...(previous[activeDaySelectionKey] ?? {}) };
        daySelections[columnKey] = card.key;
        const currentIndex = orderedKeys.indexOf(columnKey);
        for (let pos = currentIndex + 1; pos < orderedKeys.length; pos += 1) {
          delete daySelections[orderedKeys[pos]];
        }
        return {
          ...previous,
          [activeDaySelectionKey]: daySelections,
        };
      });

      setDetailCardKey(card.key);
      setDetailActivityIndex(0);

      if (!isExitCard(card)) {
        return;
      }

      const hasNextDay = resolvedDayPosition < activeDays.length - 1;
      if (hasNextDay) {
        setActiveDayPosition((previous) =>
          Math.min(previous + 1, activeDays.length - 1),
        );
        setDetailCardKey("");
        setDetailActivityIndex(0);
        setDebuffHintOpen(false);
        const boardElement = boardRef.current;
        if (boardElement) {
          boardElement.scrollTo({
            left: 0,
            top: 0,
            behavior: "smooth",
          });
        }
        return;
      }

      setDebuffHintOpen(false);
      setPhase(PHASE_SUCCESS_FADE);
    },
    [activeDay, activeDaySelectionKey, activeDays.length, resolvedDayPosition],
  );

  useEffect(() => {
    setSelectedIndex(latestIndex);
    setActiveTimeIndex(latestIndex);
  }, [latestIndex]);

  useLayoutEffect(() => {
    const panel = entryLeftPanelRef.current;
    if (!panel) {
      return undefined;
    }

    const CIRCLE_BLUR_PX = 14;
    const updateCircle = () => {
      const rect = panel.getBoundingClientRect();
      const rawSize = Math.min(rect.width, rect.height);
      const size = Math.max(0, Math.floor(rawSize - CIRCLE_BLUR_PX * 2));
      setEntryCircleSize((prev) => (Math.abs(prev - size) < 1 ? prev : size));
    };

    updateCircle();
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateCircle());
      observer.observe(panel);
    } else {
      window.addEventListener("resize", updateCircle);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", updateCircle);
      }
    };
  }, []);

  useEffect(() => {
    if (entryShadowReady) {
      return undefined;
    }
    if (entryShadowTimerRef.current) {
      window.clearTimeout(entryShadowTimerRef.current);
    }
    entryShadowTimerRef.current = window.setTimeout(() => {
      setEntryShadowReady(true);
      entryShadowTimerRef.current = null;
    }, 420);

    return () => {
      if (entryShadowTimerRef.current) {
        window.clearTimeout(entryShadowTimerRef.current);
        entryShadowTimerRef.current = null;
      }
    };
  }, [entryShadowReady]);

  useEffect(() => {
    if (phase === PHASE_ENTRY || phase === PHASE_ROUGE || phase === PHASE_SUCCESS) {
      return undefined;
    }

    let timeoutMs = 0;
    let nextPhase = PHASE_ROUGE;
    if (phase === PHASE_FADE) {
      timeoutMs = 340;
      nextPhase = PHASE_BRIGHT;
    } else if (phase === PHASE_BRIGHT) {
      timeoutMs = 460;
      nextPhase = PHASE_CROSS;
    } else if (phase === PHASE_CROSS) {
      timeoutMs = 640;
      nextPhase = PHASE_ROUGE;
    } else if (phase === PHASE_SUCCESS_FADE) {
      timeoutMs = 320;
      nextPhase = PHASE_SUCCESS_CROSS;
    } else if (phase === PHASE_SUCCESS_CROSS) {
      timeoutMs = 680;
      nextPhase = PHASE_SUCCESS;
    }

    const timer = window.setTimeout(() => setPhase(nextPhase), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const onResize = () => {
      updateCenterSpacer();
      updateScrollState(scrollAreaRef.current);
      updateBoardLayout();
      recalculateConnections();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [
    recalculateConnections,
    updateBoardLayout,
    updateCenterSpacer,
    updateScrollState,
  ]);

  useEffect(() => {
    if (!lines.length || initializedRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      updateCenterSpacer();
      const container = scrollAreaRef.current;
      const row = rowRefs.current[latestIndex];
      if (container && row) {
        container.scrollTop =
          row.offsetTop - container.clientHeight / 2 + row.offsetHeight / 2;
      }
      updateScrollState(container);
      initializedRef.current = true;
      startupRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [latestIndex, lines.length, updateCenterSpacer, updateScrollState]);

  useEffect(() => {
    if (!detailCardKey || revealByCardKey[detailCardKey]) {
      return;
    }
    setDetailCardKey("");
    setDetailActivityIndex(0);
  }, [detailCardKey, revealByCardKey]);

  useEffect(() => {
    setDetailCardKey("");
    setDetailActivityIndex(0);
  }, [activeDayPosition, activeTimeIndex]);

  useEffect(() => {
    setDebuffHintOpen(false);
  }, [activeDayPosition, activeTimeIndex]);

  useEffect(() => {
    if (!detailCard) {
      return undefined;
    }

    const closeDrawerOnOutsidePointer = (event) => {
      const drawerElement = detailDrawerRef.current;
      const target = event.target;
      if (!drawerElement || !(target instanceof Node)) {
        return;
      }
      if (drawerElement.contains(target)) {
        return;
      }
      setDetailCardKey("");
      setDetailActivityIndex(0);
    };

    window.addEventListener("pointerdown", closeDrawerOnOutsidePointer, true);
    return () => {
      window.removeEventListener("pointerdown", closeDrawerOnOutsidePointer, true);
    };
  }, [detailCard]);

  useEffect(
    () => () => {
      if (debuffTimerRef.current) {
        window.clearTimeout(debuffTimerRef.current);
      }
    },
    [],
  );

  const openDebuffHint = useCallback(() => {
    if (debuffTimerRef.current) {
      window.clearTimeout(debuffTimerRef.current);
      debuffTimerRef.current = null;
    }
    setDebuffHintOpen(true);
  }, []);

  const closeDebuffHint = useCallback(() => {
    if (debuffTimerRef.current) {
      window.clearTimeout(debuffTimerRef.current);
      debuffTimerRef.current = null;
    }
    setDebuffHintOpen(false);
  }, []);

  const resetRougeBoard = useCallback(() => {
    const confirmed = window.confirm(RESET_CONFIRM_TEXT);
    if (!confirmed) {
      return;
    }

    setChosenCardsByDay({});
    setDetailCardKey("");
    setDetailActivityIndex(0);
    setActiveDayPosition(0);
    setDebuffHintOpen(false);
    setPhase(PHASE_ROUGE);

    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  const showDebuffHintTemporarily = useCallback(() => {
    if (debuffTimerRef.current) {
      window.clearTimeout(debuffTimerRef.current);
    }
    setDebuffHintOpen(true);
    debuffTimerRef.current = window.setTimeout(() => {
      setDebuffHintOpen(false);
      debuffTimerRef.current = null;
    }, 2400);
  }, []);

  const returnToEntry = useCallback(() => {
    setChosenCardsByDay({});
    setDetailCardKey("");
    setDetailActivityIndex(0);
    setActiveDayPosition(0);
    setDebuffHintOpen(false);
    setConnections([]);
    setSelectedIndex(activeTimeIndex);
    setPhase(PHASE_ENTRY);

    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
      });
    }
  }, [activeTimeIndex]);

  useLayoutEffect(() => {
    if (phase !== PHASE_ROUGE) {
      return;
    }

    updateBoardLayout();
  }, [phase, updateBoardLayout]);

  useLayoutEffect(() => {
    if (phase !== PHASE_ROUGE) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      recalculateConnections();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [boardLayout, phase, recalculateConnections]);

  useLayoutEffect(() => {
    if (phase !== PHASE_ROUGE) {
      return;
    }
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      recalculateConnections();
    });

    const boardElement = boardRef.current;
    const canvasElement = boardCanvasRef.current;
    if (boardElement) {
      resizeObserver.observe(boardElement);
    }
    if (canvasElement) {
      resizeObserver.observe(canvasElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [phase, recalculateConnections]);

  const entryActive = phase === PHASE_ENTRY;
  const rougeActive = phase === PHASE_ROUGE;
  const successActive = phase === PHASE_SUCCESS;

  const entryOpacity = entryActive ? 1 : 0;
  const rougeOpacity = rougeActive ? 1 : 0;
  const successOpacity = successActive ? 1 : 0;

  const entryLayerStyle = {
    opacity: entryOpacity,
    pointerEvents: entryActive ? "auto" : "none",
    zIndex: entryActive ? 50 : 20,
  };
  const rougeLayerStyle = {
    opacity: rougeOpacity,
    pointerEvents: rougeActive ? "auto" : "none",
    zIndex: rougeActive ? 50 : 30,
  };
  const successLayerStyle = {
    opacity: successOpacity,
    pointerEvents: successActive ? "auto" : "none",
    zIndex: successActive ? 50 : 40,
  };
  const mainOpacity =
    phase === PHASE_ENTRY || phase === PHASE_FADE || phase === PHASE_BRIGHT ? 1 : 0;
  const dayOpacity =
    phase === PHASE_CROSS ||
    phase === PHASE_ROUGE ||
    phase === PHASE_SUCCESS_FADE
      ? 1
      : 0;
  const successBackgroundOpacity =
    phase === PHASE_SUCCESS_CROSS || phase === PHASE_SUCCESS ? 1 : 0;
  const shadowOpacity =
    phase === PHASE_ENTRY
      ? entryShadowReady
        ? 0.58
        : 0
      : phase === PHASE_FADE
        ? 0.32
        : phase === PHASE_SUCCESS_CROSS || phase === PHASE_SUCCESS
          ? 0.36
          : 0.14;

  return (
    <main className="app-root relative h-screen w-screen overflow-hidden text-slateMist">
      <img
        src={mainBackground}
        alt="Main background"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[680ms]"
        style={{ opacity: mainOpacity }}
      />
      <img
        src={dayBackground}
        alt="Day background"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[680ms]"
        style={{ opacity: dayOpacity }}
      />
      <img
        src={successBackground}
        alt="Success background"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[680ms]"
        style={{ opacity: successBackgroundOpacity }}
      />
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: shadowOpacity }}
      />

      <section
        className="absolute inset-0 z-20 flex flex-col transition-opacity duration-300"
        style={entryLayerStyle}
        aria-hidden={!entryActive}
        inert={entryActive ? undefined : ""}
      >
        <div className="left-title flex h-24 items-center justify-center px-4 text-center text-3xl tracking-[0.1em] text-white sm:h-28 sm:text-4xl">
          {VIEWER_LABEL}
          {"\uFF1A"}
          {viewerName || "-"}
        </div>

        <div className="min-h-0 flex-1 px-4 pb-5 sm:px-8 sm:pb-8">
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div
              ref={entryLeftPanelRef}
              className="entry-left-panel relative overflow-hidden lg:col-span-4 lg:flex lg:items-center lg:justify-center"
            >
              <div
                className="concentric-circle pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
                style={
                  entryCircleSize > 0
                    ? { width: `${entryCircleSize}px`, height: `${entryCircleSize}px` }
                    : undefined
                }
              />
              <h1 className="left-title relative z-10 px-4 py-8 text-center text-4xl font-semibold tracking-[0.35em] text-amber-50 sm:text-5xl lg:px-2 lg:text-6xl">
                {LEFT_LABEL}
              </h1>
            </div>

            <div className="hidden lg:col-span-1 lg:block">
              <div className="pointer-events-none relative h-full">
                <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.98)_82%)] [clip-path:polygon(0_0,0_100%,100%_50%)] xl:h-28 xl:w-24" />
              </div>
            </div>

            <div className="relative min-h-0 lg:col-span-7">
              <div
                ref={scrollAreaRef}
                className="timeline-scroll h-full overflow-y-auto rounded-xl border border-white/20 p-3 sm:p-4"
                onScroll={(event) => {
                  updateScrollState(event.currentTarget);
                  if (!startupRef.current) {
                    updateSelectionByCenter();
                  }
                }}
              >
                <div className="flex min-h-full flex-col gap-3">
                  <div style={{ height: `${centerSpacer}px` }} />
                  {lines.map((line) => {
                    const selected = line.index === selectedIndex;
                    return (
                      <div
                        key={line.index}
                        ref={(node) => {
                          if (node) {
                            rowRefs.current[line.index] = node;
                          } else {
                            delete rowRefs.current[line.index];
                          }
                        }}
                        className={`flex min-h-[18vh] items-center gap-3 pl-3 pr-4 sm:pl-5 sm:pr-6 ${selected ? "bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0.42)_100%)]" : ""}`}
                        onClick={() => setSelectedIndex(line.index)}
                      >
                        <div className={`line-number mr-6 flex h-28 w-24 items-center justify-center text-center text-8xl leading-none sm:mr-8 sm:h-32 sm:w-28 sm:text-9xl ${selected ? "text-emerald-300" : "text-white/60"}`}>
                          {line.index}
                        </div>
                        <div className={`h-28 w-[3px] shrink-0 rounded-full sm:h-32 ${selected ? "bg-[linear-gradient(180deg,rgba(120,255,220,0.9)_0%,rgba(255,255,255,0.95)_100%)] shadow-[0_0_12px_rgba(180,255,235,0.7)]" : "bg-[linear-gradient(180deg,rgba(220,230,238,0.75)_0%,rgba(245,245,245,0.92)_100%)]"}`} />
                        <div className="line-city flex-1">
                          <div className="text-2xl tracking-[0.08em] text-slate-100 sm:text-3xl">
                            {line.city || "-"}
                          </div>
                          <div className="mt-1 text-sm tracking-[0.06em] text-white/72 sm:text-base">
                            {line.province || "-"} / {line.country || "-"} /{" "}
                            {line.duration || "-"} / {line.withPerson || "-"}
                          </div>
                        </div>
                        {selected && (
                          <div className="ml-2 flex shrink-0 items-center gap-3 text-white/95">
                            <img
                              src={checkCircleIcon}
                              alt=""
                              aria-hidden="true"
                              className="h-10 w-10 sm:h-11 sm:w-11"
                            />
                            <button
                              type="button"
                              className="entry-enter-btn text-lg tracking-[0.08em] sm:text-xl"
                              disabled={!line.hasData}
                              onClick={(event) => {
                                event.stopPropagation();
                                openRouge(line.index);
                              }}
                            >
                              {ENTER_EXPLORE_LABEL}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ height: `${centerSpacer}px` }} />
                </div>
              </div>

              <div className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90 transition-opacity duration-300 ${canScrollUp ? "opacity-100" : "opacity-0"}`}>
                {UP_MARK}
              </div>
              <div className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90 transition-opacity duration-300 ${canScrollDown ? "opacity-100" : "opacity-0"}`}>
                {DOWN_MARK}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="absolute inset-0 z-30 flex flex-col transition-opacity duration-300"
        style={rougeLayerStyle}
        aria-hidden={!rougeActive}
        inert={rougeActive ? undefined : ""}
      >
        <header ref={topBarRef} className="rouge-topbar">
          <div className="rouge-topbar-section">
            <span>
              {VIEWER_LABEL}
              {"\uFF1A"}
              {viewerName || "-"}
            </span>
          </div>
          <div className="rouge-topbar-center">
            <span className="rouge-day-badge">Day {displayDayNumber}</span>
            <div
              className="rouge-debuff-wrap"
              onMouseEnter={openDebuffHint}
              onMouseLeave={closeDebuffHint}
            >
              <button
                type="button"
                className="rouge-debuff-trigger"
                onClick={showDebuffHintTemporarily}
              >
                <span className="rouge-debuff-prefix">{"\u5389:"}</span>
                <span className="rouge-debuff-value">{debuffText}</span>
              </button>
              <button
                type="button"
                className="rouge-debuff-info"
                aria-label="Show debuff hint"
                onClick={showDebuffHintTemporarily}
              >
                i
              </button>
              {debuffHintOpen && (
                <div className="rouge-debuff-dialog">{debuffHintText}</div>
              )}
            </div>
          </div>
          <div className="rouge-topbar-section justify-end">
            <span className="hidden sm:block">{activeTime?.city || "-"}</span>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
          <div
            ref={boardRef}
            className={`rouge-board-scroll rouge-drag-scroll-x h-full w-full overflow-auto rounded-lg border border-white/20 bg-black/20 p-4 ${isBoardMouseDragging ? "rouge-drag-active" : ""}`}
            onScroll={recalculateConnections}
            onMouseDown={handleBoardMouseDown}
            onClickCapture={handleBoardClickCapture}
            onTouchStart={handleBoardTouchStart}
            onTouchMove={handleBoardTouchMove}
            onTouchEnd={handleBoardTouchEnd}
            onTouchCancel={handleBoardTouchEnd}
            style={{
              "--card-width": `${boardLayout.cardWidth}px`,
              "--card-height": `${boardLayout.cardHeight}px`,
              "--card-tag-height": `${boardLayout.cardTagHeight}px`,
              "--card-item-gap": `${boardLayout.cardItemGap}px`,
              "--column-gap": `${boardLayout.columnGap}px`,
              "--column-track": `${boardLayout.columnTrack}px`,
              "--chain-gap": `${boardLayout.chainGap}px`,
              "--column-stack-gap": `${boardLayout.columnStackGap}px`,
            }}
          >
            <div
              ref={boardCanvasRef}
              className="rouge-board-canvas relative min-h-full w-fit min-w-full"
            >
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {connections.map((item) => (
                  <path
                    key={item.key}
                    d={item.path}
                    stroke={item.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    className="rouge-connection"
                  />
                ))}
              </svg>

              <div className="rouge-columns-grid relative z-10">
                {columnStates.map((columnState) => {
                  const selectedKey = columnState.selectedKey;
                  return (
                    <section
                      key={columnState.column.columnIndex}
                      className="rouge-column-stack"
                    >

                      {columnState.cards.map((cardState) => {
                        const card = cardState.card;
                        const isChosen = selectedKey === card.key;
                        const revealed = revealByCardKey[card.key];
                        const lockedByColumnChoice = Boolean(selectedKey && !isChosen);
                        const lockedByPath = !revealed;
                        const locked = lockedByColumnChoice || lockedByPath;
                        const focused = detailCardKey === card.key && revealed;
                        const displayActivities =
                          card.activities.length > 0
                            ? card.activities
                            : [{ akTag: "" }];

                        return (
                          <div key={card.key} className="rouge-card-chain">
                            {displayActivities.map((activity, idx) => {
                              const isFirst = idx === 0;
                              const isLast = idx === displayActivities.length - 1;
                              const activityTag = activity.akTag || card.akTags[0] || "";
                              const activityColor = getTagColor(
                                activityTag || card.akTags[0],
                              );
                              const activityIcon = getTagIcon(activityTag);
                              return (
                                <div
                                  key={`${card.key}-activity-card-${idx + 1}`}
                                  className="rouge-card-chain-item"
                                >
                                  <button
                                    ref={(node) => {
                                      if (node) {
                                        cardRefs.current[`${card.key}::activity-${idx}`] = node;
                                      } else {
                                        delete cardRefs.current[`${card.key}::activity-${idx}`];
                                      }
                                      if (isFirst) {
                                        if (node) {
                                          cardRefs.current[`${card.key}::start`] = node;
                                        } else {
                                          delete cardRefs.current[`${card.key}::start`];
                                        }
                                      }
                                      if (isLast) {
                                        if (node) {
                                          cardRefs.current[`${card.key}::end`] = node;
                                        } else {
                                          delete cardRefs.current[`${card.key}::end`];
                                        }
                                      }
                                    }}
                                    type="button"
                                    className={`rouge-card rouge-activity-card ${isChosen ? "rouge-card-chosen" : ""} ${locked ? "rouge-card-locked" : ""} ${focused ? "rouge-card-focused" : ""} ${revealed ? "" : "rouge-card-placeholder"}`}
                                    style={{
                                      "--rouge-card-color": activityColor,
                                      "--rouge-card-bg": withAlpha(activityColor, 0.82),
                                      "--rouge-card-border": withAlpha(activityColor, 0.98),
                                    }}
                                    onClick={() => {
                                      if (!locked) {
                                        setDetailCardKey(card.key);
                                        setDetailActivityIndex(idx);
                                      }
                                    }}
                                  >
                                    <div className="rouge-card-content">
                                      {activityIcon && (
                                        <img
                                          src={activityIcon}
                                          alt=""
                                          aria-hidden="true"
                                          className="rouge-card-icon"
                                        />
                                      )}
                                    </div>
                                  </button>
                                  <div
                                    className={`rouge-card-tag-stripe ${revealed ? "" : "rouge-card-tag-stripe-placeholder"} ${locked ? "rouge-card-tag-stripe-locked" : ""}`}
                                    style={{
                                      "--rouge-card-color": activityColor,
                                    }}
                                  >
                                    <span className="rouge-card-tag-text">
                                      {activityTag || "No ak_tag"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside
          ref={detailDrawerRef}
          className={`rouge-detail-drawer ${detailCard ? "rouge-detail-open" : ""}`}
        >
          <div
            ref={detailScrollRef}
            className={`rouge-detail-inner rouge-drag-scroll-y ${isDetailMouseDragging ? "rouge-drag-active" : ""}`}
            onMouseDown={handleDetailMouseDown}
            onClickCapture={handleDetailClickCapture}
            onTouchStart={handleDetailTouchStart}
            onTouchMove={handleDetailTouchMove}
            onTouchEnd={handleDetailTouchEnd}
            onTouchCancel={handleDetailTouchEnd}
          >
            {!detailCard && (
              <div className="text-sm text-white/80">Click a card to view details.</div>
            )}
            {detailCard && (
              <>
                <div className="rouge-detail-head">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {detailCard.time || "Time Pending"}
                  </div>
                  <div
                    className="rouge-detail-title-block"
                    style={{
                      "--rouge-detail-title-color": detailTitleColor,
                    }}
                  >
                    <div className="rouge-detail-title-tag">{detailTag || "No ak_tag"}</div>
                    <h3 className="rouge-detail-title-text">
                      {detailActivity?.activity || detailCard.title}
                    </h3>
                  </div>
                </div>

                <div className="rouge-detail-body">
                  {detailCard.activities.map((activity, idx) => (
                    <article key={`${detailCard.key}-${idx + 1}`} className="rouge-activity-panel">
                      <div className="rouge-activity-top">
                        <div className="rouge-activity-title">
                          {activity.activity || `Activity ${idx + 1}`}
                        </div>
                        <div className="rouge-activity-score">
                          {formatStars(activity.recommendationStars)}
                        </div>
                      </div>
                      <div className="rouge-activity-grid">
                        <span>{`\uD83D\uDCCD 地点：${activity.location || "-"}`}</span>
                        <span>{`\uD83D\uDDFA\uFE0F 位置：${activity.geography || "-"}`}</span>
                        <span>{`\u23F1\uFE0F 时长：${activity.duration || "-"}`}</span>
                      </div>
                      <p className="rouge-detail-note">
                        {`\uD83D\uDCDD 备注：${activity.notes || "-"}`}
                      </p>
                      {activity.negatives && (
                        <p className="rouge-detail-note">
                          {`\u274C 缺点：${activity.negatives}`}
                        </p>
                      )}
                      {activity.links && activity.links.length > 0 && (
                        <div className="rouge-detail-links">
                          {activity.links.map((link, linkIdx) => {
                            const label = link.name || "未命名";
                            const safeUrl = link.url || "";
                            return (
                              <div
                                key={`${detailCard.key}-${idx + 1}-link-${linkIdx + 1}`}
                                className="rouge-detail-link-row"
                              >
                                <span className="rouge-detail-link-text">
                                  {`\uD83D\uDD17 链接：${label}: `}
                                </span>
                                {safeUrl ? (
                                  <a
                                    href={safeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rouge-detail-link"
                                  >
                                    {safeUrl}
                                  </a>
                                ) : (
                                  <span className="rouge-detail-link-text">-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <button
                  type="button"
                  className="rouge-action-btn"
                  disabled={
                    Boolean(
                      selectedByColumn[String(detailCard.columnIndex)] === detailCard.key,
                    )
                  }
                  onClick={() => {
                    const selectedKey =
                      selectedByColumn[String(detailCard.columnIndex)] ?? "";
                    if (!selectedKey || selectedKey === detailCard.key) {
                      chooseCard(detailCard);
                      setDetailCardKey("");
                      setDetailActivityIndex(0);
                    }
                  }}
                >
                  {START_ACTION_LABEL}
                </button>
              </>
            )}
          </div>
        </aside>

        <div className="rouge-reset-wrap">
          <button
            type="button"
            className="rouge-reset-btn"
            onClick={resetRougeBoard}
          >
            {RESET_LABEL}
          </button>
        </div>
      </section>

      <section
        className="absolute inset-0 z-40 flex transition-opacity duration-300"
        style={successLayerStyle}
        aria-hidden={!successActive}
        inert={successActive ? undefined : ""}
      >
        <div className="success-page-shell">
          <header className="success-page-top">
            {DOCTOR_LABEL} {doctorName || "-"}
          </header>

          <div className="success-page-middle">
            <div className="success-page-middle-top">
              <h2 className="success-page-visitor-title">{VISITOR_LIST_LABEL}</h2>
              <p className="success-page-mate">{mateText}</p>
            </div>

            <div className="success-page-middle-bottom">
              <div className="success-page-list-wrap">
                {chosenCardTitles.length === 0 && (
                  <p className="success-page-empty">-</p>
                )}
                {chosenCardTitles.length > 0 && (
                  <ul className="success-page-list">
                    {chosenCardTitles.map((title, titleIndex) => (
                      <li key={`${title}-${titleIndex}`} className="success-page-item">
                        {title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="success-page-bottom">
            <button
              type="button"
              className="success-return-btn"
              onClick={returnToEntry}
            >
              {RETURN_ENTRY_LABEL}
            </button>
          </div>
        </div>
      </section>

      <div ref={cursorRef} className="rouge-custom-cursor" aria-hidden="true">
        <div className="rouge-custom-cursor-icon" />
      </div>
    </main>
  );
}
