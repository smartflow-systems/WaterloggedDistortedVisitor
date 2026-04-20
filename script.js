const SETTINGS_DEFAULTS = {
  businessName: "SmartFlow Systems",
  yourName: "",
  email: "",
  phone: "",
  website: "",
  logoUrl: "",
  calendarLink: "",
};

let sfsSettings = Object.assign({}, SETTINGS_DEFAULTS);

async function loadSettings(extensionReady) {
  try {
    if (extensionReady) {
      const result = await replit.fs.readFile("settings/settings.json", "utf8");
      sfsSettings = Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(result.content));
      return;
    }
  } catch (_) {}
  try {
    const stored = localStorage.getItem("sfs_settings");
    if (stored) sfsSettings = Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(stored));
  } catch (_) {}
}

async function saveSettings(settings, extensionReady) {
  sfsSettings = Object.assign({}, SETTINGS_DEFAULTS, settings);
  const json = JSON.stringify(sfsSettings, null, 2);
  try { localStorage.setItem("sfs_settings", json); } catch (_) {}
  if (extensionReady) {
    try { await replit.fs.createDir("settings"); } catch (_) {}
    await replit.fs.writeFile("settings/settings.json", json);
  }
}

async function main() {
  let extensionReady = true;
  try {
    await Promise.race([
      replit.init(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch (_) {
    extensionReady = false;
  }

  await loadSettings(extensionReady);

  document.getElementById("loading").style.display = "none";
  document.getElementById("main-content").style.display = "flex";

  if (!extensionReady) {
    const notice = document.createElement("div");
    notice.className = "preview-notice";
    notice.innerHTML = "⚠️ <strong>Preview mode</strong> — File generation requires this tool to be opened inside Replit Extension Devtools.";
    document.querySelector(".tab-nav").after(notice);
  }

  setupTabs();
  setupOnboardingWizard();
  setupLaunchKitGenerator();
  setupSettingsPanel(extensionReady);
}

function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById("tab-" + targetTab).classList.add("active");
    });
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function today() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function setWizardStep(stepNum) {
  const steps = document.querySelectorAll(".step");
  const lines = document.querySelectorAll(".step-line");
  const panels = document.querySelectorAll(".wizard-step");

  panels.forEach((p, i) => {
    p.style.display = i + 1 === stepNum ? "flex" : "none";
  });

  steps.forEach((s, i) => {
    s.classList.remove("active", "completed");
    if (i + 1 === stepNum) s.classList.add("active");
    else if (i + 1 < stepNum) s.classList.add("completed");
  });

  lines.forEach((l, i) => {
    l.classList.toggle("completed", i + 1 < stepNum);
  });
}

function buildReviewSummary(client) {
  const budgetLabels = {
    "under-1k": "Under $1,000",
    "1k-5k": "$1,000 – $5,000",
    "5k-10k": "$5,000 – $10,000",
    "10k-25k": "$10,000 – $25,000",
    "25k-plus": "$25,000+",
  };
  const timelineLabels = {
    "1-2-weeks": "1–2 Weeks",
    "1-month": "1 Month",
    "2-3-months": "2–3 Months",
    "3-6-months": "3–6 Months",
    "6-months-plus": "6+ Months",
  };
  const rows = [
    ["Client", client.name],
    ["Company", client.company],
    ["Email", client.email || "—"],
    ["Phone", client.phone || "—"],
    ["Project Type", client.projectType.replace(/-/g, " ") || "—"],
    ["Budget", budgetLabels[client.budget] || "—"],
    ["Start Date", client.startDate || "TBC"],
    ["Duration", timelineLabels[client.timeline] || "—"],
  ];
  return rows
    .map(
      ([label, value]) =>
        `<div class="review-row"><span class="review-label">${label}</span><span class="review-value">${value}</span></div>`
    )
    .join("");
}

function setupOnboardingWizard() {
  const form = document.getElementById("onboarding-form");
  const resultPanel = document.getElementById("onboarding-result");

  setWizardStep(1);

  document.getElementById("step1-next").addEventListener("click", () => {
    const name = document.getElementById("client-name").value.trim();
    const company = document.getElementById("client-company").value.trim();
    if (!name || !company) {
      alert("Please enter the Client Name and Company Name to continue.");
      return;
    }
    setWizardStep(2);
  });

  document.getElementById("step2-back").addEventListener("click", () => {
    setWizardStep(1);
  });

  document.getElementById("step2-next").addEventListener("click", () => {
    const type = document.getElementById("project-type").value;
    if (!type) {
      alert("Please select a Project Type to continue.");
      return;
    }
    const client = {
      name: document.getElementById("client-name").value.trim(),
      company: document.getElementById("client-company").value.trim(),
      email: document.getElementById("client-email").value.trim(),
      phone: document.getElementById("client-phone").value.trim(),
      projectType: type,
      budget: document.getElementById("project-budget").value,
      startDate: document.getElementById("project-start").value,
      timeline: document.getElementById("project-timeline").value,
      requirements: document.getElementById("project-requirements").value.trim(),
    };
    document.getElementById("review-summary").innerHTML = buildReviewSummary(client);
    setWizardStep(3);
  });

  document.getElementById("step3-back").addEventListener("click", () => {
    setWizardStep(2);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("onboarding-submit");
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating files...';

    const client = {
      name: document.getElementById("client-name").value.trim(),
      company: document.getElementById("client-company").value.trim(),
      email: document.getElementById("client-email").value.trim(),
      phone: document.getElementById("client-phone").value.trim(),
      projectType: document.getElementById("project-type").value,
      budget: document.getElementById("project-budget").value,
      startDate: document.getElementById("project-start").value,
      timeline: document.getElementById("project-timeline").value,
      requirements: document.getElementById("project-requirements").value.trim(),
    };

    const folderName = "clients/" + slugify(client.company || client.name);
    const createdFiles = [];

    try {
      try { await replit.fs.createDir("clients"); } catch (_) {}
      try { await replit.fs.createDir(folderName); } catch (_) {}
      try { await replit.fs.createDir(folderName + "/docs"); } catch (_) {}
      try { await replit.fs.createDir(folderName + "/assets"); } catch (_) {}
      try { await replit.fs.createDir(folderName + "/deliverables"); } catch (_) {}

      const contractContent = generateContract(client);
      const contractPath = folderName + "/contract.md";
      await replit.fs.writeFile(contractPath, contractContent);
      createdFiles.push({ icon: "📄", label: "Contract template", path: contractPath });

      const checklistContent = generateChecklist(client);
      const checklistPath = folderName + "/task-checklist.md";
      await replit.fs.writeFile(checklistPath, checklistContent);
      createdFiles.push({ icon: "✅", label: "Task checklist", path: checklistPath });

      const briefContent = generateClientBrief(client);
      const briefPath = folderName + "/client-brief.md";
      await replit.fs.writeFile(briefPath, briefContent);
      createdFiles.push({ icon: "📋", label: "Client brief", path: briefPath });

      resultPanel.className = "result-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = buildResultHTML(
        "Onboarding files created!",
        "Client folder set up at <code>" + folderName + "/</code> with contract, checklist, and brief.",
        createdFiles
      );
      try {
        await replit.messages.showConfirm("✅ Onboarding files created for " + client.company + "!");
      } catch (_) {}
    } catch (err) {
      resultPanel.className = "error-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = "⚠️ Could not write files. Open this tool inside Replit Extension Devtools for full functionality. (" + err.message + ")";
    }

    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">⚡</span> Generate Onboarding Files';

    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function generateContract(c) {
  const budgetLabels = {
    "under-1k": "Under $1,000",
    "1k-5k": "$1,000 – $5,000",
    "5k-10k": "$5,000 – $10,000",
    "10k-25k": "$10,000 – $25,000",
    "25k-plus": "$25,000+",
  };
  const timelineLabels = {
    "1-2-weeks": "1–2 Weeks",
    "1-month": "1 Month",
    "2-3-months": "2–3 Months",
    "3-6-months": "3–6 Months",
    "6-months-plus": "6+ Months",
  };

  const bizName = sfsSettings.businessName || "SmartFlow Systems";
  const bizContact = sfsSettings.yourName ? ` — ${sfsSettings.yourName}` : "";
  const bizEmail = sfsSettings.email ? `\n- **Email:** ${sfsSettings.email}` : "";
  const bizPhone = sfsSettings.phone ? `\n- **Phone:** ${sfsSettings.phone}` : "";
  const bizWebsite = sfsSettings.website ? `\n- **Website:** ${sfsSettings.website}` : "";

  return `# SERVICE AGREEMENT
## ${bizName} × ${c.company}

**Date:** ${today()}
**Prepared by:** ${bizName}

---

## 1. PARTIES

**Service Provider:**
${bizName}${bizContact}${bizEmail}${bizPhone}${bizWebsite}

**Client:**
- **Name:** ${c.name}
- **Company:** ${c.company}
- **Email:** ${c.email || "—"}
- **Phone:** ${c.phone || "—"}

---

## 2. PROJECT SCOPE

**Project Type:** ${c.projectType.replace(/-/g, " ")}
**Budget Range:** ${budgetLabels[c.budget] || "To be agreed"}
**Estimated Duration:** ${timelineLabels[c.timeline] || "To be agreed"}
**Proposed Start Date:** ${c.startDate || "To be confirmed"}

### Requirements & Objectives

${c.requirements || "To be defined in discovery session."}

---

## 3. DELIVERABLES

The following deliverables will be agreed upon and documented in a separate project specification:

- [ ] Detailed project specification document
- [ ] Regular progress updates (cadence to be agreed)
- [ ] Final deliverable(s) as per scope
- [ ] Handover documentation

---

## 4. PAYMENT TERMS

- **Payment schedule:** To be agreed
- **Invoice terms:** 14 days from invoice date
- **Late payment:** 2% per month on overdue amounts

---

## 5. INTELLECTUAL PROPERTY

All work produced under this agreement remains the property of the Client upon receipt of full payment. ${bizName} retains the right to showcase completed work in its portfolio unless otherwise agreed in writing.

---

## 6. CONFIDENTIALITY

Both parties agree to keep all project information, business data, and communications confidential during and after the engagement.

---

## 7. TERMINATION

Either party may terminate this agreement with 14 days written notice. Any work completed prior to termination will be invoiced accordingly.

---

## 8. SIGNATURES

**${bizName}**
Signature: ______________________ Date: ______________

**${c.name} (${c.company})**
Signature: ______________________ Date: ______________

---
*This document was generated by the SFS Business Toolkit on ${today()}.*
`;
}

function generateChecklist(c) {
  return `# Onboarding Checklist — ${c.company}

**Client:** ${c.name} | ${c.company}
**Generated:** ${today()}

---

## Pre-Project

- [ ] Send welcome email to ${c.name}
- [ ] Schedule kick-off call
- [ ] Share this checklist with the team
- [ ] Set up client folder in project management tool
- [ ] Send and collect signed contract
- [ ] Collect initial deposit / confirm payment terms
- [ ] Gather any existing assets (logos, brand guide, copy, etc.)

## Discovery & Planning

- [ ] Conduct kick-off meeting / discovery session
- [ ] Document all client requirements in detail
- [ ] Define project milestones and delivery dates
- [ ] Create and share project timeline
- [ ] Get sign-off on project spec / scope document
- [ ] Set up communication channel (Slack, email thread, etc.)
- [ ] Agree on check-in cadence (weekly, bi-weekly, etc.)

## Project Execution

- [ ] Begin work per agreed timeline
- [ ] Provide first progress update
- [ ] Mid-project review with client
- [ ] Incorporate feedback rounds (agree number upfront)
- [ ] Internal QA / testing before delivery

## Delivery & Handover

- [ ] Deliver final work for client review
- [ ] Address final feedback / revisions
- [ ] Prepare handover documentation
- [ ] Deliver final files / access credentials
- [ ] Confirm client satisfaction
- [ ] Send final invoice

## Post-Project

- [ ] Send thank you / follow-up email
- [ ] Request testimonial / review
- [ ] Add to portfolio (if permission granted)
- [ ] Log project in SFS records
- [ ] Identify upsell / retainer opportunity

---
*Generated by SFS Business Toolkit on ${today()}.*
`;
}

function generateClientBrief(c) {
  const budgetLabels = {
    "under-1k": "Under $1,000",
    "1k-5k": "$1,000 – $5,000",
    "5k-10k": "$5,000 – $10,000",
    "10k-25k": "$10,000 – $25,000",
    "25k-plus": "$25,000+",
  };
  return `# Client Brief — ${c.company}

**Date Added:** ${today()}

| Field | Details |
|---|---|
| Client Name | ${c.name} |
| Company | ${c.company} |
| Email | ${c.email || "—"} |
| Phone | ${c.phone || "—"} |
| Project Type | ${c.projectType.replace(/-/g, " ")} |
| Budget | ${budgetLabels[c.budget] || "—"} |
| Start Date | ${c.startDate || "TBC"} |
| Timeline | ${c.timeline.replace(/-/g, " ")} |

## Notes & Requirements

${c.requirements || "No additional notes provided."}

---
*Generated by SFS Business Toolkit on ${today()}.*
`;
}

function setupLaunchKitGenerator() {
  const form = document.getElementById("launch-form");
  const resultPanel = document.getElementById("launch-result");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("launch-submit");
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating kit...';

    const service = {
      name: document.getElementById("service-name").value.trim(),
      category: document.getElementById("service-category").value,
      description: document.getElementById("service-description").value.trim(),
      audience: document.getElementById("service-audience").value.trim(),
      price: document.getElementById("service-price").value.trim(),
      benefits: document
        .getElementById("service-benefits")
        .value.trim()
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
      cta: document.getElementById("service-cta").value.trim() || "Get in touch today",
    };

    const folderName = "launch-kits/" + slugify(service.name);
    const createdFiles = [];

    try {
      try { await replit.fs.createDir("launch-kits"); } catch (_) {}
      try { await replit.fs.createDir(folderName); } catch (_) {}

      const emailContent = generateEmailPitch(service);
      const emailPath = folderName + "/email-pitch.md";
      await replit.fs.writeFile(emailPath, emailContent);
      createdFiles.push({ icon: "📧", label: "Email pitch", path: emailPath });

      const socialContent = generateSocialPosts(service);
      const socialPath = folderName + "/social-media-posts.md";
      await replit.fs.writeFile(socialPath, socialContent);
      createdFiles.push({ icon: "📱", label: "Social media posts", path: socialPath });

      const websiteContent = generateWebsiteSection(service);
      const websitePath = folderName + "/website-section.html";
      await replit.fs.writeFile(websitePath, websiteContent);
      createdFiles.push({ icon: "🌐", label: "Website section (HTML)", path: websitePath });

      resultPanel.className = "result-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = buildResultHTML(
        "Launch Kit ready!",
        "Your marketing pack for <strong>" + service.name + "</strong> has been saved to <code>" + folderName + "/</code>",
        createdFiles
      );
      try {
        await replit.messages.showConfirm("🚀 Launch Kit generated for " + service.name + "!");
      } catch (_) {}
    } catch (err) {
      resultPanel.className = "error-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = "⚠️ Could not write files. Open this tool inside Replit Extension Devtools for full functionality. (" + err.message + ")";
    }

    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">🚀</span> Generate Launch Kit';

    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function setupSettingsPanel(extensionReady) {
  const form = document.getElementById("settings-form");
  const resultPanel = document.getElementById("settings-result");

  document.getElementById("settings-business-name").value = sfsSettings.businessName || "";
  document.getElementById("settings-your-name").value = sfsSettings.yourName || "";
  document.getElementById("settings-email").value = sfsSettings.email || "";
  document.getElementById("settings-phone").value = sfsSettings.phone || "";
  document.getElementById("settings-website").value = sfsSettings.website || "";
  document.getElementById("settings-calendar").value = sfsSettings.calendarLink || "";
  document.getElementById("settings-logo").value = sfsSettings.logoUrl || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("settings-submit");
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Saving...';

    const settings = {
      businessName: document.getElementById("settings-business-name").value.trim() || SETTINGS_DEFAULTS.businessName,
      yourName: document.getElementById("settings-your-name").value.trim(),
      email: document.getElementById("settings-email").value.trim(),
      phone: document.getElementById("settings-phone").value.trim(),
      website: document.getElementById("settings-website").value.trim(),
      calendarLink: document.getElementById("settings-calendar").value.trim(),
      logoUrl: document.getElementById("settings-logo").value.trim(),
    };

    try {
      await saveSettings(settings, extensionReady);
      resultPanel.className = "result-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = `
        <div class="result-header">
          <span class="result-icon">✅</span>
          <h3>Settings saved!</h3>
        </div>
        <p style="color:var(--text-secondary);font-size:13px;margin-top:8px;">Your business details will now be pre-filled in all generated documents.</p>
      `;
    } catch (err) {
      resultPanel.className = "error-panel";
      resultPanel.style.display = "block";
      resultPanel.innerHTML = "⚠️ Could not save settings to file. Settings have been saved locally for this session. (" + err.message + ")";
    }

    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    submitBtn.innerHTML = '<span class="btn-icon">💾</span> Save Settings';

    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function generateEmailPitch(s) {
  const bulletList = s.benefits.map((b) => `- ${b}`).join("\n");
  const senderName = sfsSettings.yourName || "[Your Name]";
  const senderBusiness = sfsSettings.businessName || "SmartFlow Systems";
  const senderEmail = sfsSettings.email || "[Your Email]";
  const senderPhone = sfsSettings.phone || "[Your Phone]";
  const calendarLink = sfsSettings.calendarLink || "[Your Calendar Link]";

  return `# Email Pitch — ${s.name}

**Generated:** ${today()}

---

## Subject Line Options

1. Introducing ${s.name} — Built for ${s.audience}
2. Here's how we help ${s.audience} [result]
3. Stop [pain point] — ${s.name} is here

---

## Email Body

**Subject:** Introducing ${s.name}

Hi [First Name],

I wanted to reach out because I think ${s.name} could make a real difference for you.

${s.description}

Here's what you get:

${bulletList}

${s.price ? "**Pricing:** " + s.price : ""}

If this sounds like something you've been looking for, I'd love to chat. ${s.cta}.

Best,
${senderName}
${senderBusiness}
${senderEmail} | ${senderPhone}

---

## Follow-Up Email (send 3–5 days later)

**Subject:** Quick follow-up on ${s.name}

Hi [First Name],

Just circling back on my last message about ${s.name}.

I know your inbox is busy, so I'll keep this short — if ${s.description.toLowerCase()}, we can help.

Would a quick 15-minute call this week work for you?

${calendarLink}

Best,
${senderName}

---
*Generated by SFS Business Toolkit on ${today()}.*
`;
}

function generateSocialPosts(s) {
  const benefitHighlight = s.benefits[0] || "saving you time and money";
  const bulletList = s.benefits.map((b) => `• ${b}`).join("\n");
  const bizName = sfsSettings.businessName || "SmartFlow Systems";
  const bizTag = bizName.replace(/\s+/g, "");

  return `# Social Media Posts — ${s.name}

**Generated:** ${today()}

---

## LinkedIn Post

🚀 Introducing ${s.name}

${s.description}

We built this specifically for ${s.audience} — and here's what makes it different:

${bulletList}

${s.price ? s.price + " | " : ""}${s.cta}.

Drop a comment or DM us to learn more. 👇

#${bizTag} #${s.category || "Business"} #${s.audience.split(" ")[0]}Solutions

---

## Twitter / X Post (under 280 chars)

Introducing ${s.name} — built for ${s.audience}.

${benefitHighlight}.

${s.price ? s.price + " | " : ""}${s.cta}. 🚀

---

## Twitter / X Thread

**Tweet 1:**
🧵 We just launched ${s.name}. Here's everything you need to know (thread) 👇

**Tweet 2:**
The problem: ${s.audience} often struggle with [common pain point].

${s.name} was built to fix exactly that.

**Tweet 3:**
Here's what's included:
${s.benefits.map((b, i) => (i + 1) + ". " + b).join("\n")}

**Tweet 4:**
${s.price ? "Pricing: " + s.price : "Interested? Let's talk."}

${s.cta}. Reply or DM us to get started. 🚀

---

## Instagram Caption

✨ ${s.name} is here!

${s.description}

Perfect for ${s.audience} who want to:
${bulletList}

${s.price ? "💰 " + s.price : ""}

👉 ${s.cta} — link in bio!

.
.
.
#${bizTag} #SmallBusiness #BusinessGrowth #${s.category || "Entrepreneur"} #Productivity #BusinessTips

---
*Generated by SFS Business Toolkit on ${today()}.*
`;
}

function generateWebsiteSection(s) {
  const benefitItems = s.benefits
    .map(
      (b) => `
      <li class="sfs-benefit-item">
        <span class="sfs-benefit-icon">✓</span>
        <span>${b}</span>
      </li>`
    )
    .join("");

  const bizName = sfsSettings.businessName || "SmartFlow Systems";
  const bizWebsite = sfsSettings.website || "#contact";
  const bizEmail = sfsSettings.email;
  const ctaHref = sfsSettings.calendarLink || bizWebsite;

  return `<!-- ${s.name} — Website Section -->
<!-- Generated by SFS Business Toolkit on ${today()} -->
<!-- Paste this into your website HTML. Styles are included inline. -->

<section class="sfs-service-section" style="background:#0d1117;color:#e6edf3;padding:80px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:760px;margin:0 auto;">

    <div style="text-align:center;margin-bottom:40px;">
      ${sfsSettings.logoUrl ? `<img src="${sfsSettings.logoUrl}" alt="${bizName} logo" style="height:48px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ""}
      <span style="background:linear-gradient(135deg,#4a9eff,#f0a500);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
        ${bizName}
      </span>
      <h2 style="font-size:36px;font-weight:800;margin:12px 0;line-height:1.2;">${s.name}</h2>
      <p style="font-size:18px;color:#8b949e;line-height:1.6;max-width:560px;margin:0 auto;">
        ${s.description}
      </p>
    </div>

    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:32px;margin-bottom:32px;">
      <p style="font-size:13px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">
        Built for ${s.audience}
      </p>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
        ${benefitItems}
      </ul>
    </div>

    <style>
      .sfs-benefit-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        font-size: 15px;
        line-height: 1.5;
      }
      .sfs-benefit-icon {
        width: 22px;
        height: 22px;
        background: rgba(63, 185, 80, 0.15);
        border: 1px solid #3fb950;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: #3fb950;
        flex-shrink: 0;
        margin-top: 1px;
      }
    </style>

    <div style="text-align:center;">
      ${s.price ? '<p style="font-size:15px;color:#8b949e;margin-bottom:16px;">' + s.price + '</p>' : ""}
      <a href="${ctaHref}" style="display:inline-block;background:linear-gradient(135deg,#4a9eff,#2176c7);color:white;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
        ${s.cta}
      </a>
    </div>

  </div>
</section>
`;
}

function buildResultHTML(title, message, files) {
  const fileItems = files
    .map(
      (f) => `
    <div class="result-file">
      <span class="result-file-icon">${f.icon}</span>
      <div>
        <div style="margin-bottom:2px;">${f.label}</div>
        <div class="result-file-path">${f.path}</div>
      </div>
    </div>`
    )
    .join("");

  return `
    <div class="result-header">
      <span class="result-icon">✅</span>
      <h3>${title}</h3>
    </div>
    <p class="result-message">${message}</p>
    <div class="result-files">${fileItems}</div>
  `;
}

window.addEventListener("load", main);
