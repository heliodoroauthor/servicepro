import { useState } from "react";

const tiers = [
  { k: "basic", label: "Basic", color: "#4ade80" },
  { k: "standard", label: "Standard", color: "#f59e0b" },
  { k: "premium", label: "Premium", color: "#a855f7" },
];

export default function TieredOptions({ enableTiers, setEnableTiers, tierItems, setTierItems }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Enable Tiered Options</span>
        <div
          onClick={() => setEnableTiers(!enableTiers)}
          style={{ width: 44, height: 24, borderRadius: 12, background: enableTiers ? "var(--orange)" : "#555", cursor: "pointer", position: "relative", transition: "all 0.2s" }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: enableTiers ? 22 : 2, transition: "all 0.2s" }} />
        </div>
      </div>
      {enableTiers && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tiers.map((tier) => (
              <div key={tier.k} style={{ flex: "1 1 200px", border: "2px solid " + tier.color, borderRadius: 12, padding: 12, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: tier.color, marginBottom: 8, textAlign: "center" }}>{tier.label}</div>
                {tierItems[tier.k].map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12, borderBottom: "1px solid var(--border)" }}>
                    <span style={{ flex: 1 }}>{it.name}</span>
                    <span style={{ fontWeight: 600, marginRight: 6 }}>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</span>
                    <button
                      onClick={() => setTierItems((prev) => ({ ...prev, [tier.k]: prev[tier.k].filter((_, j) => j !== i) }))}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: 0 }}
                    >
                      x
                    </button>
                  </div>
                ))}
                <div style={{ fontWeight: 700, fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--border)", marginTop: 4, textAlign: "right" }}>
                  ${tierItems[tier.k].reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0).toFixed(2)}
                </div>
                <TierAddForm tierKey={tier.k} color={tier.color} setTierItems={setTierItems} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TierAddForm({ tierKey, color, setTierItems }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const handleAdd = () => {
    if (!name) return;
    setTierItems((prev) => ({
      ...prev,
      [tierKey]: [...prev[tierKey], { name, price: parseFloat(price) || 0, qty: 1 }],
    }));
    setName("");
    setPrice("");
  };
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 11, background: "var(--surface)", color: "var(--text)" }}
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        step="0.01"
        placeholder="$"
        style={{ width: 60, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 11, background: "var(--surface)", color: "var(--text)" }}
      />
      <button
        onClick={handleAdd}
        style={{ padding: "5px 10px", borderRadius: 6, background: color, border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
      >
        +
      </button>
    </div>
  );
}
