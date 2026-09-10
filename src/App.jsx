import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Camera, ChartNoAxesCombined, CircleHelp, History as HistoryIcon,
  Leaf, MapPin, MessageSquare, Recycle, Search, Sparkles, Trophy, Upload,
  Info, Wind, Trash2, Droplets, Zap, X, RotateCcw
} from "lucide-react";

const INITIAL_HISTORY = [
  { item: "Electronic Components", date: "31/3/2026, 9:18:55 pm", pts: 95, action: "Specialist" },
  { item: "Mixed Paper & Cardboard", date: "31/3/2026, 9:18:52 pm", pts: 88, action: "Recycle" },
  { item: "Organic Compostable Waste", date: "31/3/2026, 9:18:49 pm", pts: 92, action: "Donate", active: true },
  { item: "Silica-based Glass", date: "31/3/2026, 9:18:45 pm", pts: 82, action: "Recycle" },
  { item: "Ferrous Scrap Metal", date: "31/3/2026, 9:18:39 pm", pts: 78, action: "Reuse" },
  { item: "High-Density Polyethylene (HDPE)", date: "31/3/2026, 9:18:02 pm", pts: 85, action: "Recycle" },
  { item: "Digital Waste (Electronic Image File)", date: "28/3/2026, 11:54:43 pm", pts: 95, action: "Dispose" }
];

const QUICK = ["Plastic", "Food", "Metal", "Paper", "Glass", "E-Waste"];

const GUIDE = [
  {
    n: "01", title: "Identify Your Waste",
    text: "Use the camera to scan an object, upload a photo, or simply search for an item in our database. AURA's AI will analyze the material instantly.",
    icon: Camera, tone: "mint"
  },
  {
    n: "02", title: "Get Expert Guidance",
    text: "AURA provides a specific disposal action (Recycle, Donate, Reuse, or Specialist) and a sustainability tip to optimize your environmental impact.",
    icon: Sparkles, tone: "cream"
  },
  {
    n: "03", title: "Find Local Facilities",
    text: "Locate the nearest recycling centers or collection points directly on the integrated map. No more guessing where your waste should go.",
    icon: MapPin, tone: "blue"
  },
  {
    n: "04", title: "Track Your Impact",
    text: "Claim Eco-Points for every correct disposal. Monitor your cumulative CO₂ savings and waste reduction on your personal dashboard.",
    icon: ChartNoAxesCombined, tone: "lilac"
  }
];

const RANKS = [
  ["SG", "Sarah Green", "15,420 pts"],
  ["EM", "Eco Mike", "14,200 pts"],
  ["UG", "Urban Gardener", "12,850 pts"],
  ["RQ", "Recycle Queen", "11,200 pts"],
  ["SS", "Sustainability Sam", "9,800 pts"]
];


async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

