"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Database,
  Zap,
  BarChart3,
  Store,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STORE_COLORS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScrapeRun {
  id: string;
  storeSlug: string;
  status: string;
  productsFound: number;
  pricesUpdated: number;
  errors: number;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

interface StoreStatus {
  slug: string;
  latestRun: ScrapeRun | null;
  totalRuns: number;
  totalProducts: number;
}

interface DashboardData {
  stores: StoreStatus[];
  overall: {
    totalProducts: number;
    totalActivePrices: number;
  };
}

interface RunsData {
  runs: ScrapeRun[];
  stats: {
    totalRuns: number;
    totalProductsFound: number;
    totalPricesUpdated: number;
    totalErrors: number;
    avgDuration: number;
    avgProductsFound: number;
    avgPricesUpdated: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORE_NAMES: Record<string, string> = {
  tesco: "Tesco Ireland",
  dunnes: "Dunnes Stores",
  lidl: "Lidl Ireland",
  aldi: "Aldi Ireland",
  supervalu: "SuperValu",
};

const STORE_EMOJIS: Record<string, string> = {
  tesco: "🏪",
  dunnes: "🛒",
  lidl: "🏬",
  aldi: "🏷️",
  supervalu: "🛍️",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  completed: {
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Completed",
  },
  running: {
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Running",
  },
  failed: {
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed",
  },
  never: {
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    icon: <Clock className="w-4 h-4" />,
    label: "Never Run",
  },
};

/* ------------------------------------------------------------------ */
/*  Admin Dashboard                                                    */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [runsData, setRunsData] = useState<RunsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringStore, setTriggeringStore] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, runsRes] = await Promise.all([
        fetch("/api/admin/scrape"),
        fetch(`/api/admin/runs?limit=100${storeFilter !== "all" ? `&store=${storeFilter}` : ""}`),
      ]);
      const dashData = await dashRes.json();
      const runsResult = await runsRes.json();
      setDashboard(dashData);
      setRunsData(runsResult);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeFilter]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds if any scraper is running
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggerScrape = async (store: string) => {
    setTriggeringStore(store);
    try {
      await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store }),
      });
      // Refresh data after triggering
      setTimeout(fetchData, 1000);
    } catch (err) {
      console.error("Failed to trigger scrape:", err);
    } finally {
      setTimeout(() => setTriggeringStore(null), 2000);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isAnyRunning = dashboard?.stores.some(
    (s) => s.latestRun?.status === "running"
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Prepare chart data from runs
  const chartData = prepareChartData(runsData?.runs || []);
  const pieData = preparePieData(dashboard?.stores || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Scraper Control Panel</h1>
                <p className="text-xs text-zinc-500">GrocerySaver Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAnyRunning && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Scraping...</span>
                </motion.div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                onClick={() => triggerScrape("all")}
                disabled={triggeringStore !== null}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0"
              >
                {triggeringStore === "all" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Scrape All
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Overall Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<Database className="w-5 h-5" />}
            label="Total Products"
            value={dashboard?.overall.totalProducts || 0}
            color="emerald"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Active Prices"
            value={dashboard?.overall.totalActivePrices || 0}
            color="blue"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Scrape Runs"
            value={runsData?.stats.totalRuns || 0}
            color="purple"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Total Errors"
            value={runsData?.stats.totalErrors || 0}
            color="amber"
          />
        </motion.div>

        {/* Store Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-zinc-400" />
            Store Scrapers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard?.stores.map((store, i) => (
              <StoreCard
                key={store.slug}
                store={store}
                index={i}
                onTrigger={() => triggerScrape(store.slug)}
                isTriggering={triggeringStore === store.slug}
              />
            ))}
          </div>
        </motion.div>

        {/* Charts Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Area Chart — Products found over time */}
          <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Scrape History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPrices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="productsFound"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorProducts)"
                      name="Products Found"
                    />
                    <Area
                      type="monotone"
                      dataKey="pricesUpdated"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorPrices)"
                      name="Prices Updated"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No scrape data yet. Run a scraper to see history." />
              )}
            </CardContent>
          </Card>

          {/* Pie Chart — Products per store */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products by Store
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No products tracked yet." />
              )}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-zinc-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Run History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Scrape Runs
                </CardTitle>
                <div className="flex gap-2">
                  {["all", "tesco", "dunnes", "lidl", "aldi", "supervalu"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setStoreFilter(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          storeFilter === s
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {s === "all" ? "All" : STORE_EMOJIS[s]}
                      </button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {runsData && runsData.runs.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {runsData.runs.slice(0, 20).map((run, i) => (
                      <RunRow
                        key={run.id}
                        run={run}
                        index={i}
                        isExpanded={expandedRun === run.id}
                        onToggle={() =>
                          setExpandedRun(expandedRun === run.id ? null : run.id)
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No scrape runs yet</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Click &quot;Scrape All&quot; to start your first run
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Aggregate Stats Bar */}
        {runsData && runsData.stats.totalRuns > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Averages per Run
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      {
                        name: "Avg Products",
                        value: runsData.stats.avgProductsFound,
                        fill: "#10b981",
                      },
                      {
                        name: "Avg Prices Updated",
                        value: runsData.stats.avgPricesUpdated,
                        fill: "#3b82f6",
                      },
                      {
                        name: "Avg Duration (s)",
                        value: runsData.stats.avgDuration,
                        fill: "#8b5cf6",
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="name"
                      stroke="#52525b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {[
                        { fill: "#10b981" },
                        { fill: "#3b82f6" },
                        { fill: "#8b5cf6" },
                      ].map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400 }}>
      <Card className={`bg-gradient-to-br ${colorMap[color]} border`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
            </div>
            <div className="opacity-50">{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StoreCard({
  store,
  index,
  onTrigger,
  isTriggering,
}: {
  store: StoreStatus;
  index: number;
  onTrigger: () => void;
  isTriggering: boolean;
}) {
  const status = store.latestRun?.status || "never";
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.never;
  const storeColor = STORE_COLORS[store.slug] || "#52525b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden relative">
        {/* Store color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: storeColor }}
        />

        <CardContent className="p-5 pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{STORE_EMOJIS[store.slug]}</span>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {STORE_NAMES[store.slug]}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}
                  >
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.label}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onTrigger}
              disabled={isTriggering || status === "running"}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 px-3"
            >
              {isTriggering ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : status === "running" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {store.latestRun ? (
            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Products"
                value={store.latestRun.productsFound}
                icon={<Package className="w-3 h-3" />}
              />
              <MiniStat
                label="Updated"
                value={store.latestRun.pricesUpdated}
                icon={<TrendingUp className="w-3 h-3" />}
              />
              <MiniStat
                label="Errors"
                value={store.latestRun.errors}
                icon={<AlertTriangle className="w-3 h-3" />}
                isError={store.latestRun.errors > 0}
              />
            </div>
          ) : (
            <p className="text-xs text-zinc-600 text-center py-3">
              No runs yet — click play to start
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              {store.latestRun
                ? `Last: ${formatTimeAgo(store.latestRun.startedAt)}`
                : "Never run"}
            </span>
            <span className="text-[10px] text-zinc-600">
              {store.totalProducts} prices tracked
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  isError = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isError?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-lg font-bold ${
          isError && value > 0 ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-zinc-500">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
    </div>
  );
}

function RunRow({
  run,
  index,
  isExpanded,
  onToggle,
}: {
  run: ScrapeRun;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusInfo = STATUS_CONFIG[run.status] || STATUS_CONFIG.never;
  const storeColor = STORE_COLORS[run.storeSlug] || "#52525b";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-lg border border-zinc-800 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {/* Store indicator */}
        <div
          className="w-1.5 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: storeColor }}
        />

        <span className="text-lg flex-shrink-0">{STORE_EMOJIS[run.storeSlug]}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {STORE_NAMES[run.storeSlug]}
            </span>
            <Badge className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}>
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatTimeAgo(run.startedAt)}
            {run.duration ? ` · ${run.duration}s` : ""}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-400 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {run.productsFound}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {run.pricesUpdated}
          </span>
          {run.errors > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {run.errors}
            </span>
          )}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-zinc-800 bg-zinc-900/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                <DetailStat label="Products Found" value={run.productsFound} />
                <DetailStat label="Prices Updated" value={run.pricesUpdated} />
                <DetailStat label="Errors" value={run.errors} isError />
                <DetailStat label="Duration" value={`${run.duration || 0}s`} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Started:</span>{" "}
                  <span className="text-zinc-300">
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Completed:</span>{" "}
                  <span className="text-zinc-300">
                    {run.completedAt
                      ? new Date(run.completedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              {run.errorLog && (
                <div className="mt-3 p-3 rounded-md bg-red-950/30 border border-red-900/30">
                  <p className="text-xs font-medium text-red-400 mb-1">Error Log:</p>
                  <pre className="text-xs text-red-300/70 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                    {run.errorLog}
                  </pre>
                </div>
              )}

              {run.status === "completed" && run.errors === 0 && (
                <div className="mt-3 p-3 rounded-md bg-emerald-950/30 border border-emerald-900/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-400">
                    Run completed successfully — {run.productsFound} products scraped,{" "}
                    {run.pricesUpdated} prices updated in database.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailStat({
  label,
  value,
  isError = false,
}: {
  label: string;
  value: number | string;
  isError?: boolean;
}) {
  const numVal = typeof value === "number" ? value : 0;
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`text-lg font-bold ${
          isError && numVal > 0 ? "text-red-400" : "text-white"
        }`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[250px] flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-xs text-zinc-600">{message}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse" />
          <div>
            <div className="w-48 h-5 bg-zinc-800 rounded animate-pulse" />
            <div className="w-32 h-3 bg-zinc-800 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function prepareChartData(runs: ScrapeRun[]) {
  // Group by date and sum
  const byDate: Record<string, { productsFound: number; pricesUpdated: number; errors: number }> = {};

  for (const run of runs) {
    const date = new Date(run.startedAt).toLocaleDateString("en-IE", {
      month: "short",
      day: "numeric",
    });
    if (!byDate[date]) {
      byDate[date] = { productsFound: 0, pricesUpdated: 0, errors: 0 };
    }
    byDate[date].productsFound += run.productsFound;
    byDate[date].pricesUpdated += run.pricesUpdated;
    byDate[date].errors += run.errors;
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({ date, ...data }))
    .reverse();
}

function preparePieData(stores: StoreStatus[]) {
  return stores
    .filter((s) => s.totalProducts > 0)
    .map((s) => ({
      name: STORE_NAMES[s.slug] || s.slug,
      value: s.totalProducts,
      color: STORE_COLORS[s.slug] || "#52525b",
    }));
}
