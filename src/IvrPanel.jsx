import { useState, useEffect, useCallback } from "react";

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   IvrPanel â AI-Powered IVR Configuration & Live Test Console

   Features:
   1. Setup wizard â shows webhook URL to configure in Twilio
   2. IVR flow preview â visual diagram of the call tree
   3. Live text test â simulate the IVR via text (calls /api/ivr-ai)
   4. Call log viewer â shows recent call events
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

/* ââ Colours ââ */
const C = {
  green: "#4ade80", orange: "#ff8c00", red: "#ef4444",
  purple: "#a855f7", blue: "#2563eb", muted: "#94a3b8",
  surface: "var(--surface,#1e293b)", border: "var(--border,#334155)",
  dark: "var(--bg,#0f172a)", text: "var(--text,#e2e8f0)",
};

/* ââ Styles ââ */
const S = {
  panel: { marginTop: 8 },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  headerIcon: { fontSize: 16 },
  headerText: { fontSize: 14, fontWeight: 700 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 10 },
  label: { fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4, display: "block" },
  input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" },
  btn: (bg) => ({ padding: "8px 16px", borderRadius: 8, border: "none", background: bg || C.orange, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }),
  btnSm: (bg) => ({ padding: "5px 12px", borderRadius: 6, border: "none", background: bg || C.orange, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 11 }),
  tab: (active) => ({ padding: "6px 14px", borderRadius: 8, border: "none", background: active ? C.orange : "transparent", color: active ? "#fff" : C.muted, cursor: "pointer", fontWeight: 600, fontSize: 12, transition: "all .15s" }),
  code: { background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: C.green, wordBreak: "break-all", userSelect: "all" },
  bubble: (isUser) => ({
    maxWidth: "80%", padding: "8px 12px", borderRadius: 12, fontSize: 12, lineHeight: 1.5,
    background: isUser ? "rgba(255,140,0,0.15)" : "rgba(74,222,128,0.1)",
    border: `1px solid ${isUser ? "rgba(255,140,0,0.3)" : "rgba(74,222,128,0.2)"}`,
    alignSelf: isUser ? "flex-end" : "flex-start",
    color: C.text,
  }),
  flowNode: (color) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 8,
    border: `2px solid ${color}`, fontSize: 11, fontWeight: 600,
    color, background: "transparent", minWidth: 0,
  }),
  arrow: { fontSize: 14, color: C.muted, textAlign: "center", padding: "2px 0" },
  dot: (color) => ({ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", marginRight: 6 }),
  logRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12, borderBottom: `1px solid ${C.border}` },
};

/* ââ Menu flow definition ââ */
const FLOW = [
  { key: "1", label: "Appointments", desc: "Schedule, reschedule, check visits", color: C.green, icon: "\u{1F4C5}" },
  { key: "2", label: "Job Status", desc: "Check job progress, estimates, invoices", color: C.blue, icon: "\u{1F4CB}" },
  { key: "3", label: "Tech Support", desc: "AI-powered troubleshooting", color: C.purple, icon: "\u{1F6E0}" },
  { key: "0", label: "Live Agent", desc: "Transfer to a real person", color: C.orange, icon: "\u{1F464}" },
];

/* ââ Tabs ââ */
const TABS = [
  { key: "setup", label: "Setup" },
  { key: "flow", label: "IVR Flow" },
  { key: "test", label: "Test Chat" },
  { key: "logs", label: "Call Log" },
];

