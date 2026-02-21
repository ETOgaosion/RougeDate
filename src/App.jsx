import { useEffect, useMemo, useRef, useState } from "react";
import mainBackground from "../assets/images/main_background_heng.png";
import checkCircleIcon from "../assets/icons/check_circle.svg";
import viewerRaw from "../date_arrangement/user?raw";

const LEFT_LABEL = "\u8bf7\u541b\u8fdb\u5165";
const VIEWER_LABEL = "\u6e38\u5ba2";
const UP_MARK = "\u25b2";
const DOWN_MARK = "\u25bc";
const ENTER_EXPLORE_LABEL = "\u8fdb\u5165\u63a2\u7d22";

function buildTimeline() {
  const timeFiles = import.meta.glob("../date_arrangement/time_*.json", {
    eager: true,
  });

  let maxIndex = 0;
  const detailByIndex = {};

  for (const [filePath, fileData] of Object.entries(timeFiles)) {
    const match = filePath.match(/time_(\d+)\.json$/);
    if (!match) {
      continue;
    }

    const idx = Number(match[1]);
    const jsonData = fileData?.default ?? fileData;

    if (Number.isFinite(idx)) {
      maxIndex = Math.max(maxIndex, idx);
      detailByIndex[idx] = {
        city: jsonData?.city ?? "",
        province: jsonData?.province ?? "",
        country: jsonData?.country ?? "",
        duration: jsonData?.duration ?? "",
        withPerson: jsonData?.mate ?? "",
      };
    }
  }

  return Array.from({ length: maxIndex }, (_, i) => {
    const idx = i + 1;
    const detail = detailByIndex[idx] ?? {};
    return {
      index: idx,
      city: detail.city ?? "",
      province: detail.province ?? "",
      country: detail.country ?? "",
      duration: detail.duration ?? "",
      withPerson: detail.withPerson ?? "",
    };
  }).sort((a, b) => b.index - a.index);
}