async function analyzeWasteImage(input) {
  const dataUrl = typeof input === "string" ? input : await fileToDataUrl(input);
  const [meta, base64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
  const response = await fetch("/.netlify/functions/aura-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "vision",
      image: { mimeType: mime, data: base64 }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The AI service could not analyze this image.");
  return payload;
}

function App() {
  const [page, setPage] = useState("scan");
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aura-history")) || INITIAL_HISTORY; }
    catch { return INITIAL_HISTORY; }
  });
  const [points, setPoints] = useState(() => Number(localStorage.getItem("aura-points") || 615));
  const [searchValue, setSearchValue] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [captured, setCaptured] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => localStorage.setItem("aura-history", JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem("aura-points", String(points)), [points]);

  const addScan = (item, action = "Recycle", ai = null) => {
    const clean = item || "Mixed Household Waste";
    const pts = action === "Specialist" ? 95 : action === "Donate" ? 92 : action === "Reuse" ? 78 : 85;
    const newEntry = {
      item: clean,
      date: new Date().toLocaleString("en-GB", { hour12: true }).replace(",", ","),
      pts, action
    };
    setHistory(h => [newEntry, ...h]);
    setPoints(p => p + pts);
    setSelectedItem({ item: clean, action, pts, ...(ai || {}) });
  };

  const nav = (next) => {
    setPage(next);
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <Navbar page={page} nav={nav} />
      <main>
        {page === "scan" && (
          <ScanPage
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            onQuick={(x) => addScan(x)}
            onSearch={() => searchValue.trim() && addScan(searchValue.trim())}
            onCamera={() => { setCameraError(""); setAiError(""); setCameraOpen(true); }}
            onUpload={async (file) => {
            setAiError("");
            setAiLoading(true);
            try {
              const result = await analyzeWasteImage(file);
              addScan(result.item, result.action, result);
            } catch (e) {
              setAiError(e.message || "AI analysis failed. Please try again.");
            } finally {
              setAiLoading(false);
            }
          }}
            selectedItem={selectedItem}
            aiLoading={aiLoading}
            aiError={aiError}
          />
        )}
        {page === "stats" && <StatsPage history={history} points={points} />}
        {page === "history" && <HistoryPage history={history} setHistory={setHistory} />}
        {page === "rank" && <RankPage points={points} />}
        {page === "ask" && <AskPage />}
        {page === "guide" && <GuidePage onScan={() => nav("scan")} />}
      </main>
      <Footer />
      {cameraOpen && (
        <CameraModal
          facing={cameraFacing}
          setFacing={setCameraFacing}
          captured={captured}
          setCaptured={setCaptured}
          error={cameraError}
          setError={setCameraError}
          onClose={() => { setCameraOpen(false); setCaptured(null); }}
          onResult={async (imageData) => {
            setAiLoading(true);
            setAiError("");
            try {
              const result = await analyzeWasteImage(imageData);
              setCameraOpen(false);
              setCaptured(null);
              addScan(result.item, result.action, result);
            } catch (e) {
              setAiError(e.message || "AI analysis failed. Please try again.");
            } finally {
              setAiLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

function Navbar({ page, nav }) {
  const items = [
    ["scan", "Scan", Camera],
    ["stats", "Stats", ChartNoAxesCombined],
    ["history", "History", HistoryIcon],
    ["rank", "Rank", Trophy],
    ["ask", "Ask", MessageSquare],
    ["guide", "Guide", CircleHelp]
  ];
  return (
    <header className="navbar">
      <button className="brand" onClick={() => nav("scan")} aria-label="AURA home">
        <span className="brand-mark"><Leaf size={29} strokeWidth={2.2}/></span>
        <span>AURA</span>
      </button>
      <nav className="nav-links" aria-label="Main navigation">
        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            className={`nav-item ${page === key ? "active" : ""}`}
            onClick={() => nav(key)}
          >
            <Icon size={22} strokeWidth={2.1} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

function ScanPage({ searchValue, setSearchValue, onQuick, onSearch, onCamera, onUpload, selectedItem, aiLoading, aiError }) {
  const fileRef = useRef(null);
  return (
    <section className="scan-page page">
      <div className="hero">
        <h1>Adaptive Urban Resource<br className="desktop-break"/> Assistant</h1>
        <p>Identify waste in real-time and discover the most sustainable<br className="desktop-break"/> disposal method for your urban environment.</p>
      </div>

      <div className="search-box">
        <Search size={30} className="search-icon" />
        <input
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch()}
          placeholder={"Search for an item (e.g. 'Bottle', 'Laptop')..."}
          aria-label="Search for waste"
        />
        <button className="green-btn search-btn" onClick={onSearch}>Search</button>
      </div>

      <div className="scan-grid">
        <button className="upload-card" onClick={() => fileRef.current?.click()}>
          <span className="upload-icon"><Upload size={38} /></span>
          <strong>Upload Waste</strong>
          <span>Upload an image to identify waste</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
          />
        </button>

        <div className="quick-card">
          <h2>Quick Select</h2>
          <div className="quick-grid">
            {QUICK.map(x => <button key={x} onClick={() => onQuick(x)}>{x}</button>)}
          </div>
        </div>
      </div>

      <button className="camera-cta" onClick={onCamera} disabled={aiLoading}>
        <Camera size={21}/> {aiLoading ? "AURA is analyzing…" : "Scan with Camera"}
      </button>

      {aiError && <div className="ai-error">{aiError}</div>}

      {aiLoading && <div className="ai-loading"><Sparkles size={20}/> AURA AI is identifying the material and checking the best disposal action…</div>}

      {selectedItem && (
        <div className="scan-result">
          <div>
            <span className="result-kicker">IDENTIFIED WASTE</span>
            <h3>{selectedItem.item}</h3>
            <p>Recommended action: <strong>{selectedItem.action}</strong>{selectedItem.confidence ? ` · ${Math.round(selectedItem.confidence * 100)}% confidence` : ""}</p>
            {selectedItem.tip && <p className="result-tip">{selectedItem.tip}</p>}
          </div>
          <div className="result-points">+{selectedItem.pts} pts</div>
        </div>
      )}
    </section>
  );
}

function StatsPage({ history, points }) {
  const bars = [86, 72, 63, 68, 81, 75, 88];
  return (
    <section className="page stats-page">
      <PageIntro title="Your Sustainability Dashboard" subtitle="Tracking your cumulative impact on the urban environment." />
      <div className="metric-grid">
        <Metric icon={Wind} label="CO₂ SAVED" value="9901" unit="g" cls="blue-icon"/>
        <Metric icon={Trash2} label="WASTE DIVERTED" value="6101" unit="g" cls="green-icon"/>
        <Metric icon={Droplets} label="WATER SAVED" value="511" unit="gal" cls="cyan-icon"/>
        <Metric icon={Zap} label="ENERGY SAVED" value="71.1" unit="kWh" cls="orange-icon"/>
      </div>
      <div className="impact-card">
        <h2>Impact Over Time</h2>
        <div className="bar-chart">
          {bars.map((v, i) => <div key={i} className="bar-wrap"><div className="bar" style={{height: `${v}%`}}/></div>)}
        </div>
        <div className="chart-labels"><span>Past Scans</span><span>Latest</span></div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, unit, cls }) {
  return (
    <div className="metric-card">
      <span className={`metric-icon ${cls}`}><Icon size={27}/></span>
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}<small>{unit}</small></div>
    </div>
  );
}

function HistoryPage({ history, setHistory }) {
  return (
    <section className="page history-page">
      <div className="section-heading-row">
        <PageIntro title="Scan History" subtitle="Review your past disposal decisions." align="left" />
        <button className="clear-btn" onClick={() => setHistory([])}>Clear All</button>
      </div>
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-card">No scans yet. Start with the Scan page.</div>
        ) : history.map((h, i) => (
          <div className={`history-row ${h.active ? "selected-row" : ""}`} key={`${h.item}-${i}`}>
            <span className="history-recycle"><Recycle size={25}/></span>
            <div className="history-main">
              <strong>{h.item}</strong>
              <span>{h.date}</span>
            </div>
            <div className="history-action">
              <strong>+{h.pts} pts</strong>
              <span>{h.action}</span>
            </div>
            {h.active && <button className="row-arrow" aria-label="Open scan"><ArrowRight size={21}/></button>}
          </div>
        ))}
      </div>
    </section>
  );
}

function RankPage({ points }) {
  return (
    <section className="page rank-page">
      <PageIntro title="Urban Eco-Leaderboard" subtitle="See how your sustainability efforts compare with the community." />
      <div className="leaderboard">
        <div className="rank-summary">
          <div className="your-rank"><Trophy size={36}/><div><span>YOUR RANK</span><strong>#124 <small>of 12,450</small></strong></div></div>
          <div className="total-points"><span>TOTAL POINTS</span><strong>{points.toLocaleString()}</strong></div>
        </div>
        <div className="rank-list">
          {RANKS.map(([initials, name, score], i) => (
            <div className="rank-row" key={name}>
              <span className="rank-number">{i + 1}</span>
              <span className="avatar">{initials}</span>
              <strong>{name}</strong>
              <span className="rank-score">{score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AURA_REFUSAL = "I’m AURA, and I’m focused exclusively on waste and waste-management topics. I can’t help with unrelated questions. Please ask me something related to waste, recycling, segregation, composting, disposal, e-waste, or sustainability.";

const WASTE_TERMS = [
  "waste", "garbage", "trash", "rubbish", "recycling", "recycle", "recyclable", "segregat",
  "compost", "composting", "landfill", "dump", "disposal", "dispose", "reuse", "reduce",
  "e-waste", "ewaste", "electronic waste", "battery", "batteries", "plastic", "paper waste",
  "food waste", "organic waste", "wet waste", "dry waste", "biodegradable", "hazardous waste",
  "medical waste", "sanitary waste", "textile waste", "construction waste", "sewage", "wastewater",
  "litter", "pollution", "circular economy", "zero waste", "sustainable packaging", "municipal waste",
  "scrap", "collection center", "recycling center", "waste management", "waste segregation", "incineration",
  "vermicompost", "upcycle", "upcycling", "microplastic", "ocean waste", "marine waste"
];

const LOCAL_WASTE_KB = [
  {
    keys: ["what is waste", "define waste", "meaning of waste"],
    answer: "Waste is any material, substance, or item that a person or organization no longer wants or needs. It can be solid, liquid, or gaseous, and may be classified as organic, recyclable, hazardous, electronic, sanitary, construction, or other types depending on its source and properties."
  },
  {
    keys: ["wet waste", "food waste", "kitchen waste", "organic waste"],
    answer: "Wet or organic waste includes food scraps, fruit and vegetable peels, coffee grounds, and similar biodegradable material. Keep it separate from dry recyclables and, where facilities allow, send it for composting or other organic-waste treatment."
  },
  {
    keys: ["dry waste", "dry waste examples"],
    answer: "Dry waste generally includes clean paper, cardboard, many plastics, metals, and glass. Keep it separate from wet waste, and keep recyclable materials reasonably clean and dry so they can be sorted and recovered more easily."
  },
  {
    keys: ["segregate", "segregation", "separate waste", "waste segregation"],
    answer: "A simple starting point is to separate waste at the point where it is generated: wet/organic waste, dry/recyclable waste, and a separate stream for hazardous or special waste such as batteries, chemicals and e-waste. Exact bin categories vary by local authority, so follow your local collection rules."
  },
  {
    keys: ["plastic", "plastic bottle", "plastic bag", "plastic waste"],
    answer: "For plastic, first check whether your local system accepts the specific plastic type. Keep recyclable plastic clean and dry, avoid mixing it with food waste, and use a registered collection or recycling channel when available. Reduce single-use plastic and reuse suitable containers when safe."
  },
  {
    keys: ["paper", "cardboard", "paper waste"],
    answer: "Clean, dry paper and cardboard are commonly recyclable. Flatten boxes, keep them away from food and liquids, and place them in the dry/recyclable stream if your local service accepts them. Heavily contaminated paper may need a different treatment."
  },
  {
    keys: ["glass", "glass bottle", "glass waste"],
    answer: "Glass bottles and jars are often recyclable when collected separately. Empty and rinse them if required by your local system, and never mix broken glass loosely with materials where it could injure workers. Follow your local collection instructions for broken glass."
  },
  {
    keys: ["metal", "metal can", "scrap metal", "aluminium"],
    answer: "Many metal cans and clean metal items have high recycling value. Separate them from wet waste and use your local dry-waste/recycling or scrap-metal collection system. Sharp metal should be handled and packed safely to prevent injuries."
  },
  {
    keys: ["e-waste", "ewaste", "electronic waste", "electronics"],
    answer: "E-waste includes discarded phones, computers, chargers, appliances and other electronics. Do not put electronics in ordinary household bins. Use an authorized e-waste collection or recycling channel, and remove personal data from devices before handing them over."
  },
  {
    keys: ["battery", "batteries", "lithium"],
    answer: "Do not place batteries—especially lithium-ion batteries—in ordinary trash or mixed recycling. Keep damaged batteries away from heat and flammable materials, avoid puncturing or crushing them, and use an approved battery/e-waste collection point. Local handling rules can differ."
  },
  {
    keys: ["compost", "composting", "vermicompost"],
    answer: "Composting is the controlled biological breakdown of suitable organic waste into a nutrient-rich soil amendment. Keep appropriate food and garden waste separate, maintain a balance of moist 'green' material and dry 'brown' material, provide airflow, and avoid adding materials your compost system does not accept."
  },
  {
    keys: ["landfill", "landfills"],
    answer: "A landfill is an engineered site where waste is contained and managed. Landfilling is generally preferable only for waste that cannot be prevented, reused, recycled, composted, or otherwise recovered, because landfills consume space and can create environmental impacts if poorly managed."
  },
  {
    keys: ["hazardous waste", "chemical waste", "paint", "pesticide"],
    answer: "Hazardous waste can include chemicals, solvents, pesticides, certain paints, oils and other materials that can harm people or the environment. Do not pour them into drains or mix unknown chemicals. Keep them in their original labeled container when safe and use an approved hazardous-waste collection service."
  },
  {
    keys: ["medical waste", "biomedical waste", "syringe", "needle", "sharps"],
    answer: "Medical and sharps waste needs special handling. Never place loose needles or sharps in ordinary household recycling or trash. Use the approved sharps/medical-waste route available in your area and follow healthcare or municipal instructions."
  },
  {
    keys: ["textile waste", "old clothes", "clothes"],
    answer: "For unwanted textiles, prioritize repair, reuse, donation, resale or upcycling when the items are still usable. For damaged textiles, use a textile-recycling or take-back program if one exists locally rather than assuming they belong in mixed recycling."
  },
  {
    keys: ["reduce waste", "reduce waste at home", "zero waste"],
    answer: "Start with prevention: buy only what you need, choose durable or refillable products, avoid unnecessary packaging, reuse containers and bags, repair items, donate usable goods, compost suitable organics, and recycle only through systems that actually accept the material."
  },
  {
    keys: ["recycling", "how recycling works", "recycle"],
    answer: "Recycling usually involves collection, sorting, processing the recovered material, and manufacturing it into new products. Not every item marked with a recycling symbol is accepted everywhere, so local acceptance rules matter. Keep accepted recyclables clean, dry and separated as required."
  },
  {
    keys: ["waste management", "manage waste", "waste management system"],
    answer: "Good waste management follows a hierarchy: prevent waste first, then reduce, reuse, repair, recycle or compost where practical, recover value where appropriate, and use disposal for the remaining waste. Effective systems also need safe collection, sorting, treatment, worker protection and responsible final disposal."
  },
  {
    keys: ["sustainable packaging", "packaging waste"],
    answer: "More sustainable packaging generally means using less material, choosing reusable or recyclable formats that are actually supported locally, avoiding unnecessary layers, and designing packaging for recovery. A package is not automatically recyclable just because it carries a recycling symbol."
  },
  {
    keys: ["how can ai", "artificial intelligence", "machine learning"],
    answer: "AI can support waste management by identifying materials in images, improving sorting, predicting collection demand, optimizing collection routes, detecting overflowing bins, forecasting waste generation, and analyzing recycling data. Human oversight and local operational rules are still important."
  },
  {
    keys: ["waste project", "waste management project", "project idea"],
    answer: "Useful waste-management projects include smart-bin fill-level monitoring, image-based waste classification, route optimization for collection vehicles, compost monitoring, e-waste tracking, recycling awareness platforms, and dashboards that measure waste diversion and recovery rates."
  }
];

function normalizeQuestion(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function isWasteRelated(text) {
  const q = normalizeQuestion(text);
  return WASTE_TERMS.some(term => q.includes(term));
}

function localWasteAnswer(text) {
  const q = normalizeQuestion(text);
  const exact = LOCAL_WASTE_KB.find(entry => entry.keys.some(key => q.includes(key)));
  if (exact) return exact.answer;
  if (!isWasteRelated(q)) return AURA_REFUSAL;
  return "That is related to waste management, so I can help. A good approach is to first identify the waste type and material, then choose prevention, reuse, recycling, composting, specialist treatment, or disposal as appropriate. Local collection and disposal rules can differ. If you tell me the specific item or situation, I can give more precise guidance.";
}

async function askOptionalGemini(messages) {
  try {
    const response = await fetch("/.netlify/functions/aura-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "chat", messages })
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    return typeof payload.text === "string" && payload.text.trim() ? payload.text.trim() : null;
  } catch {
    return null;
  }
}

function AskPage() {
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi! I’m AURA. I focus exclusively on waste and waste-management topics. Ask me about recycling, segregation, composting, disposal, e-waste, sustainability, or any other waste-related topic." }]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = value.trim();
    if (!q || loading) return;
    const next = [...messages, { from: "user", text: q }];
    setMessages(next);
    setValue("");
    setLoading(true);

    // AURA works without any API: the built-in waste knowledge base answers first.
    const local = localWasteAnswer(q);
    setMessages(m => [...m, { from: "bot", text: local }]);

    // Optional AI enhancement: only ask Gemini for in-scope questions that the
    // local knowledge base could not answer specifically. If the API is missing,
    // AURA simply keeps the local answer and continues working.
    const hasSpecificLocalMatch = LOCAL_WASTE_KB.some(entry => entry.keys.some(key => normalizeQuestion(q).includes(key)));
    if (isWasteRelated(q) && !hasSpecificLocalMatch) {
      const ai = await askOptionalGemini(next.slice(-12).map(m => ({ role: m.from === "user" ? "user" : "model", text: m.text })));
      if (ai) setMessages(m => [...m, { from: "bot", text: ai }]);
    }
    setLoading(false);
  };

  return (
    <section className="page ask-page">
      <div className="chat-card">
        <div className="chat-header"><MessageSquare size={27}/><strong>AURA Eco-Assistant</strong><span className="ai-badge">WASTE AI</span></div>
        <div className="messages">
          {messages.map((m, i) => <div key={i} className={`message ${m.from}`}>{m.text}</div>)}
          {loading && <div className="message bot typing"><Sparkles size={17}/> Checking AURA’s waste knowledge…</div>}
        </div>
        <div className="chat-input-row">
          <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about waste management..." disabled={loading} />
          <button onClick={send} aria-label="Send" disabled={loading}><ArrowRight size={25}/></button>
        </div>
      </div>
    </section>
  );
}

function GuidePage({ onScan }) {
  return (
    <section className="page guide-page">
      <PageIntro title="How to Use AURA" subtitle="Master the art of sustainable waste management in 4 simple steps." />
      <div className="guide-grid">
        {GUIDE.map(({ n, title, text, icon: Icon, tone }) => (
          <article className={`guide-card ${tone}`} key={n}>
            <span className="guide-number">{n}</span>
            <span className="guide-icon"><Icon size={31}/></span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="pro-tip">
        <span className="info-icon"><Info size={35}/></span>
        <div>
          <h2>Pro Tip: Use the Eco-Assistant</h2>
          <p>Still unsure about a specific item? Head over to the "Ask" section to chat with our AI assistant. It can answer complex questions about composting, hazardous materials, and local regulations.</p>
          <button onClick={() => document.querySelector('[aria-label="Main navigation"] button:nth-child(5)')?.click()}>
            Try Eco-Assistant <ArrowRight size={19}/>
          </button>
        </div>
      </div>
      <button className="first-scan" onClick={onScan}>Start Your First Scan</button>
    </section>
  );
}

function PageIntro({ title, subtitle, align = "center" }) {
  return (
    <div className={`page-intro ${align}`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function Footer() {
  return <footer><span>© 2026 AURA</span><em>Powered by BSVP</em></footer>;
}

function CameraModal({ facing, setFacing, captured, setCaptured, error, setError, onClose, onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported by this browser.");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access in your browser settings and try again."
            : e?.message || "Unable to access the camera."
        );
      }
    }
    start();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [facing, setError]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg", 0.88));
  };

  const useCapture = () => {
    if (captured) onResult(captured);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Camera scanner">
      <div className="camera-modal">
        <div className="camera-top">
          <strong>Scan Waste</strong>
          <button onClick={onClose} aria-label="Close"><X size={23}/></button>
        </div>
        <div className="camera-view">
          {captured ? (
            <img src={captured} alt="Captured waste" />
          ) : (
            <video ref={videoRef} playsInline muted autoPlay />
          )}
          {!captured && !error && <span className="camera-frame" />}
          {error && <div className="camera-error"><Camera size={35}/><p>{error}</p><small>Camera access works on localhost/HTTPS. On phones and tablets, use the normal rear camera; laptops can use their built-in camera.</small></div>}
        </div>
        <canvas ref={canvasRef} hidden />
        <div className="camera-controls">
          {!captured ? (
            <>
              <button className="secondary-btn" onClick={() => setFacing(f => f === "environment" ? "user" : "environment")}><RotateCcw size={19}/> Switch Camera</button>
              <button className="shutter" onClick={capture} disabled={!!error}><span /></button>
              <button className="secondary-btn" onClick={onClose}>Cancel</button>
            </>
          ) : (
            <>
              <button className="secondary-btn" onClick={() => setCaptured(null)}>Retake</button>
              <button className="green-btn" onClick={useCapture}>Use Scan <ArrowRight size={18}/></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
