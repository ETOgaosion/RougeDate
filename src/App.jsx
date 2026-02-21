import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mainBackground from "../assets/images/main_background_heng.png";
import checkCircleIcon from "../assets/icons/check_circle.svg";
import battleIcon from "../assets/icons/battle.svg";
import bossIcon from "../assets/icons/boss.svg";
import boxIcon from "../assets/icons/box.svg";
import dialogIcon from "../assets/icons/dialog.svg";
import diceIcon from "../assets/icons/dice.svg";
import exitIcon from "../assets/icons/exit.svg";
import flowerIcon from "../assets/icons/flower.svg";
import towerIcon from "../assets/icons/tower.svg";
import viewerRaw from "../date_arrangement/user?raw";
import { ak_tag_color_map, ak_tag_icon_map } from "./definedMaps";
import { buildTimelineData, resolveDayBackground } from "./rougeData";

const LEFT_LABEL = "\u8bf7\u541b\u8fdb\u5165";
const VIEWER_LABEL = "\u6e38\u5ba2";
const ENTER_EXPLORE_LABEL = "\u8fdb\u5165\u63a2\u7d22";
const START_ACTION_LABEL = "\u524d\u5f80\u51fa\u53d1";
const UP_MARK = "\u25b2";
const DOWN_MARK = "\u25bc";

const PHASE_ENTRY = "entry";
const PHASE_FADE = "fade-content";
const PHASE_BRIGHT = "bright-main";
const PHASE_CROSS = "cross-dissolve";
const PHASE_ROUGE = "rouge";

