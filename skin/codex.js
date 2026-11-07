// Codex skin for T3 Code: small DOM tweaks that CSS alone can't do.
// Toggle the whole skin with Ctrl+Alt+K (remembered in localStorage).
(() => {
  const STORAGE_KEY = "codex-skin:disabled";
  const root = document.documentElement;

  // One-time: follow the macOS appearance. Runs before T3's runtime reads the setting;
  // picking Light or Dark in Settings > Appearance afterwards sticks.
  const FOLLOW_SYSTEM_KEY = "codex-skin:follow-system:v1";
  try {
    if (!localStorage.getItem(FOLLOW_SYSTEM_KEY)) {
      localStorage.setItem("t3code:theme-appearance-mode", "system");
      localStorage.setItem(FOLLOW_SYSTEM_KEY, "1");
    }
  } catch {}

  const setEnabled = (enabled) => {
    root.classList.toggle("codex-skin", enabled);
    try {
      if (enabled) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  let disabled = false;
  try {
    disabled = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {}
  root.classList.toggle("codex-skin", !disabled);

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.altKey && event.code === "KeyK") {
      event.preventDefault();
      setEnabled(!root.classList.contains("codex-skin"));
    }
  });

  // "New chat" row under the sidebar search, proxying T3's own New thread button.
  const NEW_CHAT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  const ensureNewChatRow = () => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    if (!sidebar) return;
    const searchSection = sidebar.querySelector(':scope > div:has([aria-label="Search threads"])');
    if (!searchSection || searchSection.querySelector(".cx-new-chat")) return;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cx-new-chat";
    row.innerHTML = `${NEW_CHAT_ICON}<span>New chat</span>`;
    row.addEventListener("click", () => startNewThread());
    searchSection.appendChild(row);
  };

  // ---------- Icon rail extras ----------
  // Extra items live inside T3's footer menu as plain <li>s; CSS `order` places them, so
  // React's own items keep working around them. Everything is rebuilt idempotently.

  const icon = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const ICONS = {
    scheduled: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    archived: icon(
      '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    ),
    allProjects: icon(
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    ),
    folder: icon('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    pin: icon('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>'),
    unpin: icon('<path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/>'),
    up: icon('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'),
    down: icon('<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'),
    newThread: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    settings: icon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    hide: icon('<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>'),
    show: icon('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'),
    reset: icon('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
  };

  // Client-side navigation through T3's router (it listens to popstate).
  const navigate = (path) => {
    if (location.pathname === path) return;
    history.pushState(history.state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  };

  const railItem = (key, label, order) => {
    const li = document.createElement("li");
    li.className = "cx-rail-item";
    li.dataset.cxRail = key;
    li.style.order = String(order);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cx-rail-button";
    button.setAttribute("aria-label", label);
    button.dataset.tip = label;
    li.appendChild(button);
    return li;
  };

  const ensureItem = (menu, key, build) => {
    let li = menu.querySelector(`:scope > [data-cx-rail="${key}"]`);
    if (!li) {
      li = build();
      menu.appendChild(li);
    }
    return li;
  };

  const setIfChanged = (el, prop, value) => {
    if (el[prop] !== value) el[prop] = value;
  };

  const setAttrIfChanged = (el, name, value) => {
    if (value === null) {
      if (el.hasAttribute(name)) el.removeAttribute(name);
    } else if (el.getAttribute(name) !== value) {
      el.setAttribute(name, value);
    }
  };

  // Route shortcuts.
  const ROUTE_ITEMS = [
    { key: "scheduled", label: "Scheduled tasks", path: "/settings/scheduled-tasks", order: 10 },
    { key: "archived", label: "Archived threads", path: "/settings/archived", order: 11 },
  ];

  const ensureRouteItems = (menu) => {
    for (const item of ROUTE_ITEMS) {
      const li = ensureItem(menu, item.key, () => {
        const el = railItem(item.key, item.label, item.order);
        el.firstChild.innerHTML = ICONS[item.key];
        el.firstChild.addEventListener("click", () => navigate(item.path));
        return el;
      });
      setAttrIfChanged(li.firstChild, "data-active", location.pathname.startsWith(item.path) ? "true" : null);
    }
  };

  // Projects: clicking a rail project drives T3's own "Filter threads by project" combobox,
  // so the filter state stays T3's. A working row carries T3's status label: the
  // "Working"/"Goal" text in info color, with its elapsed time.
  const WORKING_STATUS = "span.font-medium.text-info-foreground";
  const rowWorking = (row) => row.querySelector(WORKING_STATUS) !== null;

  // T3's project avatar sits right before the project name. Depending on the project it is
  // an <img> favicon (plus a hidden preloading <img>), a monogram/emoji <span> or a lucide <svg>.
  const avatarBefore = (nameEl) => {
    let el = nameEl.previousElementSibling;
    while (el && el.matches("img.hidden")) el = el.previousElementSibling;
    return el;
  };

  const projectsFromRows = () => {
    const projects = new Map();
    for (const card of document.querySelectorAll('[data-testid="sidebar-row-card"]')) {
      const line1 = card.querySelector(":scope > div:not(.sr-only) > div:first-child");
      const nameEl = line1?.querySelector(":scope > .text-secondary-label");
      const name = nameEl?.textContent.trim();
      if (!name) continue;
      if (!projects.has(name)) projects.set(name, { avatar: avatarBefore(nameEl)?.outerHTML ?? ICONS.folder });
    }
    return projects;
  };

  const currentProjectFilter = () => {
    const trigger = document.querySelector('[aria-label^="Filter threads by project"]');
    const label = trigger?.getAttribute("aria-label") ?? "";
    const match = label.match(/^Filter threads by project: (.+)$/);
    return match ? match[1] : null;
  };

  let filtering = false;
  const selectProjectFilter = async (name) => {
    const trigger = document.querySelector('[aria-label^="Filter threads by project"]');
    if (!trigger || filtering) return;
    filtering = true;
    root.classList.add("cx-probing");
    try {
      trigger.click();
      let option = null;
      for (let i = 0; i < 20 && !option; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        option = [...document.querySelectorAll('[role="option"]')].find(
          (el) => (el.querySelector(".truncate") ?? el).textContent.trim() === name,
        );
      }
      if (option) option.click();
      else document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } finally {
      setTimeout(() => root.classList.remove("cx-probing"), 150);
      filtering = false;
    }
  };

  const waitFor = async (find, frames = 20) => {
    for (let i = 0; i < frames; i++) {
      const found = find();
      if (found) return found;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return find();
  };

  // Row aria-labels read "title, status, project"; the card's first line also shows the project.
  const rowProject = (row) => {
    const label = row.getAttribute("aria-label") ?? "";
    for (const name of [...knownProjects.keys(), ...catalog.projects.map((project) => project.name)]) {
      if (label === name || label.endsWith(`, ${name}`)) return name;
    }
    return row.querySelector(":scope > div:not(.sr-only) > div:first-child > .text-secondary-label")?.textContent.trim() ?? null;
  };
  const rowKey = (row) => row.closest("[data-thread-item]")?.getAttribute("data-thread-item") ?? null;
  const focusedRow = () => document.querySelector('[data-testid^="sidebar-row-"][aria-current="page"]');

  // Last thread focused in each project, so the rail can return to it.
  const LAST_THREAD_KEY = "codex-skin:last-thread-by-project";
  const lastThreadByProject = (() => {
    try {
      return new Map(Object.entries(JSON.parse(localStorage.getItem(LAST_THREAD_KEY) ?? "{}")));
    } catch {
      return new Map();
    }
  })();
  const rememberFocusedThread = () => {
    const row = focusedRow();
    const name = row && rowProject(row);
    const key = row && rowKey(row);
    if (!name || !key || lastThreadByProject.get(name) === key) return;
    lastThreadByProject.set(name, key);
    try {
      localStorage.setItem(LAST_THREAD_KEY, JSON.stringify(Object.fromEntries(lastThreadByProject)));
    } catch {}
  };

  // New thread in a given project: T3's New thread button opens its "New thread in..." picker
  // (or creates the thread directly when there is a single project); pick the project there.
  let bypassNewThread = false;
  const newThreadIn = async (name) => {
    const button = document.querySelector('[data-sidebar="sidebar"] button[aria-label="New thread"]');
    if (!button) return;
    root.classList.add("cx-probing");
    let item = null;
    try {
      bypassNewThread = true;
      button.click();
      bypassNewThread = false;
      item = await waitFor(() =>
        [...document.querySelectorAll('[data-testid="command-palette"] [data-slot="command-item"]')].find(
          (el) => el.querySelector(".truncate")?.textContent.trim() === name,
        ),
      );
      // Not in the picker under that name: leave T3's picker open so you choose.
      if (item) item.click();
    } finally {
      bypassNewThread = false;
      setTimeout(() => root.classList.remove("cx-probing"), item ? 150 : 0);
    }
  };

  // The project you're in: the sidebar's project filter, else the open thread's project
  // (T3's header shows it as a "New thread in <project>" button).
  const NEW_IN = "New thread in ";
  const headerNewThread = () => document.querySelector(`[aria-label="Thread breadcrumb"] button[aria-label^="${NEW_IN}"]`);
  const currentProject = () => currentProjectFilter() ?? headerNewThread()?.getAttribute("aria-label").slice(NEW_IN.length) ?? null;

  // New thread / New chat: straight into the current project, like Codex. With no current
  // project (All projects, no thread open), T3's own "New thread in..." picker opens.
  const startNewThread = () => {
    const name = currentProject();
    const header = headerNewThread();
    if (name && header && header.getAttribute("aria-label") === NEW_IN + name) return header.click();
    if (name) return newThreadIn(name);
    bypassNewThread = true;
    document.querySelector('[data-sidebar="sidebar"] button[aria-label="New thread"]')?.click();
    bypassNewThread = false;
  };
  document.addEventListener(
    "click",
    (event) => {
      if (bypassNewThread || !root.classList.contains("codex-skin")) return;
      const button = event.target instanceof Element ? event.target.closest('[data-sidebar="sidebar"] button[aria-label="New thread"]') : null;
      if (!button || !currentProject()) return;
      event.preventDefault();
      event.stopPropagation();
      startNewThread();
    },
    true,
  );

  // Rail click: filter to the project and, unless one of its threads is already focused, open
  // its last focused active thread (else its most recent active one, else a new thread).
  // Clicking the filtered project while on one of its threads clears the filter.
  let focusingProject = false;
  const focusProject = async (name) => {
    if (focusingProject) return;
    focusingProject = true;
    try {
      // Sidebar collapsed: open it on the project, so the click shows that project's threads.
      const collapsed = document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state") === "collapsed";
      if (collapsed) document.querySelector('button[aria-label="Toggle main sidebar"]')?.click();
      const focused = focusedRow();
      const inProject = focused !== null && rowProject(focused) === name;
      if (currentProjectFilter() === name) {
        if (collapsed) return;
        if (inProject) return selectProjectFilter("All projects");
      } else {
        await selectProjectFilter(name);
        await waitFor(() => currentProjectFilter() === name);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      if (inProject) return;
      const rows = [...document.querySelectorAll('[data-testid="sidebar-row-card"]')].filter((row) => rowProject(row) === name);
      const last = lastThreadByProject.get(name);
      const target = rows.find((row) => rowKey(row) === last) ?? rows[0];
      if (target) target.click();
      else await newThreadIn(name);
    } finally {
      focusingProject = false;
    }
  };

  // Remember projects seen in the rows (name + avatar) even while a filter hides them.
  const knownProjects = new Map();
  const refreshKnownProjects = () => {
    for (const [name, project] of projectsFromRows()) knownProjects.set(name, project);
  };

  // ---------- Working threads ----------
  // T3's sidebar subscribes to two stores: every project, and every thread with its runtime.
  // Their snapshot getters, found on the sidebar's React hooks, list each project's working
  // threads even while the Working shelf is collapsed or a project filter hides other rows.
  // If T3 reshapes them, this falls back to the working rows on screen.
  const WORKING_RUNTIME = new Set(["preparing", "queued", "starting", "running", "waiting"]);

  // Mirrors T3's row status: approvals, input and guest requests outrank "working", and a run
  // blocked on another thread reads as "waiting".
  const threadWorking = (t) =>
    !t.archivedAt &&
    !t.hasPendingApprovals &&
    !t.hasPendingUserInput &&
    t.pendingSubagentRequest !== "approval" &&
    t.pendingSubagentRequest !== "user_input" &&
    !((t.pendingGuestMessageCount ?? 0) > 0) &&
    !(t.runtime?.status === "running" && t.blockedOnThreadWait === true) &&
    WORKING_RUNTIME.has(t.runtime?.status);

  const reactFiber = (el) => {
    const key = el && Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
    return key ? el[key] : null;
  };

  const findStores = () => {
    const anchor = document.querySelector(
      '[data-slot="sidebar"] [data-testid^="sidebar-row-"], [data-slot="sidebar"] [data-slot="sidebar-content"] [data-slot="scroll-area-viewport"]',
    );
    for (let fiber = reactFiber(anchor), depth = 0; fiber && depth < 60; fiber = fiber.return, depth++) {
      if (typeof fiber.type !== "function" || fiber.type.prototype?.isReactComponent) continue;
      let projects = null;
      let threads = null;
      for (let hook = fiber.memoizedState; hook && typeof hook === "object" && "next" in hook; hook = hook.next) {
        const read = hook.queue?.getSnapshot;
        const first = Array.isArray(hook.memoizedState) ? hook.memoizedState[0] : null;
        if (typeof read !== "function" || !first || typeof first !== "object") continue;
        if (!projects && "workspaceRoot" in first) projects = read;
        else if (!threads && "runtime" in first && "projectId" in first) threads = read;
      }
      if (projects && threads) return { projects, threads };
    }
    return null;
  };

  let stores = null;
  let storesMissSince = 0;
  const readStores = () => {
    if (!stores && Date.now() - storesMissSince > 2000) {
      stores = findStores();
      if (!stores) storesMissSince = Date.now();
    }
    if (!stores) return null;
    try {
      const projects = stores.projects();
      const threads = stores.threads();
      if (Array.isArray(projects) && Array.isArray(threads)) return { projects, threads };
    } catch {}
    stores = null;
    return null;
  };

  // Every project title in T3's store (empty when the store isn't reachable).
  let storeProjectNames = [];

  // [{ project, title, path, snoozed, row? }], oldest run first.
  let working = [];
  const workingByProject = new Map();

  // The name T3 shows for a store project. When the same repo is a project on several linked
  // machines, T3 merges them under the repo's "owner/name" (e.g. "acme/api"),
  // and its filter picker only knows that name, not the project title.
  const projectLabels = (projects) => {
    const titleCount = new Map();
    for (const p of projects) titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1);
    const picker = new Set(catalog.projects.map((project) => project.name));
    return projects.map((p) => {
      const repo = p.repositoryIdentity?.displayName;
      if (!repo || repo === p.title) return p.title;
      if (picker.has(repo) && !picker.has(p.title)) return repo;
      if (picker.has(p.title)) return p.title;
      return titleCount.get(p.title) > 1 ? repo : p.title;
    });
  };

  const refreshWorking = () => {
    const data = readStores();
    if (data) {
      const labels = projectLabels(data.projects);
      storeProjectNames = [...new Set(labels)];
      migrateRailNames(data.projects, labels);
      const titles = new Map(data.projects.map((p, i) => [`${p.environmentId}:${p.id}`, labels[i]]));
      const started = (t) => Date.parse(t.latestRun?.startedAt ?? t.latestRun?.requestedAt ?? t.updatedAt) || 0;
      working = data.threads
        .filter(threadWorking)
        .sort((a, b) => started(a) - started(b))
        .map((t) => ({
          project: titles.get(`${t.environmentId}:${t.projectId}`) ?? null,
          title: t.title,
          path: `/${encodeURIComponent(t.environmentId)}/${encodeURIComponent(t.id)}`,
          snoozed: Date.parse(t.snoozedUntil ?? "") > Date.now(),
          startedAt: started(t) || null,
        }));
    } else {
      working = [...document.querySelectorAll('[data-testid^="sidebar-row-"]')]
        .filter(rowWorking)
        .map((row) => ({ project: rowProject(row), title: row.getAttribute("aria-label") ?? "", row }));
    }
    workingByProject.clear();
    for (const thread of working) {
      if (thread.project === null) continue;
      if (!workingByProject.has(thread.project)) workingByProject.set(thread.project, []);
      workingByProject.get(thread.project).push(thread);
    }
  };

  const openWorkingThread = (thread) => {
    if (thread.row?.isConnected) thread.row.click();
    else if (thread.path) navigate(thread.path);
  };

  const projectTip = (name, threads = []) => {
    if (threads.length === 0) return name;
    const snoozed = threads.filter((thread) => thread.snoozed).length;
    return `${name} · ${threads.length} working${snoozed ? ` (${snoozed} snoozed)` : ""}`;
  };

  // ---------- Project catalog ----------
  // Every T3 project (name + avatar), read from T3's "Filter threads by project" picker and
  // cached, so the rail lists all projects even when they have no thread in the list.

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const CATALOG_KEY = "codex-skin:project-catalog:v1";
  let catalog = readJSON(CATALOG_KEY, { at: 0, projects: [] });

  const projectTrigger = () => document.querySelector('[aria-label^="Filter threads by project"]');

  // The open picker's projects, or null unless it is the unfiltered project picker.
  const readPicker = () => {
    const popup = document.querySelector('[data-slot="combobox-popup"]');
    if (!popup || popup.querySelector("input")?.value.trim()) return null;
    const projects = [];
    let isProjectPicker = false;
    for (const option of popup.querySelectorAll('[role="option"]')) {
      const content = option.querySelector('[data-slot="combobox-item-content"]');
      const nameEl = content?.querySelector(".truncate");
      const name = (nameEl ?? content)?.textContent.trim();
      if (!name) continue;
      if (name === "All projects") {
        isProjectPicker = true;
        continue;
      }
      const avatar = content.firstElementChild;
      projects.push({ name, avatar: avatar && avatar !== nameEl ? avatar.outerHTML : ICONS.folder });
    }
    return isProjectPicker && projects.length > 0 ? projects : null;
  };

  const sameCatalog = (a, b) =>
    a.length === b.length && a.every((project, i) => project.name === b[i].name && project.avatar === b[i].avatar);

  // Runs on every DOM change: whenever the picker is open (opened by you or by the skin), the
  // catalog follows it.
  const captureCatalog = () => {
    const projects = readPicker();
    if (!projects) return false;
    const changed = !sameCatalog(projects, catalog.projects);
    if (changed || Date.now() - catalog.at > 60_000) {
      catalog = { at: Date.now(), projects };
      writeJSON(CATALOG_KEY, catalog);
      if (changed) schedule();
    }
    return true;
  };

  // Last keystroke anywhere: the catalog is never read while you are typing.
  let lastKeyAt = 0;
  window.addEventListener("keydown", () => (lastKeyAt = performance.now()), true);

  // Opens the picker out of sight to read it, then puts focus back where it was (usually the
  // composer). Skipped while typing or while any popup, menu or dialog is open.
  let harvesting = false;
  let lastHarvest = 0;
  const harvestCatalog = async () => {
    const trigger = projectTrigger();
    if (!trigger || harvesting || filtering || dragging || menuEl) return;
    if (performance.now() - lastKeyAt < 2500) return;
    if (document.querySelector('[data-slot$="popup"], [role="dialog"], [role="menu"]')) return;
    harvesting = true;
    lastHarvest = Date.now();
    const previous = document.activeElement;
    root.classList.add("cx-probing");
    try {
      trigger.click();
      await waitFor(captureCatalog);
      // Escape goes to the picker itself (focus may be elsewhere when the window is in the
      // background); if it stays open, the trigger toggles it shut.
      const popup = () => document.querySelector('[data-slot="combobox-popup"]');
      (popup()?.querySelector("input") ?? popup() ?? document.activeElement)?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      if (!(await waitFor(() => !popup(), 10))) {
        trigger.click();
        await waitFor(() => !popup(), 10);
      }
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) {
        previous.focus({ preventScroll: true });
      } else if (document.activeElement === trigger) {
        trigger.blur();
      }
    } finally {
      setTimeout(() => root.classList.remove("cx-probing"), 150);
      harvesting = false;
    }
  };

  // Harvest when the catalog is empty or misses a project seen in the rows; `stale` also
  // refreshes a catalog older than 10 minutes (used when the window regains focus).
  const maybeHarvest = (stale = false) => {
    if (Date.now() - lastHarvest < 30_000) return;
    const names = new Set(catalog.projects.map((project) => project.name));
    const missing =
      catalog.projects.length === 0 || [...knownProjects.keys(), ...storeProjectNames].some((name) => !names.has(name));
    if (missing || (stale && Date.now() - catalog.at > 10 * 60_000)) harvestCatalog();
  };

  // ---------- Project rail ----------
  // Pinned projects first, a divider, then the rest, in a section that scrolls on its own.
  // Drag to reorder (across the divider to pin or unpin); right-click (or Shift+F10) for a menu.

  const RAIL_KEY = "codex-skin:rail-projects:v1";
  const railState = { pinned: [], order: null, hidden: [], ...readJSON(RAIL_KEY, {}) };
  const saveRailState = () => writeJSON(RAIL_KEY, railState);

  // A project saved (pinned, ordered, hidden) under its title keeps its place once T3 shows it
  // under its merged repo name.
  function migrateRailNames(projects, labels) {
    const renames = new Map();
    projects.forEach((p, i) => {
      if (labels[i] !== p.title && !labels.includes(p.title)) renames.set(p.title, labels[i]);
    });
    if (renames.size === 0) return;
    let changed = false;
    for (const key of ["pinned", "order", "hidden"]) {
      const list = railState[key];
      if (!Array.isArray(list) || !list.some((name) => renames.has(name))) continue;
      const renamed = list.map((name) => renames.get(name) ?? name);
      railState[key] = renamed.filter((name, i) => renamed.indexOf(name) === i);
      changed = true;
    }
    if (changed) saveRailState();
  }

  const railMenu = () => document.querySelector('[data-slot="sidebar"] [data-slot="sidebar-footer"] [data-sidebar="menu"]');

  const railProjects = () => {
    const avatars = new Map(catalog.projects.map((project) => [project.name, project.avatar]));
    const names = catalog.projects.map((project) => project.name);
    for (const [name, project] of knownProjects) {
      if (!avatars.has(name)) {
        names.push(name);
        avatars.set(name, project.avatar);
      }
    }
    for (const name of storeProjectNames) {
      if (!avatars.has(name)) {
        names.push(name);
        avatars.set(name, ICONS.folder);
      }
    }
    const hidden = new Set(railState.hidden);
    const visible = new Set(names.filter((name) => !hidden.has(name)));
    const pinned = railState.pinned.filter((name) => visible.has(name));
    const rest = names.filter((name) => visible.has(name) && !pinned.includes(name));
    if (railState.order) {
      const rank = new Map(railState.order.map((name, i) => [name, i]));
      rest.sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9));
    }
    return { pinned, rest, avatars };
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // FLIP: items that move inside `container` during `mutate` glide to their new place.
  const flip = (container, mutate) => {
    if (reduceMotion.matches) return mutate();
    const els = [...container.querySelectorAll(".cx-rail-project, .cx-rail-pin-divider, .cx-rail-placeholder")];
    const before = new Map();
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) before.set(el, rect.top);
    }
    mutate();
    for (const [el, top] of before) {
      if (!container.contains(el)) continue;
      for (const animation of el.getAnimations()) animation.cancel();
      const rect = el.getBoundingClientRect();
      const dy = top - rect.top;
      if (rect.height === 0 || Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
        duration: 220,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
  };

  const avatarHtml = new WeakMap();

  // Every spinner turns in step: a spinner shown later starts at the shared phase, not at 0°.
  const SPIN_MS = 900;
  const syncSpin = (el) => el.style.setProperty("--cx-spin-delay", `${-Math.round(performance.now() % SPIN_MS)}ms`);

  const projectButton = (name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cx-rail-button cx-rail-project";
    button.dataset.project = name;
    button.innerHTML =
      '<span class="cx-rail-avatar"></span><span class="cx-rail-project-badge" hidden><span class="cx-rail-project-count"></span></span>';
    button.addEventListener("click", () => focusProject(name));
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openProjectMenu(button, name);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        event.preventDefault();
        openProjectMenu(button, name);
      }
    });
    button.addEventListener("pointerdown", (event) => dragIntent(event, button, name));
    return button;
  };

  const updateProjectButton = (button, name, html, filter) => {
    const avatar = button.querySelector(".cx-rail-avatar");
    if (avatarHtml.get(avatar) !== html) {
      avatar.innerHTML = html;
      avatarHtml.set(avatar, html);
      // T3 wraps its badge in a positioning span; keep only the icon so it sizes and centers.
      const wrapper = avatar.firstElementChild;
      if (wrapper?.matches("span.relative") && wrapper.firstElementChild) wrapper.replaceWith(wrapper.firstElementChild);
    }
    const threads = workingByProject.get(name) ?? [];
    const busy = threads.length;
    const badge = button.querySelector(".cx-rail-project-badge");
    if (badge.hidden !== (busy === 0)) {
      badge.hidden = busy === 0;
      if (busy > 0) syncSpin(badge);
    }
    setIfChanged(badge.firstChild, "textContent", busy > 9 ? "9+" : String(busy));
    setAttrIfChanged(button, "data-working", busy > 0 ? "true" : null);
    const tip = projectTip(name, threads);
    setAttrIfChanged(button, "data-tip", tip);
    setAttrIfChanged(button, "aria-label", tip);
    setAttrIfChanged(button, "data-active", filter === name ? "true" : null);
  };

  const projectSection = (menu) =>
    ensureItem(menu, "projects", () => {
      const li = document.createElement("li");
      li.className = "cx-rail-projects";
      li.dataset.cxRail = "projects";
      li.style.order = "22";
      li.innerHTML =
        '<div class="cx-rail-scroll"><div class="cx-rail-group" data-group="pinned"></div><div class="cx-rail-pin-divider" aria-hidden="true"></div><div class="cx-rail-group" data-group="rest"></div></div>';
      const scroll = li.firstElementChild;
      scroll.addEventListener(
        "scroll",
        () => {
          hideTip();
          updateFades(scroll);
        },
        { passive: true },
      );
      return li;
    });

  // Soft edges on the scrolling section, only on the sides that have more to show.
  const updateFades = (scroll) => {
    const top = scroll.scrollTop > 1;
    const bottom = scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1;
    setAttrIfChanged(scroll, "data-fade", top && bottom ? "both" : top ? "top" : bottom ? "bottom" : null);
  };

  const fillGroup = (section, group, names, avatars, filter) => {
    let previous = null;
    for (const name of names) {
      const button = section.querySelector(`[data-project="${CSS.escape(name)}"]`) ?? projectButton(name);
      const slot = previous ? previous.nextElementSibling : group.firstElementChild;
      if (slot !== button) group.insertBefore(button, slot);
      updateProjectButton(button, name, avatars.get(name) ?? ICONS.folder, filter);
      previous = button;
    }
  };

  // Returns the number of projects shown, or null while a drag owns the section.
  const renderProjects = (menu, animate = false) => {
    if (dragging) return null;
    const section = projectSection(menu);
    const scroll = section.firstElementChild;
    const [pinnedGroup, , restGroup] = scroll.children;
    const { pinned, rest, avatars } = railProjects();
    const filter = currentProjectFilter();
    const apply = () => {
      fillGroup(section, pinnedGroup, pinned, avatars, filter);
      fillGroup(section, restGroup, rest, avatars, filter);
      const wanted = new Set([...pinned, ...rest]);
      for (const button of section.querySelectorAll(".cx-rail-project")) {
        if (!wanted.has(button.dataset.project)) button.remove();
      }
      setAttrIfChanged(section, "data-split", pinned.length > 0 && rest.length > 0 ? "true" : null);
    };
    if (animate) flip(section, apply);
    else apply();
    section.hidden = pinned.length + rest.length === 0;
    updateFades(scroll);
    return pinned.length + rest.length;
  };

  const ensureProjects = (menu) => {
    refreshKnownProjects();
    const total = renderProjects(menu);
    if (total === null) return;
    const filter = currentProjectFilter();

    const sep = ensureItem(menu, "separator", () => {
      const li = document.createElement("li");
      li.className = "cx-rail-separator";
      li.dataset.cxRail = "separator";
      li.style.order = "20";
      return li;
    });
    sep.hidden = total === 0;

    const all = ensureItem(menu, "all-projects", () => {
      const li = railItem("all-projects", "All projects", 21);
      li.firstChild.innerHTML = ICONS.allProjects;
      li.firstChild.addEventListener("click", () => selectProjectFilter("All projects"));
      li.firstChild.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openAllProjectsMenu(li.firstChild);
      });
      return li;
    });
    all.hidden = total < 2 && railState.hidden.length === 0;
    setAttrIfChanged(all.firstChild, "data-active", filter === null ? "true" : null);

    // Items from the previous one-li-per-project rail.
    for (const li of menu.querySelectorAll(':scope > [data-cx-rail^="project:"]')) li.remove();
  };

  // State changes from the menu animate into place.
  const updateRail = (change) => {
    const { pinned, rest } = railProjects();
    change(pinned, rest);
    saveRailState();
    const menu = railMenu();
    if (menu) renderProjects(menu, true);
  };

  const setPinned = (name, pin) =>
    updateRail((pinned, rest) => {
      if (pin) {
        railState.pinned = [...pinned, name];
        railState.order = rest.filter((other) => other !== name);
      } else {
        railState.pinned = pinned.filter((other) => other !== name);
        railState.order = [name, ...rest];
      }
    });

  const moveProject = (name, step) =>
    updateRail((pinned, rest) => {
      const list = pinned.includes(name) ? pinned : rest;
      const from = list.indexOf(name);
      const to = from + step;
      if (to < 0 || to >= list.length) return;
      [list[from], list[to]] = [list[to], list[from]];
      railState.pinned = pinned;
      railState.order = rest;
    });

  const hideProject = (name) =>
    updateRail((pinned, rest) => {
      railState.hidden = [...new Set([...railState.hidden, name])];
      railState.pinned = pinned.filter((other) => other !== name);
      railState.order = rest.filter((other) => other !== name);
    });

  const showProject = (name) =>
    updateRail(() => {
      railState.hidden = railState.hidden.filter((other) => other !== name);
    });

  // Project settings live behind the gear on each row of T3's project picker.
  const openProjectSettings = async (name) => {
    const trigger = projectTrigger();
    if (!trigger) return;
    root.classList.add("cx-probing");
    try {
      trigger.click();
      const gear = await waitFor(() =>
        [...document.querySelectorAll('[data-slot="combobox-popup"] button[title]')].find(
          (button) => button.getAttribute("title") === `Project settings for ${name}`,
        ),
      );
      if (gear) gear.click();
      else document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } finally {
      setTimeout(() => root.classList.remove("cx-probing"), 150);
    }
  };

  // ---------- Rail menu (right-click) ----------

  let menuEl = null;
  let menuAnchor = null;

  const onMenuOutside = (event) => {
    if (!menuEl || menuEl.contains(event.target)) return;
    // The working badge toggles its own popover on click.
    if (menuEl.classList.contains("cx-working-menu") && menuAnchor?.contains(event.target)) return;
    closeMenu();
  };
  const onMenuDismiss = () => closeMenu();

  const closeMenu = (restoreFocus = false) => {
    if (!menuEl) return;
    const menu = menuEl;
    menuEl = null;
    menu.classList.remove("is-open");
    setTimeout(() => menu.remove(), 140);
    document.removeEventListener("pointerdown", onMenuOutside, true);
    window.removeEventListener("blur", onMenuDismiss);
    window.removeEventListener("resize", onMenuDismiss);
    menuAnchor?.removeAttribute("aria-expanded");
    if (restoreFocus) menuAnchor?.focus({ preventScroll: true });
    menuAnchor = null;
  };

  // entries: { label, icon, action, disabled } or "separator".
  const openMenu = (anchor, title, entries, variant = "") => {
    closeMenu();
    hideTip();
    const menu = document.createElement("div");
    menu.className = `cx-menu ${variant}`.trim();
    menu.setAttribute("role", "menu");
    if (title) {
      const heading = document.createElement("div");
      heading.className = "cx-menu-title";
      heading.textContent = title;
      menu.setAttribute("aria-label", title);
      menu.append(heading);
    }
    for (const entry of entries) {
      if (entry === "separator") {
        const separator = document.createElement("div");
        separator.className = "cx-menu-separator";
        separator.setAttribute("role", "separator");
        menu.append(separator);
        continue;
      }
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cx-menu-item";
      item.setAttribute("role", "menuitem");
      item.disabled = Boolean(entry.disabled);
      if (entry.render) entry.render(item);
      else {
        item.innerHTML = `${entry.icon ?? ""}<span></span>`;
        item.lastChild.textContent = entry.label;
      }
      item.addEventListener("click", () => {
        closeMenu(true);
        entry.action?.();
      });
      menu.append(item);
    }
    menu.addEventListener("keydown", (event) => {
      const items = [...menu.querySelectorAll(".cx-menu-item:not(:disabled)")];
      const index = items.indexOf(document.activeElement);
      const go = (i) => {
        event.preventDefault();
        items[(i + items.length) % items.length]?.focus();
      };
      if (event.key === "ArrowDown") go(index + 1);
      else if (event.key === "ArrowUp") go(index < 0 ? -1 : index - 1);
      else if (event.key === "Home") go(0);
      else if (event.key === "End") go(-1);
      else if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      }
    });
    document.body.append(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.round(rect.right + 10)}px`;
    menu.style.top = `${Math.round(Math.max(8, Math.min(rect.top - 6, innerHeight - menu.offsetHeight - 8)))}px`;
    menuEl = menu;
    menuAnchor = anchor;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    menu.querySelector(".cx-menu-item:not(:disabled)")?.focus({ preventScroll: true });
    document.addEventListener("pointerdown", onMenuOutside, true);
    window.addEventListener("blur", onMenuDismiss);
    window.addEventListener("resize", onMenuDismiss);
  };

  const openProjectMenu = (button, name) => {
    const { pinned, rest } = railProjects();
    const isPinned = pinned.includes(name);
    const group = isPinned ? pinned : rest;
    const index = group.indexOf(name);
    openMenu(button, name, [
      { label: isPinned ? "Unpin" : "Pin to top", icon: isPinned ? ICONS.unpin : ICONS.pin, action: () => setPinned(name, !isPinned) },
      { label: "Move up", icon: ICONS.up, disabled: index <= 0, action: () => moveProject(name, -1) },
      { label: "Move down", icon: ICONS.down, disabled: index < 0 || index === group.length - 1, action: () => moveProject(name, 1) },
      "separator",
      { label: "New thread", icon: ICONS.newThread, action: () => newThreadIn(name) },
      { label: "Project settings…", icon: ICONS.settings, action: () => openProjectSettings(name) },
      "separator",
      { label: "Hide from rail", icon: ICONS.hide, action: () => hideProject(name) },
    ]);
  };

  const openAllProjectsMenu = (button) => {
    const hidden = railState.hidden;
    openMenu(button, hidden.length ? "Hidden projects" : "Projects", [
      ...(hidden.length
        ? hidden.map((name) => ({ label: `Show ${name}`, icon: ICONS.show, action: () => showProject(name) }))
        : [{ label: "No hidden projects", icon: ICONS.show, disabled: true }]),
      "separator",
      {
        label: "Unpin all",
        icon: ICONS.unpin,
        disabled: railState.pinned.length === 0,
        action: () =>
          updateRail((pinned, rest) => {
            railState.pinned = [];
            railState.order = [...pinned, ...rest];
          }),
      },
      {
        label: "Reset order",
        icon: ICONS.reset,
        disabled: !railState.order,
        action: () =>
          updateRail(() => {
            railState.order = null;
          }),
      },
    ]);
  };

  // ---------- Drag to reorder ----------

  let dragging = null;

  const dragIntent = (event, button, name) => {
    if (event.button !== 0 || dragging) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
      stop();
      beginDrag(e, button, name);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const beginDrag = (event, button, name) => {
    const section = button.closest(".cx-rail-projects");
    if (!section) return;
    hideTip();
    closeMenu();
    const scroll = section.firstElementChild;
    const rect = button.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.className = "cx-rail-placeholder";
    for (const animation of button.getAnimations()) animation.cancel();
    button.replaceWith(placeholder);
    button.style.left = `${rect.left}px`;
    button.style.top = `${rect.top}px`;
    button.classList.add("is-lifted");
    document.body.append(button);
    root.classList.add("cx-rail-dragging");
    dragging = {
      name,
      button,
      placeholder,
      section,
      scroll,
      grabY: event.clientY - rect.top,
      y: event.clientY,
      origin: [placeholder.parentElement, placeholder.nextElementSibling],
      frame: 0,
    };
    // The divider shows while dragging, even with nothing pinned yet: drop above it to pin.
    flip(section, () => {
      section.dataset.dragging = "true";
    });

    const onMove = (e) => {
      dragging.y = e.clientY;
      button.style.top = `${e.clientY - dragging.grabY}px`;
      placeDrag();
    };
    const onUp = () => endDrag(true);
    const onCancel = () => endDrag(false);
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      endDrag(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    const tick = () => {
      if (!dragging || dragging.button !== button) return;
      autoScroll();
      dragging.frame = requestAnimationFrame(tick);
    };
    dragging.frame = requestAnimationFrame(tick);
    dragging.cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(dragging.frame);
    };
    placeDrag();
  };

  // Moves the placeholder to the slot under the pointer. Layout positions (offsetTop) ignore
  // the in-flight FLIP transforms, so the target never jitters while items glide.
  const placeDrag = () => {
    const d = dragging;
    if (!d || d.settling) return;
    const [pinnedGroup, divider, restGroup] = d.scroll.children;
    const y = d.y - d.scroll.getBoundingClientRect().top + d.scroll.scrollTop;
    const items = [...pinnedGroup.children, divider, ...restGroup.children].filter((el) => el !== d.placeholder);
    const target = items.find((el) => y < el.offsetTop + el.offsetHeight / 2) ?? null;
    let parent = restGroup;
    let before = null;
    if (target === divider) parent = pinnedGroup;
    else if (target) {
      parent = target.parentElement;
      before = target;
    }
    if (d.placeholder.parentElement === parent && d.placeholder.nextElementSibling === before) return;
    flip(d.section, () => {
      parent.insertBefore(d.placeholder, before);
      setAttrIfChanged(d.section, "data-drop", parent === pinnedGroup ? "pinned" : null);
    });
  };

  // Scrolls the section while the pointer rests near (or past) its top or bottom edge.
  const autoScroll = () => {
    const d = dragging;
    if (!d || d.settling) return;
    const rect = d.scroll.getBoundingClientRect();
    const edge = 36;
    let delta = 0;
    if (d.y < rect.top + edge) delta = -Math.min(14, Math.ceil((rect.top + edge - d.y) / 3));
    else if (d.y > rect.bottom - edge) delta = Math.min(14, Math.ceil((d.y - rect.bottom + edge) / 3));
    if (!delta) return;
    const before = d.scroll.scrollTop;
    d.scroll.scrollTop += delta;
    if (d.scroll.scrollTop !== before) placeDrag();
  };

  // The click that ends a drag must not also open the project.
  const swallowClick = () => {
    const swallow = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, true), 250);
  };

  const endDrag = (commit) => {
    const d = dragging;
    if (!d || d.settling) return;
    d.settling = true;
    d.cleanup();
    swallowClick();
    if (!commit) {
      const [parent, next] = d.origin;
      flip(d.section, () => parent.insertBefore(d.placeholder, next?.parentElement === parent ? next : null));
    }
    const settle = () => {
      d.placeholder.replaceWith(d.button);
      d.button.classList.remove("is-lifted");
      d.button.style.left = d.button.style.top = "";
      root.classList.remove("cx-rail-dragging");
      flip(d.section, () => {
        delete d.section.dataset.dragging;
        delete d.section.dataset.drop;
      });
      dragging = null;
      if (commit) {
        const [pinnedGroup, , restGroup] = d.scroll.children;
        const names = (group) => [...group.querySelectorAll(".cx-rail-project")].map((button) => button.dataset.project);
        railState.pinned = names(pinnedGroup);
        railState.order = names(restGroup);
        saveRailState();
      }
      schedule();
    };
    if (reduceMotion.matches) return settle();
    const from = d.button.getBoundingClientRect();
    const to = d.placeholder.getBoundingClientRect();
    const fromScale = from.width / to.width || 1;
    d.button.style.transform = "none";
    const landing = d.button.animate(
      [
        { transform: `translate(0, 0) scale(${fromScale})` },
        { transform: `translate(${to.left - from.left + (from.width - to.width) / 2}px, ${to.top - from.top + (from.height - to.height) / 2}px) scale(1)` },
      ],
      { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    const done = () => {
      d.button.style.transform = "";
      settle();
    };
    landing.onfinish = done;
    landing.oncancel = done;
  };

  // ---------- Rail tooltips ----------
  // One floating tooltip for every injected rail button (the project section scrolls, which
  // would clip CSS tooltips). Shows after a short delay, then instantly while moving along the rail.
  const tip = document.createElement("div");
  tip.className = "cx-tip";
  tip.setAttribute("role", "tooltip");
  let tipTimer = 0;
  let tipFor = null;
  let tipHiddenAt = 0;

  const hideTip = () => {
    clearTimeout(tipTimer);
    if (tip.classList.contains("is-visible")) tipHiddenAt = performance.now();
    tipFor = null;
    tip.classList.remove("is-visible");
  };

  const showTip = (button) => {
    if (!button.isConnected || !button.dataset.tip) return;
    tip.textContent = button.dataset.tip;
    if (!tip.isConnected) document.body.append(tip);
    const rect = button.getBoundingClientRect();
    tip.style.left = `${Math.round(rect.right + 10)}px`;
    tip.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
    tip.classList.add("is-visible");
  };

  document.addEventListener("pointerover", (event) => {
    const button = event.target instanceof Element ? event.target.closest(".cx-rail-button[data-tip]") : null;
    if (button === tipFor) return;
    const warm = tip.classList.contains("is-visible") || performance.now() - tipHiddenAt < 400;
    hideTip();
    if (!button || dragging || menuEl || !root.classList.contains("codex-skin")) return;
    tipFor = button;
    tipTimer = setTimeout(() => showTip(button), warm ? 0 : 450);
  });
  document.addEventListener("pointerdown", hideTip, true);
  window.addEventListener("blur", hideTip);

  // "4m", "1h 12m": how long a thread has been working.
  const elapsed = (since) => {
    if (!since) return "";
    const minutes = Math.max(0, Math.floor((Date.now() - since) / 60_000));
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  };

  const isCurrentThread = (thread) =>
    thread.row ? thread.row.getAttribute("aria-current") === "page" : decodeURI(location.pathname) === decodeURI(thread.path ?? "");

  // Popover listing every working thread: project icon, title, project and time running.
  const openWorkingMenu = (anchor) => {
    const { avatars } = railProjects();
    const entries = working.map((thread) => ({
      action: () => openWorkingThread(thread),
      render: (item) => {
        item.classList.add("cx-working-item");
        if (isCurrentThread(thread)) item.setAttribute("aria-current", "true");
        item.innerHTML =
          '<span class="cx-working-avatar"></span><span class="cx-working-text"><span class="cx-working-title"></span><span class="cx-working-meta"><span class="cx-working-project"></span><span class="cx-working-time"></span></span></span><span class="cx-working-spinner" aria-hidden="true"></span>';
        const avatar = item.querySelector(".cx-working-avatar");
        avatar.innerHTML = (thread.project && avatars.get(thread.project)) ?? ICONS.folder;
        const wrapper = avatar.firstElementChild;
        if (wrapper?.matches("span.relative") && wrapper.firstElementChild) wrapper.replaceWith(wrapper.firstElementChild);
        item.querySelector(".cx-working-title").textContent = thread.title || "Untitled thread";
        item.querySelector(".cx-working-project").textContent =
          (thread.project ?? "") + (thread.snoozed ? (thread.project ? " · snoozed" : "Snoozed") : "");
        const time = item.querySelector(".cx-working-time");
        time.dataset.since = thread.startedAt ?? "";
        time.textContent = elapsed(thread.startedAt);
        item.setAttribute("aria-label", `${thread.title}, ${thread.project ?? "no project"}, working ${time.textContent}`);
        syncSpin(item);
      },
    }));
    const n = working.length;
    openMenu(anchor, n === 1 ? "1 thread working" : `${n} threads working`, entries, "cx-working-menu");
    anchor.setAttribute("aria-expanded", "true");
  };

  const updateWorkingMenuTimes = () => {
    if (!menuEl?.classList.contains("cx-working-menu")) return;
    for (const time of menuEl.querySelectorAll(".cx-working-time[data-since]")) {
      setIfChanged(time, "textContent", elapsed(Number(time.dataset.since) || null));
    }
  };

  // Live working badge: spinner + count of threads currently working; clicking lists them in
  // a popover. Sits at the bottom of the rail, above the update button and Settings.
  const ensureWorkingBadge = (menu) => {
    const li = ensureItem(menu, "working", () => {
      const el = railItem("working", "Working threads", 96);
      el.firstChild.classList.add("cx-rail-working");
      el.firstChild.innerHTML = '<span class="cx-rail-spinner"></span><span class="cx-rail-count"></span>';
      el.firstChild.addEventListener("click", () => {
        if (menuEl?.classList.contains("cx-working-menu")) return closeMenu(true);
        openWorkingMenu(el.firstChild);
      });
      return el;
    });
    const count = working.length;
    if (li.hidden !== (count === 0)) {
      li.hidden = count === 0;
      if (count > 0) syncSpin(li.firstChild);
    }
    if (count === 0 && menuEl?.classList.contains("cx-working-menu")) closeMenu();
    updateWorkingMenuTimes();
    setIfChanged(li.querySelector(".cx-rail-count"), "textContent", count > 9 ? "9+" : String(count));
    const label = count === 1 ? "1 thread working" : `${count} threads working`;
    setAttrIfChanged(li.firstChild, "data-tip", label);
    setAttrIfChanged(li.firstChild, "aria-label", label);
  };

  // T3's optional Working shelf (collapsed at the bottom of the list) gets the same spinner.
  const ensureWorkingShelf = () => {
    const toggle = document.querySelector('[data-testid="sidebar-working-shelf-toggle"]');
    if (!toggle) return;
    const count = Number(toggle.querySelector(".tabular-nums")?.textContent ?? 0);
    setAttrIfChanged(toggle, "data-cx-working", count > 0 ? "true" : null);
  };

  const ensureRail = () => {
    captureCatalog();
    const menu = railMenu();
    if (!menu) return;
    ensureItem(menu, "spacer", () => {
      const li = document.createElement("li");
      li.className = "cx-rail-spacer";
      li.dataset.cxRail = "spacer";
      li.style.order = "50";
      return li;
    });
    ensureRouteItems(menu);
    refreshWorking();
    ensureProjects(menu);
    ensureWorkingBadge(menu);
    ensureWorkingShelf();
    rememberFocusedThread();
    maybeHarvest();
  };

  // Page-change animation: flag the root for one animation cycle whenever the path changes.
  // Promoting a draft to a thread (first send) replaces the URL; that one stays still.
  let lastPath = location.pathname;
  let routeTimer = 0;
  const onRoute = (replaced) => {
    const path = location.pathname;
    if (path === lastPath) return;
    const fromDraft = lastPath.startsWith("/draft/");
    lastPath = path;
    schedule();
    if (replaced && fromDraft) return;
    requestAnimationFrame(() => {
      // Restart the animation even when navigating again mid-animation.
      root.classList.remove("cx-route-enter");
      void root.offsetWidth;
      root.classList.add("cx-route-enter");
      clearTimeout(routeTimer);
      routeTimer = setTimeout(() => root.classList.remove("cx-route-enter"), 450);
    });
  };
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(() => onRoute(method === "replaceState"));
      return result;
    };
  }
  window.addEventListener("popstate", () => onRoute(false));

  // The sidebar slide animation is paused while its resize handle is dragged.
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.target.closest?.('[aria-label="Resize Sidebar"]')) return;
      root.classList.add("cx-resizing");
      const stop = () => root.classList.remove("cx-resizing");
      window.addEventListener("pointerup", stop, { once: true });
      window.addEventListener("pointercancel", stop, { once: true });
    },
    true,
  );

  // ---------- Inline HTML renders ----------
  // T3 hands each html_render frame its own palette (URL fragment before first paint, then a
  // host-context-changed message on load and theme change). The frame replaces its whole
  // :root rule with whatever it receives, so the skin swaps in a complete Codex palette.
  const THEME_FRAGMENT = "#t3-theme=";
  const THEME_METHOD = "ui/notifications/host-context-changed";
  const FRAME_CHARTS = {
    light: ["#86d3f5", "#7fdcb7", "#fdba8c", "#f5a9cf", "#f7d77a"],
    dark: ["#8fd8fb", "#86e5c0", "#fdc29a", "#f9b4d6", "#fbe08f"],
  };
  const FRAME_INFO = { light: "#1e66f5", dark: "#89b4fa" };
  const themedFrames = new Set();
  const originalThemes = {};

  const frameTheme = () => {
    const style = getComputedStyle(root);
    const read = (name) => style.getPropertyValue(name).trim();
    const appearance = root.classList.contains("dark") ? "dark" : "light";
    const accent = read("--cx-accent");
    const tone = (color) => [color, color, `color-mix(in srgb, ${color} 12%, transparent)`];
    const [destructive, destructiveForeground, destructiveSurface] = tone(read("--cx-danger"));
    const [warning, warningForeground, warningSurface] = tone(read("--cx-warning"));
    const variables = {
      "--background": read("--background"),
      "--foreground": read("--foreground"),
      "--muted": read("--muted"),
      "--muted-foreground": read("--muted-foreground"),
      "--card": read("--card"),
      "--card-foreground": read("--card-foreground"),
      "--popover": read("--popover"),
      "--popover-foreground": read("--popover-foreground"),
      "--secondary": read("--secondary"),
      "--secondary-foreground": read("--secondary-foreground"),
      "--border": read("--cx-border-heavy"),
      "--input": read("--input"),
      "--ring": accent,
      "--primary": read("--primary"),
      "--primary-foreground": read("--primary-foreground"),
      "--accent": accent,
      "--accent-foreground": read("--cx-ink-inverse"),
      "--accent-surface": `color-mix(in srgb, ${accent} 12%, transparent)`,
      "--accent-surface-foreground": accent,
      "--destructive": destructive,
      "--destructive-foreground": destructiveForeground,
      "--destructive-surface": destructiveSurface,
      "--warning": warning,
      "--warning-foreground": warningForeground,
      "--warning-surface": warningSurface,
      "--success": read("--cx-success"),
      "--success-foreground": read("--cx-success"),
      "--info": FRAME_INFO[appearance],
      "--info-foreground": FRAME_INFO[appearance],
      "--code-background": read("--code-background"),
      "--code-foreground": read("--foreground"),
      "--chart-1": appearance === "dark" ? "#c4b5fd" : "#b4a3fb",
      ...Object.fromEntries(FRAME_CHARTS[appearance].map((color, i) => [`--chart-${i + 2}`, color])),
      "--radius": read("--radius"),
      "--font-sans": read("--cx-font"),
    };
    for (const name in variables) if (!variables[name]) delete variables[name];
    return { appearance, variables };
  };

  const skinFrameSrc = (src) => {
    const at = src.indexOf(THEME_FRAGMENT);
    if (at === -1) return src;
    try {
      const theme = JSON.parse(decodeURIComponent(src.slice(at + THEME_FRAGMENT.length)));
      originalThemes[theme.appearance] = theme;
      if (!root.classList.contains("codex-skin")) return src;
      const skin = frameTheme();
      const variables = { ...theme.variables, ...skin.variables };
      return `${src.slice(0, at)}${THEME_FRAGMENT}${encodeURIComponent(JSON.stringify({ ...theme, variables }))}`;
    } catch {
      return src;
    }
  };

  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (this instanceof HTMLIFrameElement && name === "src" && typeof value === "string" && value.includes(THEME_FRAGMENT)) {
      themedFrames.add(this);
      value = skinFrameSrc(value);
    }
    return setAttribute.call(this, name, value);
  };

  // Posted after T3's own message (load and theme effects run first), so the skin palette wins.
  const repaintFrames = () =>
    setTimeout(() => {
      const theme = root.classList.contains("codex-skin") ? frameTheme() : originalThemes[root.classList.contains("dark") ? "dark" : "light"];
      if (!theme) return;
      const message = { jsonrpc: "2.0", method: THEME_METHOD, params: { theme: theme.appearance, styles: { variables: theme.variables } } };
      for (const frame of themedFrames) {
        if (!frame.isConnected) themedFrames.delete(frame);
        else frame.contentWindow?.postMessage(message, "*");
      }
    }, 60);

  document.addEventListener("load", (event) => event.target instanceof HTMLIFrameElement && themedFrames.has(event.target) && repaintFrames(), true);
  // T3 caps each frame at the height stored with the render (and at 2000px). Size the frame
  // box from the frame's own size reports instead, so renders never scroll inside the chat.
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.jsonrpc !== "2.0" || data.method !== "ui/notifications/size-changed") return;
    const height = data.params?.height;
    if (typeof height !== "number" || !(height > 0)) return;
    for (const frame of themedFrames) {
      if (frame.contentWindow !== event.source) continue;
      const box = frame.parentElement;
      if (!box?.classList.contains("group/html-render")) return;
      box.style.setProperty("--cx-frame-height", `${Math.ceil(height)}px`);
      box.dataset.cxFrameHeight = "";
      addExpandButton(box);
      return;
    }
  });

  // ---------- Full-screen viewer ----------
  // Images, charts and whole renders open in an overlay over the T3 window. Frames ask for it
  // through the visual kit (cx/lightbox, cx/expand, cx/escape); every render box also gets an
  // expand button, and chat images open on click.
  const viewers = [];
  const closeViewer = () => {
    const viewer = viewers.pop();
    if (!viewer) return;
    viewer.classList.remove("is-open");
    setTimeout(() => viewer.remove(), 180);
  };
  const openViewer = (content) => {
    const viewer = document.createElement("div");
    viewer.className = "cx-viewer";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "cx-viewer-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "✕";
    viewer.append(content, close);
    viewer.addEventListener("click", (event) => {
      if (event.target instanceof HTMLImageElement) event.target.classList.toggle("is-actual");
      else if (event.target === viewer || event.target === close) closeViewer();
    });
    document.body.append(viewer);
    viewers.push(viewer);
    requestAnimationFrame(() => viewer.classList.add("is-open"));
  };
  const openImage = (src, alt) => {
    const img = document.createElement("img");
    img.className = "cx-viewer-image";
    img.src = src;
    img.alt = alt || "";
    openViewer(img);
  };
  const openRender = (frame) => {
    const src = frame.getAttribute("src");
    if (!src) return;
    const panel = document.createElement("div");
    panel.className = "cx-viewer-panel";
    const copy = document.createElement("iframe");
    for (const name of ["sandbox", "allow", "referrerpolicy", "title"]) {
      const value = frame.getAttribute(name);
      if (value !== null) copy.setAttribute(name, value);
    }
    copy.setAttribute("src", src);
    panel.append(copy);
    openViewer(panel);
  };

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.jsonrpc !== "2.0" || typeof data.method !== "string" || !data.method.startsWith("cx/")) return;
    let frame = null;
    for (const candidate of themedFrames) if (candidate.contentWindow === event.source) frame = candidate;
    if (!frame) return;
    if (data.method === "cx/escape") closeViewer();
    else if (data.method === "cx/expand") openRender(frame);
    else if (data.method === "cx/lightbox") {
      const src = data.params?.src;
      if (typeof src === "string" && /^(data:image\/|https?:)/.test(src)) openImage(src, data.params.alt);
    }
  });
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !viewers.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeViewer();
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const expand = target.closest(".cx-expand");
      if (expand) {
        const frame = expand.parentElement?.querySelector("iframe");
        if (frame) openRender(frame);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (target instanceof HTMLImageElement && target.closest("[data-timeline-row-kind]") && !target.closest("a, button, .cx-viewer")) {
        event.preventDefault();
        event.stopPropagation();
        openImage(target.currentSrc || target.src, target.alt);
      }
    },
    true,
  );
  const addExpandButton = (box) => {
    if (box.querySelector(":scope > .cx-expand")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cx-expand";
    button.title = "Open full screen";
    button.setAttribute("aria-label", "Open full screen");
    button.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9"/></svg>';
    box.append(button);
  };

  // The root class also carries route/resize flags; repaint only when skin or appearance flips.
  const frameThemeKey = () => `${root.classList.contains("codex-skin")}:${root.classList.contains("dark")}`;
  let lastFrameThemeKey = frameThemeKey();
  new MutationObserver(() => {
    const key = frameThemeKey();
    if (key === lastFrameThemeKey) return;
    lastFrameThemeKey = key;
    repaintFrames();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  // Coalesce mutation bursts (streaming messages) into one check per frame.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureNewChatRow();
      ensureRail();
    });
  };

  const start = () => {
    ensureNewChatRow();
    ensureRail();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    // Threads in a filtered-out project start and stop without touching the DOM; poll the stores.
    setInterval(() => {
      if (!document.hidden) schedule();
    }, 2000);
    // Refresh the project catalog once the app has settled, and when the window comes back.
    setTimeout(() => maybeHarvest(true), 2500);
    window.addEventListener("focus", () => setTimeout(() => maybeHarvest(true), 600));
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