export default function App() {
  const viewerName = viewerRaw.trim();
  const lines = useMemo(() => buildTimeline(), []);
  const latestIndex = useMemo(() => {
    if (!lines.length) {
      return 1;
    }
    return Math.max(...lines.map((line) => line.index));
  }, [lines]);
  const scrollAreaRef = useRef(null);
  const rowRefs = useRef({});
  const didInitRef = useRef(false);
  const initializingRef = useRef(true);

  const [selectedIndex, setSelectedIndex] = useState(latestIndex);
  const [centerSpacer, setCenterSpacer] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = (element) => {
    if (!element) {
      return;
    }

    setCanScrollUp(element.scrollTop > 4);
    setCanScrollDown(
      element.scrollTop + element.clientHeight < element.scrollHeight - 4,
    );
  };

  const updateCenterSpacer = () => {
    const scrollArea = scrollAreaRef.current;
    const firstRow = lines.length > 0 ? rowRefs.current[lines[0].index] : null;

    if (!scrollArea || !firstRow) {
      setCenterSpacer(0);
      return;
    }

    const spacer = Math.max(
      0,
      scrollArea.clientHeight / 2 - firstRow.offsetHeight / 2,
    );
    setCenterSpacer(spacer);
  };

  const updateSelectedByCenter = () => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    const scrollRect = scrollArea.getBoundingClientRect();
    const centerY = scrollRect.top + scrollRect.height / 2;

    let nearestIndex = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const line of lines) {
      const row = rowRefs.current[line.index];
      if (!row) {
        continue;
      }

      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.top + rowRect.height / 2;
      const distance = Math.abs(rowCenter - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = line.index;
      }
    }

    if (nearestIndex !== null) {
      setSelectedIndex((prev) => (prev === nearestIndex ? prev : nearestIndex));
    }
  };

  useEffect(() => {
    setSelectedIndex(latestIndex);
  }, [latestIndex]);

  useEffect(() => {
    const onResize = () => {
      updateCenterSpacer();
      updateScrollState(scrollAreaRef.current);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [lines]);

  useEffect(() => {
    if (!lines.length || didInitRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      updateCenterSpacer();

      const scrollArea = scrollAreaRef.current;
      const defaultRow = rowRefs.current[latestIndex];

      if (scrollArea && defaultRow) {
        scrollArea.scrollTop =
          defaultRow.offsetTop -
          scrollArea.clientHeight / 2 +
          defaultRow.offsetHeight / 2;
        setSelectedIndex(latestIndex);
      }

      updateScrollState(scrollArea);
      didInitRef.current = true;
      initializingRef.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [lines.length, latestIndex]);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden text-slateMist">
      <img
        src={mainBackground}
        alt="Main background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="bg-darken absolute inset-0 bg-black opacity-0" />

      <div className="left-title relative z-20 flex h-24 shrink-0 items-center justify-center px-4 text-center text-3xl tracking-[0.1em] text-white sm:h-28 sm:text-4xl">
        {VIEWER_LABEL}
        {"\uFF1A"}
        {viewerName || "-"}
      </div>

      <section className="content-reveal relative z-10 min-h-0 flex-1 px-4 pb-5 sm:px-8 sm:pb-8">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="relative overflow-hidden border-white/20 lg:col-span-4 lg:flex lg:items-center lg:justify-center">
            <div className="concentric-circle pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
            <h1 className="left-title relative z-10 px-4 py-8 text-center text-4xl font-semibold tracking-[0.35em] text-amber-50 sm:text-5xl lg:px-2 lg:text-6xl">
              {LEFT_LABEL}
            </h1>
          </div>

          <div className="hidden lg:relative lg:col-span-1 lg:block">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="h-24 w-20 xl:h-28 xl:w-24 drop-shadow-[0_0_16px_rgba(255,255,255,0.46)]"
                style={{
                  clipPath: "polygon(0 0, 0 100%, 100% 50%)",
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 82%)",
                }}
              />
            </div>
          </div>

          <div className="relative min-h-0 lg:col-span-7">
            <div
              ref={scrollAreaRef}
              className="timeline-scroll h-full overflow-y-auto rounded-xl border border-white/20 p-3 sm:p-4"
              onScroll={(event) => {
                updateScrollState(event.currentTarget);
                if (!initializingRef.current) {
                  updateSelectedByCenter();
                }
              }}
            >
              <div className="flex min-h-full flex-col gap-3">
                <div style={{ height: `${centerSpacer}px` }} />

                {lines.length === 0 && (
                  <div className="rounded-lg border border-white/20 bg-white/5 p-4 text-sm text-slate-200/90">
                    No `time_x.json` entries found in `date_arrangement`.
                  </div>
                )}

                {lines.map((line) => {
                  const isSelected = line.index === selectedIndex;
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
                      className={`flex min-h-[18vh] w-full items-center gap-3 pl-3 pr-8 sm:pl-5 sm:pr-10 ${
                        isSelected
                          ? "bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0.42)_100%)]"
                          : ""
                      }`}
                    >
                      <div
                        className={`line-number mr-8 flex h-28 w-24 items-center justify-center text-center text-8xl leading-none sm:mr-10 sm:h-32 sm:w-28 sm:text-9xl ${
                          isSelected ? "text-emerald-300" : "text-white/60"
                        }`}
                      >
                        {line.index}
                      </div>
                      <div
                        className={`h-28 w-[3px] shrink-0 rounded-full sm:h-32 ${
                          isSelected
                            ? "bg-[linear-gradient(180deg,rgba(120,255,220,0.9)_0%,rgba(255,255,255,0.95)_100%)] shadow-[0_0_12px_rgba(180,255,235,0.7)]"
                            : "bg-[linear-gradient(180deg,rgba(220,230,238,0.75)_0%,rgba(245,245,245,0.92)_100%)]"
                        }`}
                      />
                      <div className="line-city flex-1">
                        <div className="text-2xl tracking-[0.08em] text-slate-100 sm:text-3xl">
                          {line.city || "-"}
                        </div>
                        <div className="mt-1 text-sm tracking-[0.06em] text-white/72 sm:text-base">
                          {line.province || "-"} / {line.country || "-"} /{" "}
                          {line.duration || "-"} / {line.withPerson || "-"}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-2 mr-2 flex shrink-0 items-center gap-3 text-white/95 sm:mr-4">
                          <img
                            src={checkCircleIcon}
                            alt=""
                            aria-hidden="true"
                            className="h-10 w-10 sm:h-11 sm:w-11"
                          />
                          <span className="text-xl tracking-[0.08em] sm:text-2xl">
                            {ENTER_EXPLORE_LABEL}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ height: `${centerSpacer}px` }} />
              </div>
            </div>

            <div
              className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90 transition-opacity duration-300 ${
                canScrollUp ? "opacity-100" : "opacity-0"
              }`}
            >
              {UP_MARK}
            </div>

            <div
              className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90 transition-opacity duration-300 ${
                canScrollDown ? "opacity-100" : "opacity-0"
              }`}
            >
              {DOWN_MARK}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
