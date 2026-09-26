let tasks = JSON.parse(localStorage.getItem("everythingTasks") || "[]");
let currentAppMode = "everything";
let currentView = "all";
let currentCategory = null;

const todayStr = new Date().toLocaleDateString('en-CA');

// Initialize history arrays if missing, and reset daily recurring tasks if it's a new day
let tasksChanged = false;
tasks.forEach(t => {
  if (!t.history) {
    t.history = [];
    if (t.lastCompletedDate) {
      t.history.push(t.lastCompletedDate);
    }
    tasksChanged = true;
  }

  if (t.repeat === 'daily') {
    // If completed on a past day but not today, reset checkbox
    if (t.completed && !t.history.includes(todayStr)) {
      t.completed = false;
      tasksChanged = true;
    }
  }
});
if (tasksChanged) {
  localStorage.setItem("everythingTasks", JSON.stringify(tasks));
}

// Notification logic
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

function checkReminders() {
  if (Notification.permission !== "granted") return;
  const now = new Date();
  const nowStr = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  tasks.forEach(t => {
    if (!t.completed && t.date && t.time) {
      const taskTimeStr = `${t.date}T${t.time}`;
      if (taskTimeStr === nowStr && !t.notified) {
        new Notification("Reminder: " + t.title, {
          body: t.notes || "It's time!",
          icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>"
        });
        t.notified = true;
        save();
      }
    }
  });
}
setInterval(checkReminders, 60000); // Check every minute

// Theme Toggle logic
const themeToggle = document.getElementById("themeToggle");
const lightIcon = themeToggle.querySelector(".light-icon");
const darkIcon = themeToggle.querySelector(".dark-icon");

function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    lightIcon.style.display = "none";
    darkIcon.style.display = "inline";
  } else {
    document.documentElement.removeAttribute("data-theme");
    lightIcon.style.display = "inline";
    darkIcon.style.display = "none";
  }
  localStorage.setItem("theme", theme);
}

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  setTheme(savedTheme);
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  setTheme("dark");
}

const icons = {
  Goal: "🎯", Task: "📌", Watch: "🎬", YouTube: "▶️",
  Learn: "📚", Buy: "🛒", Habit: "🌱", Idea: "💡"
};

const titles = {
  all: ["Everything", "Capture anything you don't want to forget."],
  today: ["Today", "Things you want to deal with today."],
  upcoming: ["Upcoming", "Tasks with a date coming up."],
  someday: ["Someday", "Ideas and things you want to do later."],
  completed: ["Completed", "Things you've already finished."]
};

window.switchMode = function(mode) {
  currentAppMode = mode;
  
  document.getElementById('btnModeEverything').classList.toggle('active', mode === 'everything');
  document.getElementById('btnModeRoutines').classList.toggle('active', mode === 'routines');
  
  const nav = document.querySelector('nav');
  const sidebarCategories = document.getElementById('sidebarCategories');
  
  if (mode === 'everything') {
    nav.style.display = '';
    sidebarCategories.style.display = '';
    currentView = 'all';
    setActive(document.querySelector('[data-view="all"]'));
  } else {
    nav.style.display = 'none';
    sidebarCategories.style.display = 'none';
  }
  
  currentCategory = null;
  render();
  
  if (window.innerWidth <= 860) toggleSidebar();
};

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    currentCategory = null;
    setActive(btn);
    render();
    if (window.innerWidth <= 860) toggleSidebar();
  });
});

document.querySelectorAll(".category-item").forEach(btn => {
  btn.addEventListener("click", () => {
    currentCategory = btn.dataset.category;
    currentView = "all";
    setActive(null);
    render();
    if (window.innerWidth <= 860) toggleSidebar();
  });
});

function setActive(button) {
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  if (button) button.classList.add("active");
}

function save() {
  localStorage.setItem("everythingTasks", JSON.stringify(tasks));
}

