"use strict";

const STORAGE_KEY = "campus-study-todos-v1";
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const inputError = document.querySelector("#input-error");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const storageMessage = document.querySelector("#storage-message");
const filterButtons = document.querySelectorAll("[data-filter]");

let currentFilter = "all";
let tasks = loadTasks();
let nextId = tasks.reduce((largest, task) => Math.max(largest, task.id), 0) + 1;

function showStorageMessage(message) {
  storageMessage.textContent = message;
  storageMessage.hidden = false;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const data = JSON.parse(saved);
    // 检查存储结构，避免损坏的数据导致页面无法使用。
    if (!Array.isArray(data) || !data.every(task =>
      task !== null && typeof task === "object" &&
      Number.isSafeInteger(task.id) && task.id > 0 &&
      typeof task.text === "string" && task.text.trim().length > 0 &&
      typeof task.completed === "boolean"
    ) || new Set(data.map(task => task.id)).size !== data.length) {
      throw new Error("任务数据格式无效");
    }
    return data;
  } catch {
    showStorageMessage("无法读取已保存的任务。你仍可使用清单，但旧数据可能无法恢复。");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageMessage.hidden = true;
  } catch {
    showStorageMessage("保存失败：浏览器存储不可用或已满。当前任务仅在本次打开期间保留。");
  }
}

function renderTasks() {
  taskList.replaceChildren();
  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  visibleTasks.forEach(task => {
    const item = document.createElement("li");
    item.className = task.completed ? "task-item completed" : "task-item";

    const label = document.createElement("label");
    label.className = "task-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const text = document.createElement("span");
    text.className = "task-text";
    // 用户输入只作为文本显示，不作为 HTML 解析。
    text.textContent = task.text;
    label.append(checkbox, text);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "删除";
    deleteButton.setAttribute("aria-label", `删除任务：${task.text}`);
    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter(candidate => candidate.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(label, deleteButton);
    taskList.append(item);
  });

  const remaining = tasks.filter(task => !task.completed).length;
  taskCount.textContent = `还有 ${remaining} 项未完成`;
  emptyState.hidden = visibleTasks.length > 0;
  if (tasks.length === 0) {
    emptyState.textContent = "还没有任务，添加一项学习计划吧。";
  } else {
    emptyState.textContent = currentFilter === "active"
      ? "没有未完成的任务，做得不错！"
      : "还没有已完成的任务，完成后勾选一下吧。";
  }

  filterButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === currentFilter));
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    inputError.textContent = "请先输入任务名称，不能只输入空格。";
    inputError.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }

  tasks.push({ id: nextId++, text, completed: false });
  saveTasks();
  // 新任务显示在“全部”中，避免在“已完成”筛选下添加后看不到。
  currentFilter = "all";
  input.value = "";
  inputError.hidden = true;
  input.removeAttribute("aria-invalid");
  renderTasks();
  input.focus();
});

input.addEventListener("input", () => {
  inputError.hidden = true;
  input.removeAttribute("aria-invalid");
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

renderTasks();
