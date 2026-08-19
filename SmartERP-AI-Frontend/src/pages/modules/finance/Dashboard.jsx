import { useState } from "react";
import GeneralLedger from "./GeneralLedger";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("pnl");

    const handleTabChange = (tab) => {
        setActiveTab(tab);

        // Smoothly move the user to the content area
        setTimeout(() => {
            document
                .getElementById("finance-content")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
        }, 50);
    };

    return (
        <div className="min-h-screen bg-[#f6f5f1] text-[#11120f]">

            {/* =====================================================
                MAIN FINANCE CONTENT
            ====================================================== */}

            <main className="px-7 py-8 lg:px-8">

                {/* =================================================
                    PAGE HEADER
                ================================================== */}

                <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

                    <div>
                        <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-[#87929a]">
                            Accounts
                        </p>

                        <h1 className="font-serif text-[32px] leading-none text-[#10110f] lg:text-[34px]">
                            Finance &amp; Accounts
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">

                        <button
                            type="button"
                            className="
                                rounded-2xl
                                border border-[#e3e0d8]
                                bg-[#f9f8f5]
                                px-5 py-3
                                font-mono
                                text-[13px]
                                text-[#1c1d1a]
                                transition
                                hover:bg-white
                            "
                        >
                            Export to Tally
                        </button>

                        <button
                            type="button"
                            className="
                                rounded-2xl
                                bg-[#11130f]
                                px-5 py-3
                                font-mono
                                text-[13px]
                                text-white
                                transition
                                hover:bg-[#242620]
                            "
                        >
                            + Journal Entry
                        </button>

                    </div>
                </div>


                {/* =================================================
                    KPI CARDS
                ================================================== */}

                <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    <MetricCard
                        value="₹1.60 Cr"
                        label="NET PROFIT YTD"
                        description="↑ 18.4% vs last year"
                        valueClass="text-[#7d6c3f]"
                    />

                    <MetricCard
                        value="₹1.42 Cr"
                        label="REVENUE MTD"
                        description="Vs target: ₹1.20 Cr"
                    />

                    <MetricCard
                        value="₹3.14 Cr"
                        label="RECEIVABLES"
                        description="12 invoices pending"
                    />

                    <MetricCard
                        value="₹1.20 Cr"
                        label="PAYABLES"
                        description="₹38L due this week"
                        valueClass="text-[#8b7540]"
                    />

                </section>


                {/* =================================================
                    HIGH PRIORITY ALERT
                ================================================== */}

                <section
                    className="
                        mb-7 flex
                        flex-col
                        gap-4
                        rounded-[20px]
                        border
                        border-[#dfc8c1]
                        bg-[#f1eae7]
                        px-5 py-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    <div className="flex items-center gap-4">

                        <div
                            className="
                                flex h-10 w-10 shrink-0
                                items-center justify-center
                                rounded-[14px]
                                bg-[#e1d3ce]
                                text-[#171a17]
                            "
                        >
                            <span className="text-[18px]">⚠</span>
                        </div>

                        <p className="font-mono text-[13px] leading-6 text-[#914b3f]">
                            High-priority alert: Duplicate vendor invoice detected:
                            BILL-127 matches BILL-091 (Tata Steel)
                        </p>

                    </div>


                    {/* IMPORTANT:
                        This directly activates Alerts.
                    */}

                    <button
                        type="button"
                        onClick={() => handleTabChange("alerts")}
                        className="
                            shrink-0
                            rounded-xl
                            border border-[#d9beb6]
                            bg-transparent
                            px-4 py-2.5
                            font-mono
                            text-[12px]
                            text-[#77483f]
                            transition
                            hover:bg-[#e9ddda]
                        "
                    >
                        View All →
                    </button>

                </section>


                {/* =================================================
                    FINANCE TABS
                ================================================== */}

                <nav className="mb-7 flex flex-wrap items-center gap-2">

                    <FinanceTab
                        label="P&L"
                        active={activeTab === "pnl"}
                        onClick={() => handleTabChange("pnl")}
                    />

                    <FinanceTab
                        label="GENERAL LEDGER"
                        active={activeTab === "ledger"}
                        onClick={() => handleTabChange("ledger")}
                    />

                    <FinanceTab
                        label="CASH FLOW"
                        active={activeTab === "cashflow"}
                        onClick={() => handleTabChange("cashflow")}
                    />

                    <FinanceTab
                        label="ALERTS"
                        active={activeTab === "alerts"}
                        onClick={() => handleTabChange("alerts")}
                    />

                </nav>


                {/* =================================================
                    CONTENT
                ================================================== */}

                <div id="finance-content">

                    {/* =================================================
                        P&L
                    ================================================== */}

                    {activeTab === "pnl" && (
                        <ProfitLossSection />
                    )}


                    {/* =================================================
                        GENERAL LEDGER
                    ================================================== */}

                    {activeTab === "ledger" && (
                        <GeneralLedger />
                    )}


                    {/* =================================================
                        CASH FLOW
                    ================================================== */}

                    {activeTab === "cashflow" && (
                        <CashFlowSection />
                    )}


                    {/* =================================================
                        ALERTS
                    ================================================== */}

                    {activeTab === "alerts" && (
                        <AlertsSection />
                    )}

                </div>

            </main>

        </div>
    );
};


/* ================================================================
   METRIC CARD
================================================================ */

const MetricCard = ({
    value,
    label,
    description,
    valueClass = "text-[#10110f]",
}) => {
    return (
        <div
            className="
                min-h-[126px]
                rounded-[20px]
                border
                border-[#e3e0d8]
                bg-white
                px-5 py-6
            "
        >

            <div
                className={`font-serif text-[30px] leading-none ${valueClass}`}
            >
                {value}
            </div>

            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#89939b]">
                {label}
            </p>

            <p className="mt-1 font-mono text-[12px] text-[#59636b]">
                {description}
            </p>

        </div>
    );
};


/* ================================================================
   TAB
================================================================ */

const FinanceTab = ({ label, active, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                rounded-xl
                px-5 py-3
                font-mono
                text-[12px]
                tracking-[0.08em]
                transition-all
                ${
                    active
                        ? "border border-[#e4e1da] bg-white text-[#11120f] shadow-[0_2px_5px_rgba(0,0,0,0.08)]"
                        : "border border-transparent bg-transparent text-[#8c969d] hover:text-[#252823]"
                }
            `}
        >
            {label}
        </button>
    );
};


/* ================================================================
   PROFIT & LOSS
================================================================ */

const ProfitLossSection = () => {

    const rows = [
        ["Revenue from Operations", "₹8,42,30,000"],
        ["Other Income", "₹12,80,000"],
        ["Total Income", "₹8,55,10,000"],
        ["Cost of Goods Sold", "₹5,18,40,000"],
        ["Employee Benefits", "₹98,40,000"],
        ["Finance Costs", "₹18,20,000"],
        ["Depreciation", "₹22,10,000"],
        ["Other Expenses", "₹84,60,000"],
        ["Total Expenses", "₹6,41,70,000"],
        ["Profit Before Tax", "₹2,13,40,000"],
        ["Tax (25%)", "₹53,35,000"],
        ["Net Profit", "₹1,60,05,000"],
    ];

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

            {/* P&L TABLE */}

            <section
                className="
                    overflow-hidden
                    rounded-[20px]
                    border
                    border-[#e3e0d8]
                    bg-white
                "
            >

                <div className="flex items-center justify-between border-b border-[#e6e3dc] px-6 py-5">

                    <h2 className="font-serif text-[22px]">
                        Profit &amp; Loss Statement
                    </h2>

                    <span className="font-mono text-[12px] text-[#89939b]">
                        FY 2026 (Apr – Aug)
                    </span>

                </div>


                <div className="px-6 py-5">

                    {rows.map(([name, value], index) => {

                        const highlighted =
                            name === "Total Income" ||
                            name === "Total Expenses" ||
                            name === "Profit Before Tax" ||
                            name === "Net Profit";

                        return (
                            <div
                                key={name}
                                className={`
                                    flex
                                    min-h-[48px]
                                    items-center
                                    justify-between
                                    border-b
                                    border-[#e6e3dc]
                                    py-3
                                    font-mono
                                    text-[13px]
                                    last:border-b-0
                                    ${
                                        highlighted
                                            ? "mx-[-24px] bg-[#f6f5f1] px-6 text-[#11120f]"
                                            : ""
                                    }
                                `}
                            >

                                <span
                                    className={
                                        highlighted
                                            ? "text-[#10110f]"
                                            : "text-[#78838c]"
                                    }
                                >
                                    {name}
                                </span>

                                <span className="text-right">
                                    {value}
                                </span>

                            </div>
                        );
                    })}

                </div>

            </section>


            {/* RIGHT SIDE */}

            <div className="space-y-5">

                <AIInsights />

                <QuickRatios />

            </div>

        </div>
    );
};


/* ================================================================
   AI INSIGHTS
================================================================ */

const AIInsights = () => {

    const insights = [
        "COGS at 61.5% of revenue — target is 58%. Investigate material wastage.",
        "Receivables aging 28 days avg — follow up with Hero MotoCorp on overdue INV.",
        "Tax liability due Q3: ₹53.35L. Set up advance tax payment schedule.",
    ];

    return (
        <section
            className="
                rounded-[20px]
                bg-[#131511]
                px-6 py-6
                text-white
            "
        >

            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#b3c68d]">
                AI INSIGHTS
            </p>

            <div className="space-y-5">

                {insights.map((item) => (
                    <div
                        key={item}
                        className="flex gap-3"
                    >

                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#9daf89]" />

                        <p className="font-mono text-[13px] leading-5 text-[#aeb3aa]">
                            {item}
                        </p>

                    </div>
                ))}

            </div>

        </section>
    );
};


/* ================================================================
   QUICK RATIOS
================================================================ */

const QuickRatios = () => {

    const ratios = [
        ["Gross Margin", "38.5%"],
        ["Net Margin", "19.0%"],
        ["Current Ratio", "2.4x"],
        ["Debt-to-Equity", "0.38"],
    ];

    return (
        <section
            className="
                rounded-[20px]
                border
                border-[#e3e0d8]
                bg-white
                px-6 py-6
            "
        >

            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9aa1a7]">
                QUICK RATIOS
            </p>

            {ratios.map(([name, value]) => (
                <div
                    key={name}
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-[#e6e3dc]
                        py-3
                        last:border-b-0
                    "
                >

                    <span className="font-mono text-[13px] text-[#9ba1a7]">
                        {name}
                    </span>

                    <span className="font-serif text-[18px] text-[#10110f]">
                        {value}
                    </span>

                </div>
            ))}

        </section>
    );
};


/* ================================================================
   CASH FLOW
================================================================ */

const CashFlowSection = () => {

    const months = [
        {
            month: "MAR",
            operating: 72,
            investing: 30,
            financing: 14,
        },
        {
            month: "APR",
            operating: 85,
            investing: 22,
            financing: 19,
        },
        {
            month: "MAY",
            operating: 60,
            investing: 43,
            financing: 14,
        },
        {
            month: "JUN",
            operating: 100,
            investing: 18,
            financing: 24,
        },
        {
            month: "JUL",
            operating: 94,
            investing: 50,
            financing: 18,
        },
        {
            month: "AUG",
            operating: 50,
            investing: 10,
            financing: 12,
        },
    ];

    return (
        <section
            className="
                rounded-[20px]
                border
                border-[#e3e0d8]
                bg-white
                p-6
            "
        >

            {/* HEADER */}

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="font-serif text-[22px]">
                    Cash Flow Statement
                </h2>

                <div className="flex flex-wrap gap-5 font-mono text-[12px] text-[#8c969d]">

                    <Legend
                        label="Operating"
                        className="bg-[#9caf8c]"
                    />

                    <Legend
                        label="Investing"
                        className="bg-[#aaa7bb]"
                    />

                    <Legend
                        label="Financing"
                        className="bg-[#b0a070]"
                    />

                </div>

            </div>


            {/* CHART */}

            <div className="flex h-[300px] items-end gap-4 border-b border-[#e3e0d8] px-2 pb-0 sm:gap-7">

                {months.map((item) => (
                    <div
                        key={item.month}
                        className="flex h-full flex-1 items-end justify-center gap-1"
                    >

                        <div className="flex h-full flex-1 flex-col items-center justify-end">

                            <div
                                className="w-full max-w-[76px] rounded-t-md bg-[#9caf8c]"
                                style={{
                                    height: `${item.operating}%`,
                                }}
                            />

                            <span className="mt-2 font-mono text-[10px] text-[#9ba2a8]">
                                {item.month}
                            </span>

                        </div>


                        <div className="flex h-full flex-1 flex-col items-center justify-end">

                            <div
                                className="w-full max-w-[76px] rounded-t-md bg-[#aaa7bb]"
                                style={{
                                    height: `${item.investing}%`,
                                }}
                            />

                            <span className="mt-2 font-mono text-[10px] text-transparent">
                                {item.month}
                            </span>

                        </div>


                        <div className="flex h-full flex-1 flex-col items-center justify-end">

                            <div
                                className="w-full max-w-[76px] rounded-t-md bg-[#b0a070]"
                                style={{
                                    height: `${item.financing}%`,
                                }}
                            />

                            <span className="mt-2 font-mono text-[10px] text-transparent">
                                {item.month}
                            </span>

                        </div>

                    </div>
                ))}

            </div>


            {/* SUMMARY */}

            <div className="grid grid-cols-1 gap-6 pt-7 sm:grid-cols-3">

                <CashSummary
                    value="+₹1.81 Cr"
                    label="OPERATING CASH FLOW"
                />

                <CashSummary
                    value="-₹62 L"
                    label="INVESTING CASH FLOW"
                />

                <CashSummary
                    value="-₹30 L"
                    label="FINANCING CASH FLOW"
                />

            </div>

        </section>
    );
};


/* ================================================================
   LEGEND
================================================================ */

const Legend = ({ label, className }) => {
    return (
        <div className="flex items-center gap-2">

            <span className={`h-3.5 w-3.5 rounded-md ${className}`} />

            <span>{label}</span>

        </div>
    );
};


/* ================================================================
   CASH SUMMARY
================================================================ */

const CashSummary = ({ value, label }) => {
    return (
        <div className="text-center">

            <div className="font-serif text-[24px] text-[#927644]">
                {value}
            </div>

            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#9ba2a8]">
                {label}
            </p>

        </div>
    );
};


/* ================================================================
   ALERTS
================================================================ */

const AlertsSection = () => {

    const alerts = [
        {
            priority: "HIGH",
            type: "FRAUD",
            time: "2H AGO",
            message:
                "Duplicate vendor invoice detected: BILL-127 matches BILL-091 (Tata Steel)",
        },
        {
            priority: "MEDIUM",
            type: "ANOMALY",
            time: "1D AGO",
            message:
                "Unusual payment pattern: 3 payments to same bank account in 24h",
        },
        {
            priority: "LOW",
            type: "COMPLIANCE",
            time: "3D AGO",
            message:
                "GST filing due in 5 days — Q2 GSTR-1 not submitted",
        },
    ];

    return (
        <section className="space-y-5">

            {/* AI MONITOR */}

            <div
                className="
                    rounded-[20px]
                    bg-[#131511]
                    px-6 py-6
                    text-white
                "
            >

                <div className="flex items-center gap-5">

                    <div
                        className="
                            flex h-12 w-12
                            shrink-0
                            items-center justify-center
                            rounded-[14px]
                            bg-[#222a20]
                            text-[#9caf8c]
                        "
                    >
                        ◇
                    </div>

                    <div>

                        <h2 className="font-serif text-[21px]">
                            AI Fraud &amp; Compliance Monitor
                        </h2>

                        <p className="mt-1 font-mono text-[12px] text-[#727a72]">
                            Scanning 892 journal entries and 38 vendor payments this week.
                        </p>

                    </div>

                </div>

            </div>


            {/* ALERT ITEMS */}

            {alerts.map((alert) => (
                <AlertRow
                    key={alert.message}
                    {...alert}
                />
            ))}

        </section>
    );
};


/* ================================================================
   ALERT ROW
================================================================ */

const AlertRow = ({
    priority,
    type,
    time,
    message,
}) => {

    const priorityStyles = {
        HIGH: "bg-[#eee6e3] text-[#91564b]",
        MEDIUM: "bg-[#f0eee7] text-[#967e48]",
        LOW: "bg-[#e8e7df] text-[#687267]",
    };

    return (
        <div
            className="
                flex
                flex-col
                gap-5
                rounded-[20px]
                border
                border-[#e3d7d0]
                bg-white
                px-6 py-6
                lg:flex-row
                lg:items-center
            "
        >

            <div
                className={`
                    flex
                    h-10
                    min-w-[42px]
                    items-center
                    justify-center
                    rounded-[13px]
                    px-2
                    font-mono
                    text-[10px]
                    ${priorityStyles[priority]}
                `}
            >
                {priority}
            </div>


            <div className="flex-1">

                <p className="font-mono text-[13px] leading-6 text-[#3e4850]">
                    {message}
                </p>

                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#a4a9ad]">
                    {type} · {time}
                </p>

            </div>


            <div className="flex shrink-0 gap-2">

                <button
                    type="button"
                    className="
                        rounded-xl
                        border border-[#e4e0da]
                        px-4 py-2.5
                        font-mono
                        text-[11px]
                        text-[#8b9297]
                        transition
                        hover:bg-[#f5f4f0]
                    "
                >
                    Dismiss
                </button>

                <button
                    type="button"
                    className="
                        rounded-xl
                        bg-[#11130f]
                        px-4 py-2.5
                        font-mono
                        text-[11px]
                        text-white
                        transition
                        hover:bg-[#292b26]
                    "
                >
                    Investigate →
                </button>

            </div>

        </div>
    );
};


export default Dashboard;