"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClockCheck,
  BookOpenText,
  Boxes,
  CheckSquare,
  Clock3,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

import { AG_COLLECTION } from "@/lib/agendamentoConfig";
import {
  getClickUpAssigneesText,
  getClickUpPriorityText,
  getClickUpStatusText,
  getClickUpTaskDescription,
} from "@/lib/clickup";
import { pb } from "@/lib/pocketbase";

type Task = {
  id: string;
  name: string;
  description?: string | null;
  markdown_description?: string | null;
  status?: string | { status?: string; type?: string; color?: string } | null;
  priority?: {
    priority?: string;
    color?: string;
  } | null;
  assignees?: Array<{
    id?: number | string;
    username?: string;
    email?: string;
  }>;
  date_created?: string;
  date_updated?: string;
  list?: { name?: string };
};

type ClickUpResponse = {
  tasks?: Task[];
  todo?: Task[];
  inProgress?: Task[];
  doing?: Task[];
};

type Agendamento = {
  id: string;
  data: string;
  inicio: number;
  fim: number;
  status?: string;
  expand?: {
    usuario?: {
      name?: string;
      email?: string;
    };
  };
};

type Emprestimo = {
  id: string;
  status?: string;
  agendamento?: string;
  agendamentos?: string;
  entrada_em?: string;
  devolvido_em?: string;
  created?: string;
};

const REFRESH_SECONDS = 60;
const DASHBOARD_VIEW_CACHE_KEY = "dashboard-view-cache-v2";
const DASHBOARD_VIEW_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

type DashboardViewCache = {
  todoTasks: Task[];
  doingTasks: Task[];
  diary: Task[];
  cachedAt: number;
};

function getLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyFromPocketBase(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function currentMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(date: Date | null) {
  if (!date) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value?: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitTaskBuckets(data: ClickUpResponse) {
  const directTodo = Array.isArray(data.todo) ? data.todo : [];

  const directDoing = Array.isArray(data.inProgress)
    ? data.inProgress
    : Array.isArray(data.doing)
      ? data.doing
      : [];

  if (directTodo.length || directDoing.length) {
    return {
      todo: directTodo,
      doing: directDoing,
    };
  }

  const allTasks = Array.isArray(data.tasks) ? data.tasks : [];

  return allTasks.reduce(
    (acc, task) => {
      const status = normalizeText(getClickUpStatusText(task.status));

      if (
        status.includes("andamento") ||
        status.includes("progress") ||
        status.includes("doing") ||
        status.includes("in progress") ||
        status.includes("em andamento")
      ) {
        acc.doing.push(task);
      } else {
        acc.todo.push(task);
      }

      return acc;
    },
    { todo: [] as Task[], doing: [] as Task[] }
  );
}

function getPreviousSchoolDayIso(date: Date) {
  const previous = new Date(date);
  const day = previous.getDay();

  if (day === 1) {
    previous.setDate(previous.getDate() - 3);
  } else if (day === 0) {
    previous.setDate(previous.getDate() - 2);
  } else {
    previous.setDate(previous.getDate() - 1);
  }

  return getLocalIsoDate(previous);
}

function parseDateFromDiaryTitle(title: string) {
  const match = title.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);

  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const rawYear = match[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

  return {
    iso: `${year}-${month}-${day}`,
    br: `${day}/${month}/${year}`,
  };
}

function getDiaryAuthorFromTitle(title: string) {
  const semData = title.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, "");
  const limpo = semData.replace(/[-–—]/g, "").trim();

  return limpo || "Equipe";
}

function getTaskAssigneeNames(item: Task) {
  const fromRaw = item.assignees
    ?.map((assignee) => assignee.username || assignee.email || "")
    .filter(Boolean);

  if (fromRaw && fromRaw.length > 0) {
    return fromRaw;
  }

  const text = getClickUpAssigneesText(item);

  if (!text || normalizeText(text).includes("sem responsavel")) {
    return [];
  }

  return text
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function getInitials(name: string) {
  const ignored = new Set(["da", "de", "do", "das", "dos", "e"]);

  const parts = normalizeText(name)
    .split(/\s+/)
    .filter((part) => part && !ignored.has(part));

  if (parts.length === 0) return "T";

  const first = parts[0]?.charAt(0) || "";
  const second = parts[1]?.charAt(0) || "";

  return `${first}${second}`.toUpperCase();
}

function AutoScrollArea({
  children,
  resetKey,
  speed = 0.28,
  duplicate = true,
  className = "",
  contentClassName = "space-y-4",
}: {
  children: ReactNode;
  resetKey: string;
  speed?: number;
  duplicate?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const firstBlockRef = useRef<HTMLDivElement | null>(null);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [resetKey]);

  useEffect(() => {
    let frame = 0;
    let lastTime = performance.now();

    function animate(time: number) {
      const viewport = viewportRef.current;
      const firstBlock = firstBlockRef.current;

      if (!viewport || !firstBlock) {
        frame = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(40, time - lastTime);
      lastTime = time;

      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      const firstBlockHeight = firstBlock.scrollHeight;
      const viewportHeight = viewport.clientHeight;
      const cycleHeight = firstBlockHeight + 16;

      if (maxScroll > 8 && time >= pauseUntilRef.current) {
        const movement = speed * (delta / 16.67);

        viewport.scrollTop += movement;

        if (duplicate && firstBlockHeight > viewportHeight + 8) {
          if (viewport.scrollTop >= cycleHeight) {
            viewport.scrollTop -= cycleHeight;
          }
        } else if (viewport.scrollTop >= maxScroll - 2) {
          viewport.scrollTop = 0;
        }
      }

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [speed, duplicate]);

  function pauseAutoScroll() {
    pauseUntilRef.current = performance.now() + 6000;
  }

  return (
    <div
      ref={viewportRef}
      onWheel={pauseAutoScroll}
      onMouseDown={pauseAutoScroll}
      onTouchStart={pauseAutoScroll}
      className={`relative min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div ref={firstBlockRef} className={contentClassName}>
        {children}
      </div>

      {duplicate ? (
        <div aria-hidden className={`${contentClassName} pt-4`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}


function SmoothMarqueeArea({
  children,
  resetKey,
  speed = 0.38,
  duplicate = false,
  className = "",
  contentClassName = "space-y-4",
}: {
  children: ReactNode;
  resetKey: string;
  speed?: number;
  duplicate?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const firstBlockRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);

  function getLimits() {
    const viewport = viewportRef.current;
    const firstBlock = firstBlockRef.current;

    if (!viewport || !firstBlock) {
      return {
        cycleHeight: 0,
        maxOffset: 0,
      };
    }

    const blockHeight = firstBlock.scrollHeight;
    const viewportHeight = viewport.clientHeight;

    return {
      cycleHeight: blockHeight + 16,
      maxOffset: Math.max(0, blockHeight - viewportHeight),
    };
  }

  function applyOffset(nextOffset: number, wrap = false) {
    const inner = innerRef.current;
    const { cycleHeight, maxOffset } = getLimits();

    if (!inner) return;

    let normalized = nextOffset;

    if (duplicate && cycleHeight > 0) {
      while (normalized < 0) {
        normalized += cycleHeight;
      }

      while (normalized >= cycleHeight) {
        normalized -= cycleHeight;
      }
    } else if (wrap) {
      if (normalized < 0) {
        normalized = maxOffset;
      }

      if (normalized > maxOffset) {
        normalized = 0;
      }
    } else {
      normalized = Math.max(0, Math.min(normalized, maxOffset));
    }

    offsetRef.current = normalized;
    inner.style.transform = `translate3d(0, -${normalized}px, 0)`;
  }

  useEffect(() => {
    offsetRef.current = 0;

    if (innerRef.current) {
      innerRef.current.style.transform = "translate3d(0, 0px, 0)";
    }
  }, [resetKey]);

  useEffect(() => {
    let frame = 0;
    let lastTime = performance.now();

    function animate(time: number) {
      const viewport = viewportRef.current;
      const firstBlock = firstBlockRef.current;

      if (!viewport || !firstBlock) {
        frame = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(40, time - lastTime);
      lastTime = time;

      const blockHeight = firstBlock.scrollHeight;
      const viewportHeight = viewport.clientHeight;

      if (
        blockHeight > viewportHeight + 8 &&
        time >= pauseUntilRef.current &&
        !isHoveringRef.current
      ) {
        const movement = speed * (delta / 16.67);

        applyOffset(offsetRef.current + movement, true);
      }

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [speed, duplicate]);

  function pauseAutoScroll(milliseconds = 8000) {
    pauseUntilRef.current = performance.now() + milliseconds;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    isHoveringRef.current = true;
    pauseAutoScroll(9000);

    const manualSpeed = 0.9;
    applyOffset(offsetRef.current + event.deltaY * manualSpeed, false);
  }

  return (
    <div
      ref={viewportRef}
      onMouseEnter={() => {
        isHoveringRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        pauseUntilRef.current = 0;
      }}
      onWheel={handleWheel}
      onMouseDown={() => pauseAutoScroll(9000)}
      onTouchStart={() => pauseAutoScroll(9000)}
      className={`relative min-h-0 overflow-hidden ${className}`}
    >
      <div ref={innerRef} className="will-change-transform">
        <div ref={firstBlockRef} className={contentClassName}>
          {children}
        </div>

        {duplicate ? (
          <div aria-hidden className={`${contentClassName} pt-4`}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardView() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(REFRESH_SECONDS);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [doingTasks, setDoingTasks] = useState<Task[]>([]);
  const [diary, setDiary] = useState<Task[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);

  function irParaAgendamentosAgora() {
    if (hasNavigatedRef.current) return;

    hasNavigatedRef.current = true;
    setIsLeaving(true);

    window.setTimeout(() => {
      router.replace("/dashboard/agendamentos-tv");
    }, 520);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 40);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const rawCache = window.localStorage.getItem(DASHBOARD_VIEW_CACHE_KEY);

      if (!rawCache) return;

      const cache = JSON.parse(rawCache) as DashboardViewCache;
      const cacheAge = Date.now() - Number(cache.cachedAt || 0);
      const cacheIsFresh = cacheAge >= 0 && cacheAge <= DASHBOARD_VIEW_CACHE_MAX_AGE_MS;

      if (!cacheIsFresh) return;

      setTodoTasks(Array.isArray(cache.todoTasks) ? cache.todoTasks : []);
      setDoingTasks(Array.isArray(cache.doingTasks) ? cache.doingTasks : []);
      setDiary(Array.isArray(cache.diary) ? cache.diary : []);
      setLoadedFromCache(true);
      setLastUpdatedAt(new Date(cache.cachedAt));
      setIsLoadingDashboard(false);
    } catch (error) {
      console.warn("Cache local do dashboard ignorado:", error);
    }
  }, []);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();

    const intervalTimer = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) return 0;
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdown);
  }, []);

  useEffect(() => {
    if (secondsRemaining > 0 || hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;
    setIsLeaving(true);

    const timer = window.setTimeout(() => {
      router.replace("/dashboard/agendamentos-tv");
    }, 520);

    return () => window.clearTimeout(timer);
  }, [secondsRemaining, router]);

  useEffect(() => {
    async function loadAgendamentosData() {
      const collectionNames = Array.from(
        new Set([AG_COLLECTION, "agendamentos", "agendamentos_tmp"])
      );

      const results = await Promise.allSettled(
        collectionNames.map((collectionName) =>
          pb.collection(collectionName).getFullList<Agendamento>({
            expand: "usuario",
            sort: "data,inicio",
          })
        )
      );

      const merged = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );

      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    }

    async function loadDashboard() {
      setIsLoadingDashboard(true);

      try {
        const [tasksResult, diaryResult, agendamentosResult, emprestimosResult] =
          await Promise.allSettled([
            fetch("/api/tasks", { cache: "no-store" }).then(
              (response) => response.json() as Promise<ClickUpResponse>
            ),
            fetch("/api/diary", { cache: "no-store" }).then(
              (response) => response.json() as Promise<ClickUpResponse>
            ),
            loadAgendamentosData(),
            pb.collection("emprestimos").getFullList<Emprestimo>({
              sort: "-created",
            }),
          ]);

        let nextTodoTasks: Task[] | null = null;
        let nextDoingTasks: Task[] | null = null;
        let nextDiary: Task[] | null = null;

        if (tasksResult.status === "fulfilled") {
          const buckets = splitTaskBuckets(tasksResult.value);

          nextTodoTasks = buckets.todo;
          nextDoingTasks = buckets.doing;

          setTodoTasks(buckets.todo);
          setDoingTasks(buckets.doing);
        }

        if (diaryResult.status === "fulfilled") {
          nextDiary = Array.isArray(diaryResult.value.tasks)
            ? diaryResult.value.tasks
            : [];

          setDiary(nextDiary);
        }

        if (agendamentosResult.status === "fulfilled") {
          setAgendamentos(agendamentosResult.value);
        }

        if (emprestimosResult.status === "fulfilled") {
          setEmprestimos(emprestimosResult.value);
        }

        if (nextTodoTasks && nextDoingTasks && nextDiary) {
          const cachedAt = Date.now();

          window.localStorage.setItem(
            DASHBOARD_VIEW_CACHE_KEY,
            JSON.stringify({
              todoTasks: nextTodoTasks,
              doingTasks: nextDoingTasks,
              diary: nextDiary,
              cachedAt,
            } satisfies DashboardViewCache)
          );

          setLoadedFromCache(false);
          setLastUpdatedAt(new Date(cachedAt));
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoadingDashboard(false);
      }
    }

    loadDashboard();

    const refresh = window.setInterval(loadDashboard, REFRESH_SECONDS * 1000);

    return () => window.clearInterval(refresh);
  }, []);

  const todayIso = now ? getLocalIsoDate(now) : null;
  const previousSchoolDayIso = now ? getPreviousSchoolDayIso(now) : null;
  const todayMinutes = now ? currentMinutes(now) : null;

  const diaryVisible = useMemo(() => {
    if (!todayIso || !previousSchoolDayIso) return [];

    const allowedDates = new Set([todayIso, previousSchoolDayIso]);
    const unique = new Map<string, Task>();

    diary.forEach((item) => {
      const meta = parseDateFromDiaryTitle(item.name || "");

      if (!meta || !allowedDates.has(meta.iso)) {
        return;
      }

      const uniqueKey = item.id || `${item.name}-${meta.iso}`;

      if (!unique.has(uniqueKey)) {
        unique.set(uniqueKey, item);
      }
    });

    return Array.from(unique.values()).sort((a, b) => {
      const dateA = parseDateFromDiaryTitle(a.name || "")?.iso || "";
      const dateB = parseDateFromDiaryTitle(b.name || "")?.iso || "";

      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [diary, todayIso, previousSchoolDayIso]);

  const agendamentosHoje = useMemo(
    () =>
      agendamentos
        .filter(
          (item) =>
            (!todayIso || getDateKeyFromPocketBase(item.data) === todayIso) &&
            item.status !== "cancelado"
        )
        .sort((a, b) => a.inicio - b.inicio),
    [agendamentos, todayIso]
  );

  const emprestimosEmUso = useMemo(
    () => emprestimos.filter((item) => item.status === "em_uso"),
    [emprestimos]
  );

  const agendamentosComStatus = useMemo(
    () =>
      agendamentosHoje.map((agendamento) => {
        const emprestimosDoAgendamento = emprestimosEmUso.filter(
          (emprestimo) => {
            return (
              emprestimo.agendamento === agendamento.id ||
              emprestimo.agendamentos === agendamento.id
            );
          }
        );

        const hasPendingReturn = emprestimosDoAgendamento.length > 0;

        const isLate =
          todayMinutes !== null &&
          todayMinutes > agendamento.fim &&
          hasPendingReturn;

        return {
          ...agendamento,
          hasPendingReturn,
          isLate,
          emprestimosAtivos: emprestimosDoAgendamento.length,
        };
      }),
    [agendamentosHoje, emprestimosEmUso, todayMinutes]
  );

  const totalTasks = todoTasks.length + doingTasks.length;

  const todoResetKey = todoTasks.map((item) => item.id).join("|");
  const doingResetKey = doingTasks.map((item) => item.id).join("|");
  const diaryResetKey = diaryVisible.map((item) => item.id).join("|");

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.26),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#1b1430_0%,_#0f1a2b_48%,_#0c1d2a_100%)] px-3 py-4 text-white lg:px-4">
      <div
        className={`mx-auto grid h-[calc(100vh-2rem)] max-w-[1880px] gap-4 transition-all duration-700 ease-in-out xl:grid-cols-[420px_minmax(0,1fr)] ${
          isMounted && !isLeaving
            ? "opacity-100 scale-100 blur-0"
            : "opacity-0 scale-[0.985] blur-[2px]"
        }`}
      >
        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <SidebarCard
            title="Status das Tarefas"
            icon={<CheckSquare className="h-5 w-5" />}
            className="p-5"
            compactHeader
          >
            <div className="grid grid-cols-3 gap-3">
              <SidebarMiniStat
                label="A Fazer"
                value={todoTasks.length}
                accent="magenta"
                icon={<AlarmClockCheck className="h-5 w-5" />}
              />

              <SidebarMiniStat
                label="Andamento"
                value={doingTasks.length}
                accent="cyan"
                icon={<Clock3 className="h-5 w-5" />}
              />

              <SidebarMiniStat
                label="Total"
                value={totalTasks}
                accent="violet"
                icon={<Boxes className="h-5 w-5" />}
              />
            </div>
          </SidebarCard>

          <SidebarCard
            title="Diário de Bordo"
            icon={<BookOpenText className="h-5 w-5" />}
            className="min-h-0"
          >
            {diaryVisible.length > 0 ? (
              <SmoothMarqueeArea
                resetKey={diaryResetKey}
                speed={0.65}
                duplicate={false}
                className="h-full min-h-0 pr-2"
              >
                {diaryVisible.map((item, index) => (
                  <DiaryTimelineCard
                    key={item.id || `diary-${index}`}
                    item={item}
                    todayIso={todayIso}
                    previousSchoolDayIso={previousSchoolDayIso}
                  />
                ))}
              </SmoothMarqueeArea>
            ) : (
              <EmptyState
                text={
                  isLoadingDashboard
                    ? "Carregando diário de bordo..."
                    : "Nenhum registro de hoje ou do dia útil anterior."
                }
              />
            )}
          </SidebarCard>
        </aside>

        <section className="grid min-h-0 grid-rows-[92px_minmax(0,1fr)] gap-4">
          <header className="rounded-[30px] border border-white/12 bg-slate-900/45 px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-4 w-4 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_14px_rgba(217,70,239,0.9)]" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-slate-400">
                    Painel de Operações
                  </p>

                  <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    Dashboard de Tarefas
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {secondsRemaining}s
                    </span>
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-300">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isLoadingDashboard
                          ? "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.85)]"
                          : "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.85)]"
                      }`}
                    />

                    <span className="text-sm font-semibold">
                      {isLoadingDashboard
                        ? loadedFromCache
                          ? "Atualizando..."
                          : "Carregando..."
                        : lastUpdatedAt
                          ? `Atualizado ${formatTime(lastUpdatedAt)}`
                          : "Pronto"}
                    </span>
                  </div>
                </div>

                <HeaderModeIcon
                  label="Tarefas"
                  icon={<LayoutDashboard className="h-5 w-5" />}
                  tone="magenta"
                />
              </div>
            </div>
          </header>

          <section className="grid min-h-0 gap-6 xl:grid-cols-2">
            <div className="flex min-h-0 flex-col space-y-4 border-r border-white/10 pr-4">
              <SectionHeader
                title="A Fazer"
                badge={`${todoTasks.length} tasks`}
                tone="magenta"
              />

              {todoTasks.length > 0 ? (
                <AutoScrollArea
                  resetKey={todoResetKey}
                  speed={0.45}
                  duplicate={todoTasks.length > 3}
                  className="min-h-0 flex-1 pr-2"
                >
                  {todoTasks.map((item, index) => (
                    <TaskCard
                      key={item.id || `todo-${index}`}
                      item={item}
                      accent="magenta"
                    />
                  ))}
                </AutoScrollArea>
              ) : (
                <EmptyState
                  text={
                    isLoadingDashboard
                      ? "Carregando tarefas..."
                      : "Nenhuma tarefa em A fazer."
                  }
                />
              )}
            </div>

            <div className="flex min-h-0 flex-col space-y-4">
              <SectionHeader
                title="Em Andamento"
                badge={`${doingTasks.length} tasks`}
                tone="cyan"
              />

              {doingTasks.length > 0 ? (
                <AutoScrollArea
                  resetKey={doingResetKey}
                  speed={0.45}
                  duplicate={doingTasks.length > 3}
                  className="min-h-0 flex-1 pr-2"
                >
                  {doingTasks.map((item, index) => (
                    <TaskCard
                      key={item.id || `doing-${index}`}
                      item={item}
                      accent="cyan"
                    />
                  ))}
                </AutoScrollArea>
              ) : (
                <EmptyState
                  text={
                    isLoadingDashboard
                      ? "Carregando tarefas em andamento..."
                      : "Nenhuma tarefa em andamento."
                  }
                />
              )}
            </div>
          </section>
        </section>
      </div>

      <HoverPageJumpButton
        side="right"
        label="Ir para agendamentos"
        onClick={irParaAgendamentosAgora}
        icon={<ChevronRight className="h-7 w-7" />}
      />
    </main>
  );
}

function SidebarCard({
  title,
  icon,
  children,
  className = "",
  compactHeader = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  compactHeader?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,36,112,0.66),rgba(25,35,59,0.84))] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div
        className={`flex shrink-0 items-center gap-4 ${
          compactHeader ? "mb-3" : "mb-6"
        }`}
      >
        <div className="rounded-2xl bg-fuchsia-500/10 p-3 text-fuchsia-400">
          {icon}
        </div>

        <h2 className="text-[1.05rem] font-semibold text-slate-100 md:text-[1.18rem]">
          {title}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function SidebarMiniStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent: "magenta" | "cyan" | "violet";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
      : accent === "violet"
        ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
        : "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300";

  return (
    <div
      className={`rounded-[20px] border px-3 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.12)] ${accentClass}`}
    >
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08]">
        {icon}
      </div>

      <p className="text-xl font-black text-white">{value}</p>

      <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-300">
        {label}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  tone,
}: {
  title: string;
  badge: string;
  tone: "magenta" | "cyan";
}) {
  const badgeClass =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";

  return (
    <div className="flex flex-wrap items-center gap-3 px-3">
      <h3 className="text-[1.55rem] font-semibold uppercase tracking-[0.08em] text-slate-300">
        {title}
      </h3>

      <span
        className={`rounded-lg border px-3 py-1 text-sm font-semibold uppercase ${badgeClass}`}
      >
        {badge}
      </span>
    </div>
  );
}

function TaskCard({
  item,
  accent,
}: {
  item: Task;
  accent: "magenta" | "cyan";
}) {
  const accentClass =
    accent === "cyan"
      ? "from-slate-700/85 to-cyan-950/50"
      : "from-[#493b6f]/90 to-slate-800/75";

  const priority = getClickUpPriorityText(item) || "Normal";
  const description =
    item.markdown_description ||
    item.description ||
    getClickUpTaskDescription(item);
  const assigneeNames = getTaskAssigneeNames(item);

  return (
    <article
      className={`rounded-[30px] border border-white/10 bg-gradient-to-r ${accentClass} px-6 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.14)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-[1.05rem] font-semibold leading-7 text-white md:text-[1.2rem]">
            {item.name}
          </h4>

          {description ? (
            <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-300">
              {description}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            <InfoLine label="Prioridade" value={priority} tone={accent} />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                Responsáveis
              </p>

              {assigneeNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assigneeNames.slice(0, 4).map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase text-slate-200"
                    >
                      {name}
                    </span>
                  ))}

                  {assigneeNames.length > 4 ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-slate-300">
                      +{assigneeNames.length - 4}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">
                  Sem responsável
                </span>
              )}
            </div>
          </div>
        </div>

        <AvatarStack
          names={assigneeNames.length > 0 ? assigneeNames : ["Tarefa"]}
        />
      </div>
    </article>
  );
}

function InfoLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "magenta" | "cyan";
}) {
  const valueClass = tone === "cyan" ? "text-cyan-300" : "text-fuchsia-300";

  return (
    <p className="text-sm font-semibold text-slate-300">
      <span className="text-slate-100">{label}:</span>{" "}
      <span className={valueClass}>{value}</span>
    </p>
  );
}

function AvatarStack({ names }: { names: string[] }) {
  const visible = names.slice(0, 3);
  const extra = names.length - visible.length;

  return (
    <div className="flex shrink-0 items-center -space-x-2 pt-1">
      {visible.map((name, index) => (
        <div
          key={`${name}-${index}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-900 bg-cyan-400 text-xs font-black text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
          title={name}
        >
          {getInitials(name)}
        </div>
      ))}

      {extra > 0 ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-900 bg-slate-600 text-xs font-bold text-white">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

function DiaryTimelineCard({
  item,
  todayIso,
  previousSchoolDayIso,
}: {
  item: Task;
  todayIso: string | null;
  previousSchoolDayIso: string | null;
}) {
  const description =
    item.markdown_description ||
    item.description ||
    getClickUpTaskDescription(item);

  const meta = parseDateFromDiaryTitle(item.name || "");
  const author = getDiaryAuthorFromTitle(item.name || "");

  const label =
    meta?.iso === todayIso
      ? "Hoje"
      : meta?.iso === previousSchoolDayIso
        ? "Dia útil anterior"
        : "Diário";

  return (
    <div className="relative pl-7">
      <span className="absolute left-[6px] top-2 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)]" />

      <span className="absolute left-[11px] top-6 h-[calc(100%+18px)] w-px bg-white/10" />

      <div className="pb-5">
        <article className="flex h-auto flex-col rounded-[26px] border border-cyan-300/20 bg-white/[0.10] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.12)]">
          <div className="mb-4 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300 2xl:text-sm">
                  {label}
                </p>

                <h3 className="mt-2 break-words text-base font-bold leading-6 text-white 2xl:text-xl 2xl:leading-8 min-[1800px]:text-2xl">
                  {item.name}
                </h3>
              </div>

              <div className="shrink-0 text-right text-xs text-slate-400 2xl:text-sm min-[1800px]:text-base">
                <p>{author}</p>
                {meta?.br ? <p>{meta.br}</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-slate-950/40 px-5 py-4">
            <p className="whitespace-pre-line break-words text-[0.95rem] leading-8 text-slate-200 2xl:text-lg 2xl:leading-9 min-[1800px]:text-xl min-[1800px]:leading-10">
              {description || "Sem descrição disponível no diário."}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

function HoverPageJumpButton({
  side,
  label,
  icon,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  const isRight = side === "right";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group fixed top-1/2 z-50 flex h-36 w-16 -translate-y-1/2 items-center bg-transparent text-white/0 outline-none transition-all duration-300 hover:bg-white/[0.08] hover:text-white/85 focus-visible:bg-white/[0.10] focus-visible:text-white ${
        isRight
          ? "right-0 justify-end rounded-l-full pr-2"
          : "left-0 justify-start rounded-r-full pl-2"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${
          isRight ? "translate-x-4" : "-translate-x-4"
        }`}
      >
        {icon}
      </span>
    </button>
  );
}

function HeaderModeIcon({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: ReactNode;
  tone: "magenta" | "cyan";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";

  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.12)] ${toneClass}`}
    >
      <div className="rounded-full bg-white/[0.08] p-2">{icon}</div>
      <span className="text-sm font-bold uppercase tracking-[0.08em] text-white">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-slate-950/35 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