export default function IvrPanel() {
  const [tab, setTab] = useState("setup");
  const [appDomain, setAppDomain] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppDomain(window.location.origin);
    }
  }, []);

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.headerIcon}>{"\u{1F4DE}"}</span>
        <span style={S.headerText}>AI-Powered IVR System</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(74,222,128,0.15)", color: C.green, fontWeight: 600, marginLeft: "auto" }}>VOICE + TEXT</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={S.tab(tab === t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "setup" && <SetupTab domain={appDomain} />}
      {tab === "flow" && <FlowTab />}
      {tab === "test" && <TestTab domain={appDomain} />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

/* âââââââââââââââ SETUP TAB âââââââââââââââ */
function SetupTab({ domain }) {
  const webhookUrl = domain ? `${domain}/api/ivr-webhook` : "https://your-app.vercel.app/api/ivr-webhook";
  const statusUrl = domain ? `${domain}/api/ivr-status` : "https://your-app.vercel.app/api/ivr-status";
  const [copied, setCopied] = useState("");

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 2000); });
  };

  const steps = [
    { n: "1", title: "Twilio Console", text: "Go to console.twilio.com â Phone Numbers â Manage â Active numbers. Click your number." },
    { n: "2", title: "Voice Webhook", text: "Under 'Voice Configuration', set 'A call comes in' to Webhook, and paste this URL:", url: webhookUrl, urlKey: "webhook" },
    { n: "3", title: "Status Callback", text: "Set 'Status callback URL' to:", url: statusUrl, urlKey: "status" },
    { n: "4", title: "Environment Variables", text: "In Vercel â Settings â Environment Variables, ensure ANTHROPIC_API_KEY, TWILIO_USER_PHONE, and TWILIO_PHONE_NUMBER are set." },
    { n: "5", title: "Test", text: 'Call your Twilio number. You should hear "Thank you for calling ServicePro..." and the menu options.' },
  ];

  return (
    <div style={S.card}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{"\u{2699}\u{FE0F}"} Quick Setup Guide</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {s.n}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{s.text}</div>
            {s.url && (
              <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                <div style={S.code}>{s.url}</div>
                <button onClick={() => copy(s.url, s.urlKey)} style={S.btnSm(copied === s.urlKey ? C.green : C.blue)}>
                  {copied === s.urlKey ? "\u2713 Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* âââââââââââââââ FLOW TAB âââââââââââââââ */
function FlowTab() {
  return (
    <div style={S.card}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{"\u{1F500}"} Call Flow Diagram</div>

      {/* Incoming call */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={S.flowNode(C.green)}>{"\u{1F4F2}"} Incoming Call</div>
      </div>
      <div style={S.arrow}>{"\u2193"}</div>

      {/* Caller ID lookup */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={S.flowNode(C.blue)}>{"\u{1F50D}"} Caller ID Lookup</div>
      </div>
      <div style={S.arrow}>{"\u2193"}</div>

      {/* Greeting */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={S.flowNode(C.orange)}>{"\u{1F44B}"} Greeting + Menu (TTS)</div>
      </div>
      <div style={S.arrow}>{"\u2193"}</div>

      {/* Menu options */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 6 }}>
        {FLOW.map((f) => (
          <div key={f.key} style={{ textAlign: "center" }}>
            <div style={S.flowNode(f.color)}>{f.icon} {f.key}: {f.label}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={S.arrow}>{"\u2193"}</div>

      {/* AI processing */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={S.flowNode(C.purple)}>{"\u{1F916}"} Claude AI Processes Request</div>
      </div>
      <div style={S.arrow}>{"\u2193"}</div>

      {/* Response */}
      <div style={{ textAlign: "center" }}>
        <div style={S.flowNode(C.green)}>{"\u{1F50A}"} TTS Response to Caller</div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, padding: "8px 12px", background: C.dark, borderRadius: 8, fontSize: 11 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>How it works:</div>
        <div style={{ color: C.muted, lineHeight: 1.6 }}>
          When a customer calls your Twilio number, the IVR greets them by name (if caller ID matches a known client) and presents menu options via natural text-to-speech. The caller can press buttons or speak their choice. For appointments, status, and support, Claude AI listens to what the caller says and responds intelligently. If the caller presses 0, they are transferred to your phone directly.
        </div>
      </div>
    </div>
  );
}

/* âââââââââââââââ TEST TAB âââââââââââââââ */
function TestTab({ domain }) {
  const [intent, setIntent] = useState("support");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const url = (domain || "") + "/api/ivr-ai?intent=" + intent + "&from=test-console";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speech: text, digits: "", callerName: "Test User" }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.reply || "No response." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, intent, domain]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={S.card}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{"\u{1F4AC}"} Test IVR (Text Mode)</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
        Simulate a caller conversation. Choose an intent and type what a caller would say.
      </div>

      {/* Intent selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[{ key: "appointments", label: "\u{1F4C5} Appointments" }, { key: "status", label: "\u{1F4CB} Status" }, { key: "support", label: "\u{1F6E0} Support" }, { key: "general", label: "\u{1F4AC} General" }].map((o) => (
          <button key={o.key} onClick={() => setIntent(o.key)}
            style={{ ...S.btnSm(intent === o.key ? C.orange : "transparent"), border: `1px solid ${intent === o.key ? C.orange : C.border}`, color: intent === o.key ? "#fff" : C.muted }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", padding: "8px 0" }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: 20 }}>
            Type a message to test the AI IVR response...
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={S.bubble(m.role === "user")}>
            <span style={{ fontWeight: 600, fontSize: 10, color: m.role === "user" ? C.orange : C.green, display: "block", marginBottom: 2 }}>
              {m.role === "user" ? "\u{1F464} Caller" : "\u{1F916} AI Agent"}
            </span>
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ ...S.bubble(false), opacity: 0.6 }}>
            <span style={{ fontWeight: 600, fontSize: 10, color: C.green, display: "block", marginBottom: 2 }}>{"\u{1F916}"} AI Agent</span>
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='e.g. "My AC is not cooling the house"'
          style={{ ...S.input, flex: 1 }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ ...S.btn(), opacity: loading ? 0.6 : 1 }}>
          Send
        </button>
      </div>

      {/* Clear */}
      {messages.length > 0 && (
        <button onClick={() => setMessages([])} style={{ ...S.btnSm("transparent"), border: `1px solid ${C.border}`, color: C.muted, marginTop: 6 }}>
          Clear conversation
        </button>
      )}
    </div>
  );
}

/* âââââââââââââââ LOGS TAB âââââââââââââââ */
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Placeholder â in production you'd fetch from a logging service or DB
  useEffect(() => {
    setLogs([
      { time: "Just now", from: "(Demo)", status: "info", msg: "IVR system is ready. Call logs will appear here once Twilio is configured and calls are received." },
    ]);
  }, []);

  const statusColors = { completed: C.green, failed: C.red, ringing: C.blue, "in-progress": C.orange, info: C.muted };

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F4CA}"} Recent Calls</div>
        <button onClick={() => setLoading(true)} style={S.btnSm(C.blue)} disabled={loading}>
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {logs.map((log, i) => (
        <div key={i} style={S.logRow}>
          <span style={S.dot(statusColors[log.status] || C.muted)} />
          <span style={{ fontSize: 11, color: C.muted, minWidth: 60 }}>{log.time}</span>
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 90 }}>{log.from}</span>
          <span style={{ fontSize: 11, color: C.muted, flex: 1 }}>{log.msg}</span>
        </div>
      ))}

      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, lineHeight: 1.5, padding: "8px 12px", background: C.dark, borderRadius: 8 }}>
        Call logs are recorded in your Vercel function logs. To view detailed logs, go to Vercel Dashboard {"\u2192"} your project {"\u2192"} Logs tab. Filter by "ivr-call-event" to see all IVR activity.
      </div>
    </div>
  );
}