const iconByKey = {
  battle: battleIcon,
  boss: bossIcon,
  box: boxIcon,
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
  const viewerName = viewerRaw.trim();
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

  const [selectedIndex, setSelectedIndex] = useState(latestIndex);
  const [activeTimeIndex, setActiveTimeIndex] = useState(latestIndex);
  const [activeDayPosition, setActiveDayPosition] = useState(0);
  const [phase, setPhase] = useState(PHASE_ENTRY);
  const [centerSpacer, setCenterSpacer] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [selectedByColumn, setSelectedByColumn] = useState({});
  const [detailCardKey, setDetailCardKey] = useState("");
  const [detailActivityIndex, setDetailActivityIndex] = useState(0);
  const [connections, setConnections] = useState([]);
  const [debuffHintOpen, setDebuffHintOpen] = useState(false);
  const [boardLayout, setBoardLayout] = useState({
    cardWidth: 220,
    columnGap: 72,
    columnTrack: 300,
    chainGap: 26,
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
    const unit = (viewportWidth * 0.9) / 3;
    const cardWidth = Math.max(196, Math.min(340, Math.round(unit * 0.56)));
    const columnGap = Math.max(52, Math.round(unit - cardWidth));
    const columnTrack = Math.max(cardWidth + 20, Math.round(unit + cardWidth * 0.1));
    const chainGap = Math.max(14, Math.round(cardWidth * 0.1));

    setBoardLayout((previous) => {
      if (
        previous.cardWidth === cardWidth &&
        previous.columnGap === columnGap &&
        previous.columnTrack === columnTrack &&
        previous.chainGap === chainGap
      ) {
        return previous;
      }
      return {
        cardWidth,
        columnGap,
        columnTrack,
        chainGap,
      };
    });
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

    const getAnchor = (element, side) => {
      const canvasRect = boardCanvasRef.current.getBoundingClientRect();
      const rect = element.getBoundingClientRect();

      if (side === "right") {
        return {
          x: rect.right - canvasRect.left,
          y: rect.top + rect.height / 2 - canvasRect.top,
        };
      }
      if (side === "left") {
        return {
          x: rect.left - canvasRect.left,
          y: rect.top + rect.height / 2 - canvasRect.top,
        };
      }
      if (side === "bottom") {
        return {
          x: rect.left + rect.width / 2 - canvasRect.left,
          y: rect.bottom - canvasRect.top,
        };
      }
      return {
        x: rect.left + rect.width / 2 - canvasRect.left,
        y: rect.top - canvasRect.top,
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
      setSelectedByColumn({});
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

      setSelectedByColumn((previous) => {
        const next = { ...previous, [columnKey]: card.key };
        const currentIndex = orderedKeys.indexOf(columnKey);
        for (let pos = currentIndex + 1; pos < orderedKeys.length; pos += 1) {
          delete next[orderedKeys[pos]];
        }
        return next;
      });

      setDetailCardKey(card.key);
      setDetailActivityIndex(0);
    },
    [activeDay],
  );

  useEffect(() => {
    setSelectedIndex(latestIndex);
    setActiveTimeIndex(latestIndex);
  }, [latestIndex]);

  useEffect(() => {
    if (phase === PHASE_ENTRY || phase === PHASE_ROUGE) {
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
    setSelectedByColumn({});
    setDetailCardKey("");
    setDetailActivityIndex(0);
  }, [activeDayPosition, activeTimeIndex]);

  useEffect(() => {
    setDebuffHintOpen(false);
  }, [activeDayPosition, activeTimeIndex]);

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

  const entryOpacity = phase === PHASE_ENTRY ? 1 : 0;
  const entryEvents = phase === PHASE_ENTRY ? "auto" : "none";
  const rougeOpacity = phase === PHASE_ROUGE ? 1 : 0;
  const rougeEvents = phase === PHASE_ROUGE ? "auto" : "none";
  const mainOpacity = phase === PHASE_CROSS || phase === PHASE_ROUGE ? 0 : 1;
  const dayOpacity = phase === PHASE_CROSS || phase === PHASE_ROUGE ? 1 : 0;
  const shadowOpacity =
    phase === PHASE_ENTRY ? 0.58 : phase === PHASE_FADE ? 0.32 : 0.14;

  return (
    <main className="relative h-screen w-screen overflow-hidden text-slateMist">
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
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: shadowOpacity }}
      />

      <section
        className="absolute inset-0 z-20 flex flex-col transition-opacity duration-300"
        style={{ opacity: entryOpacity, pointerEvents: entryEvents }}
      >
        <div className="left-title flex h-24 items-center justify-center px-4 text-center text-3xl tracking-[0.1em] text-white sm:h-28 sm:text-4xl">
          {VIEWER_LABEL}
          {"\uFF1A"}
          {viewerName || "-"}
        </div>

        <div className="min-h-0 flex-1 px-4 pb-5 sm:px-8 sm:pb-8">
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="relative overflow-hidden lg:col-span-4 lg:flex lg:items-center lg:justify-center">
              <div className="concentric-circle pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
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
        style={{ opacity: rougeOpacity, pointerEvents: rougeEvents }}
      >
        <header className="rouge-topbar">
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
            className="rouge-board-scroll h-full w-full overflow-auto rounded-lg border border-white/20 bg-black/20 p-4"
            onScroll={recalculateConnections}
            style={{
              "--card-width": `${boardLayout.cardWidth}px`,
              "--column-gap": `${boardLayout.columnGap}px`,
              "--column-track": `${boardLayout.columnTrack}px`,
              "--chain-gap": `${boardLayout.chainGap}px`,
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
                                      "--rouge-card-bg": withAlpha(activityColor, 0.46),
                                      "--rouge-card-border": withAlpha(activityColor, 0.92),
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
                                    className={`rouge-card-tag-stripe ${revealed ? "" : "rouge-card-tag-stripe-placeholder"}`}
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

        <aside className={`rouge-detail-drawer ${detailCard ? "rouge-detail-open" : ""}`}>
          <div className="rouge-detail-inner">
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
                  onClick={() => {
                    const selectedKey =
                      selectedByColumn[String(detailCard.columnIndex)] ?? "";
                    if (!selectedKey || selectedKey === detailCard.key) {
                      chooseCard(detailCard);
                    }
                  }}
                >
                  {START_ACTION_LABEL}
                </button>
              </>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
