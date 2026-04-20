require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcrypt");
const path = require("path");
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const db = require("./db");
const gen = require("./generators");

const app = express();
const PORT = process.env.PORT || 5000;

app.use("/webhook/stripe", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({ pool: db.pool, tableName: "session", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "sfs-toolkit-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" },
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

/* ───────────────────────────── AUTH ─────────────────────────────── */

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required." });
    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters." });

    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: "An account with this email already exists." });

    const hash = await bcrypt.hash(password, 12);
    const user = await db.createUser(name, email, hash);
    req.session.userId = user.id;
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });

    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid email or password." });

    req.session.userId = user.id;
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/auth/me", async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await db.getUserById(req.session.userId);
  if (!user) return res.json({ user: null });
  const usage = await db.getUsage(user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan }, usage, freeLimit: db.FREE_LIMIT });
});

/* ───────────────────────────── SETTINGS ─────────────────────────── */

app.get("/api/settings", requireAuth, async (req, res) => {
  const settings = await db.getUserSettings(req.session.userId);
  res.json({ settings });
});

app.post("/api/settings", requireAuth, async (req, res) => {
  try {
    await db.saveUserSettings(req.session.userId, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Settings error:", err);
    res.status(500).json({ error: "Could not save settings." });
  }
});

/* ─────────────────────────── GENERATORS ─────────────────────────── */

async function handleGenerate(req, res, tool, generatorFn) {
  try {
    const check = await db.canGenerate(req.session.userId, tool);
    if (!check.allowed) {
      return res.status(403).json({
        error: "free_limit_reached",
        message: `You've used all ${db.FREE_LIMIT} free generations for this month. Upgrade to Pro for unlimited access.`,
        remaining: 0,
      });
    }

    const settings = await db.getUserSettings(req.session.userId);
    const files = generatorFn(req.body, settings);

    await db.incrementUsage(req.session.userId, tool);
    const updated = await db.canGenerate(req.session.userId, tool);

    res.json({ ok: true, files, remaining: updated.allowed ? updated.remaining : 0 });
  } catch (err) {
    console.error(`Generate error [${tool}]:`, err);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
}

app.post("/api/generate/onboarding", requireAuth, (req, res) => {
  handleGenerate(req, res, "onboarding", (body, s) => {
    const c = body;
    return [
      { icon: "📄", label: "Contract template", fileName: "contract.md", content: gen.generateContract(c, s) },
      { icon: "✅", label: "Task checklist", fileName: "task-checklist.md", content: gen.generateChecklist(c, s) },
      { icon: "📋", label: "Client brief", fileName: "client-brief.md", content: gen.generateClientBrief(c, s) },
    ];
  });
});

app.post("/api/generate/launch-kit", requireAuth, (req, res) => {
  handleGenerate(req, res, "launch-kit", (body, s) => {
    const service = {
      ...body,
      benefits: Array.isArray(body.benefits)
        ? body.benefits
        : (body.benefits || "").split("\n").map((b) => b.trim()).filter(Boolean),
      cta: body.cta || "Get in touch today",
    };
    return [
      { icon: "📧", label: "Email pitch", fileName: "email-pitch.md", content: gen.generateEmailPitch(service, s) },
      { icon: "📱", label: "Social media posts", fileName: "social-media-posts.md", content: gen.generateSocialPosts(service, s) },
      { icon: "🌐", label: "Website section (HTML)", fileName: "website-section.html", content: gen.generateWebsiteSection(service, s) },
    ];
  });
});

app.post("/api/generate/outreach", requireAuth, (req, res) => {
  handleGenerate(req, res, "outreach", (body, s) => {
    const p = body;
    return [
      { icon: "📧", label: "Email 1 — Introduction", fileName: "email-1-intro.md", content: gen.generateOutreachEmail1(p, s) },
      { icon: "📧", label: "Email 2 — Follow-Up", fileName: "email-2-followup.md", content: gen.generateOutreachEmail2(p, s) },
      { icon: "📧", label: "Email 3 — Final Check-In", fileName: "email-3-final.md", content: gen.generateOutreachEmail3(p, s) },
      { icon: "🖼️", label: "Pitch Deck Outline", fileName: "pitch-deck-outline.md", content: gen.generatePitchDeckOutline(p, s) },
    ];
  });
});

/* ─────────────────────────── STRIPE ──────────────────────────────── */

app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({ error: "Payments not configured yet." });
  }
  try {
    const user = await db.getUserById(req.session.userId);
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await db.setStripeCustomerId(user.id, customerId);
    }

    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/upgrade-success.html`,
      cancel_url: `${origin}/`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

app.post("/webhook/stripe", async (req, res) => {
  if (!stripe) return res.sendStatus(200);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.sendStatus(200);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await db.upgradeUserToPaid(session.customer, session.subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await db.downgradeUserToFree(sub.customer);
  }

  res.sendStatus(200);
});

/* ─────────────────────────── PAGE ROUTES ─────────────────────────── */

app.get("/", (req, res) => {
  if (!req.session.userId) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

/* ───────────────────────────── START ─────────────────────────────── */

(async () => {
  await db.initDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SFS Toolkit server running on port ${PORT}`);
  });
})();