function openModal() {
  document.getElementById("modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("title").focus(), 100);
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("taskForm").reset();
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
}

document.getElementById("taskForm").addEventListener("submit", e => {
  e.preventDefault();

  tasks.unshift({
    id: Date.now(),
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value,
    priority: document.getElementById("priority").value,
    repeat: document.getElementById("repeat").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    link: document.getElementById("link").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    completed: false,
    history: [],
    created: new Date().toISOString()
  });

  // Automatically navigate to routines if a daily routine is added
  if (document.getElementById("repeat").value === "daily") {
    window.switchMode("routines");
  }

  save();
  closeModal();
  render();
});

function isToday(date) {
  if (!date) return false;
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isUpcoming(date) {
  if (!date) return false;
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d > now;
}

function getFilteredTasks() {
  const search = document.getElementById("search").value.toLowerCase().trim();

  return tasks.filter(t => {
    // Filter by view
    if (currentAppMode === "routines") {
      if (t.repeat !== "daily") return false;
    } else {
      if (t.repeat === "daily") return false;
      if (currentCategory && t.category !== currentCategory) return false;

      if (currentView === "today" && (!isToday(t.date) || t.completed)) return false;
      if (currentView === "upcoming" && (!isUpcoming(t.date) || t.completed)) return false;
      if (currentView === "someday" && (t.date || t.completed)) return false;
      if (currentView === "completed" && !t.completed) return false;
    }

    if (search) {
      const text = `${t.title} ${t.category} ${t.notes}`.toLowerCase();
      if (!text.includes(search)) return false;
    }

    return true;
  });
}

function formatDate(date, time) {
  if (!date) return "Someday";
  const d = new Date(date + "T00:00:00");
  let result = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (time) result += ` · ${time}`;
  return result;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

window.toggleTask = function (id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const dStr = new Date().toLocaleDateString('en-CA');

  if (!task.completed) {
    task.completed = true;
    if (task.repeat === 'daily') {
      if (!task.history.includes(dStr)) task.history.push(dStr);
    }
  } else {
    task.completed = false;
    if (task.repeat === 'daily') {
      task.history = task.history.filter(d => d !== dStr);
    }
  }

  save();
  render();
};

window.deleteTask = function (id) {
  if (!confirm("Delete this item?")) return;
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
};

function generateTaskHeatmap(task) {
  let html = '<div class="task-heatmap-wrapper" style="margin-top: 16px; overflow-x: auto; display: flex; gap: 4px; padding-bottom: 4px; border-top: 1px solid var(--line); padding-top: 16px;">';
  html += '<div class="activity-grid" style="grid-template-rows: repeat(7, 10px); gap: 3px;">';

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const days = 180;

  let currentStreakDate = new Date(todayDate);
  currentStreakDate.setDate(currentStreakDate.getDate() - days + 1);

  while (currentStreakDate.getDay() !== 0) {
    currentStreakDate.setDate(currentStreakDate.getDate() - 1);
  }

  const historySet = new Set(task.history || []);

  while (currentStreakDate <= todayDate) {
    const dStr = currentStreakDate.toLocaleDateString('en-CA');
    const completed = historySet.has(dStr);
    const level = completed ? 4 : 0;

    html += `<div class="activity-square" data-level="${level}" style="width:10px; height:10px; border-radius:2px;" title="${completed ? 'Completed' : 'Missed'} on ${dStr}"></div>`;

    currentStreakDate.setDate(currentStreakDate.getDate() + 1);
  }

  html += '</div></div>';
  return html;
}

function createTaskHTML(t) {
  return `
    <article class="task ${t.completed ? "done" : ""}" data-id="${t.id}" ${t.repeat === 'daily' ? 'style="flex-direction: column;"' : ''}>
      <div style="display: flex; gap: 16px; width: 100%;">
        <button class="check" onclick="toggleTask(${t.id})" aria-label="Complete task"></button>
        <div class="task-content">
          <div class="task-title">${icons[t.category] || "📌"} ${escapeHTML(t.title)}</div>
          <div class="meta">
            <span class="badge">${escapeHTML(t.category)}</span>
            <span class="badge priority-${t.priority.toLowerCase()}">${escapeHTML(t.priority)}</span>
            ${t.repeat === 'daily' ? '<span class="badge" style="background:var(--accent-light);color:var(--accent)">🔁 Daily</span>' : ''}
            <span class="task-date">📅 ${formatDate(t.date, t.time)}</span>
          </div>
          ${t.notes ? `<div class="task-notes">${escapeHTML(t.notes)}</div>` : ""}
          ${t.link ? `<a class="task-link" href="${escapeHTML(t.link)}" target="_blank" rel="noopener">Open link ↗</a>` : ""}
        </div>
        <div class="task-actions">
          <button class="icon-btn" onclick="deleteTask(${t.id})" title="Delete">🗑</button>
        </div>
      </div>
      ${t.repeat === 'daily' ? generateTaskHeatmap(t) : ""}
    </article>
  `;
}

let sortableInstance = null;

function render() {
  const isRoutines = currentAppMode === 'routines';
  
  if (isRoutines) {
    document.getElementById("viewEyebrow").textContent = "DAILY HABITS";
    document.getElementById("viewTitle").textContent = "Daily Routines";
    document.getElementById("viewSubtitle").textContent = "Track your daily habits and see your progress.";
    document.getElementById("mainStats").style.display = "none";
  } else {
    document.getElementById("viewEyebrow").textContent = "YOUR PERSONAL INBOX";
    const [title, subtitle] = titles[currentView] || titles.all;
    document.getElementById("viewTitle").textContent =
      currentCategory ? `${icons[currentCategory]} ${currentCategory}` : title;
    document.getElementById("viewSubtitle").textContent =
      currentCategory ? `Everything saved under ${currentCategory}.` : subtitle;
    document.getElementById("mainStats").style.display = "";
  }

  const normalTasks = tasks.filter(t => t.repeat !== 'daily');

  const openNormal = normalTasks.filter(t => !t.completed);
  document.getElementById("statOpen").textContent = openNormal.length;
  document.getElementById("statToday").textContent = openNormal.filter(t => isToday(t.date)).length;
  document.getElementById("statDone").textContent = normalTasks.filter(t => t.completed).length;

  document.getElementById("countAll").textContent = openNormal.length;
  document.getElementById("countToday").textContent = openNormal.filter(t => isToday(t.date)).length;
  document.getElementById("countUpcoming").textContent = openNormal.filter(t => isUpcoming(t.date)).length;
  document.getElementById("countSomeday").textContent = openNormal.filter(t => !t.date).length;

  const list = document.getElementById("taskList");
  const filtered = getFilteredTasks();

  if (!filtered.length) {
    if (sortableInstance) sortableInstance.destroy();
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">${currentView === "completed" ? "🎉" : "✨"}</div>
      <strong>${currentView === "completed" ? "Nothing completed yet" : "Nothing here yet"}</strong>
      <p>Add something with the button above.</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(createTaskHTML).join("");

  // Auto-scroll heatmaps to current day
  document.querySelectorAll('.task-heatmap-wrapper').forEach(wrapper => {
    wrapper.scrollLeft = wrapper.scrollWidth;
  });

  // Initialize SortableJS
  if (sortableInstance) sortableInstance.destroy();

  if (!document.getElementById("search").value && !currentCategory) {
    sortableInstance = new Sortable(list, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: function (evt) {
        const newOrderIds = Array.from(document.querySelectorAll('.task')).map(el => parseInt(el.dataset.id));
        tasks = newOrderIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
        save();
      }
    });
  }
}

render();
