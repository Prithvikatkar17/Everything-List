let tasks = JSON.parse(localStorage.getItem("everythingTasks") || "[]");
let currentView = "all";
let currentCategory = null;

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
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    link: document.getElementById("link").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    completed: false,
    created: new Date().toISOString()
  });

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
  now.setHours(0,0,0,0);
  return d > now;
}

function getFilteredTasks() {
  const search = document.getElementById("search").value.toLowerCase().trim();

  return tasks.filter(t => {
    if (currentCategory && t.category !== currentCategory) return false;

    if (currentView === "today" && (!isToday(t.date) || t.completed)) return false;
    if (currentView === "upcoming" && (!isUpcoming(t.date) || t.completed)) return false;
    if (currentView === "someday" && (t.date || t.completed)) return false;
    if (currentView === "completed" && !t.completed) return false;

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
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

window.toggleTask = function(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  save();
  render();
};

window.deleteTask = function(id) {
  if (!confirm("Delete this item?")) return;
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
};

let sortableInstance = null;

function render() {
  const [title, subtitle] = titles[currentView] || titles.all;
  document.getElementById("viewTitle").textContent =
    currentCategory ? `${icons[currentCategory]} ${currentCategory}` : title;
  document.getElementById("viewSubtitle").textContent =
    currentCategory ? `Everything saved under ${currentCategory}.` : subtitle;

  const open = tasks.filter(t => !t.completed);
  document.getElementById("statOpen").textContent = open.length;
  document.getElementById("statToday").textContent = open.filter(t => isToday(t.date)).length;
  document.getElementById("statDone").textContent = tasks.filter(t => t.completed).length;

  document.getElementById("countAll").textContent = open.length;
  document.getElementById("countToday").textContent = open.filter(t => isToday(t.date)).length;
  document.getElementById("countUpcoming").textContent = open.filter(t => isUpcoming(t.date)).length;
  document.getElementById("countSomeday").textContent = open.filter(t => !t.date).length;

  const list = document.getElementById("taskList");
  const filtered = getFilteredTasks();

  if (!filtered.length) {
    if(sortableInstance) sortableInstance.destroy();
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">${currentView === "completed" ? "🎉" : "✨"}</div>
      <strong>${currentView === "completed" ? "Nothing completed yet" : "Nothing here yet"}</strong>
      <p>Add something with the button above.</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(t => `
    <article class="task ${t.completed ? "done" : ""}" data-id="${t.id}">
      <button class="check" onclick="toggleTask(${t.id})" aria-label="Complete task"></button>
      <div class="task-content">
        <div class="task-title">${icons[t.category] || "📌"} ${escapeHTML(t.title)}</div>
        <div class="meta">
          <span class="badge">${escapeHTML(t.category)}</span>
          <span class="badge priority-${t.priority.toLowerCase()}">${escapeHTML(t.priority)}</span>
          <span class="task-date">📅 ${formatDate(t.date, t.time)}</span>
        </div>
        ${t.notes ? `<div class="task-notes">${escapeHTML(t.notes)}</div>` : ""}
        ${t.link ? `<a class="task-link" href="${escapeHTML(t.link)}" target="_blank" rel="noopener">Open link ↗</a>` : ""}
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="deleteTask(${t.id})" title="Delete">🗑</button>
      </div>
    </article>
  `).join("");

  // Initialize SortableJS
  if (sortableInstance) sortableInstance.destroy();
  
  if (currentView === "all" && !currentCategory && !document.getElementById("search").value) {
    sortableInstance = new Sortable(list, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: function (evt) {
        // Reorder tasks array
        const movedItem = tasks.splice(evt.oldIndex, 1)[0];
        tasks.splice(evt.newIndex, 0, movedItem);
        save();
      },
    });
  }
}

render();
