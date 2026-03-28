const STORAGE_KEY = "tapnow-lite.v1";

const state = {
  projects: [],
  activeProjectId: null,
  transform: { x: 0, y: 0, scale: 1 },
};

const els = {
  projectList: document.getElementById("projectList"),
  projectNameInput: document.getElementById("projectNameInput"),
  newProjectBtn: document.getElementById("newProjectBtn"),
  renameProjectBtn: document.getElementById("renameProjectBtn"),
  deleteProjectBtn: document.getElementById("deleteProjectBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  canvasContainer: document.getElementById("canvasContainer"),
  canvas: document.getElementById("canvas"),
  addNoteBtn: document.getElementById("addNoteBtn"),
  resetViewBtn: document.getElementById("resetViewBtn"),
  saveStatus: document.getElementById("saveStatus"),
  noteTemplate: document.getElementById("noteTemplate"),
  apiBaseInput: document.getElementById("apiBaseInput"),
  modelInput: document.getElementById("modelInput"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveModelConfigBtn: document.getElementById("saveModelConfigBtn"),
  aiPrompt: document.getElementById("aiPrompt"),
  askAiBtn: document.getElementById("askAiBtn"),
  aiOutput: document.getElementById("aiOutput"),
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowText() {
  return new Date().toLocaleTimeString();
}

function getActiveProject() {
  return state.projects.find((p) => p.id === state.activeProjectId) || null;
}

function setSaveStatus(text, temporary = false) {
  els.saveStatus.textContent = text;
  if (temporary) {
    setTimeout(() => {
      els.saveStatus.textContent = "已保存";
    }, 1400);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setSaveStatus(`已自动保存 ${nowText()}`);
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const first = createProject("默认项目", false);
    state.activeProjectId = first.id;
    persist();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.projects = parsed.projects || [];
    state.activeProjectId = parsed.activeProjectId || state.projects[0]?.id || null;
    state.transform = parsed.transform || { x: 0, y: 0, scale: 1 };
  } catch (e) {
    console.error("读取本地数据失败", e);
    state.projects = [];
    const first = createProject("默认项目", false);
    state.activeProjectId = first.id;
    persist();
  }
}

function createProject(name, doSave = true) {
  const project = {
    id: uid(),
    name,
    notes: [],
    modelConfig: {
      apiBase: "http://127.0.0.1:11434/v1",
      model: "qwen2.5:14b",
      apiKey: "",
    },
  };
  state.projects.unshift(project);
  if (doSave) persist();
  return project;
}

function switchProject(projectId) {
  state.activeProjectId = projectId;
  renderProjects();
  renderCanvas();
  renderModelConfig();
  persist();
}

function renderProjects() {
  els.projectList.innerHTML = "";
  state.projects.forEach((project) => {
    const li = document.createElement("li");
    if (project.id === state.activeProjectId) li.classList.add("active");

    const button = document.createElement("button");
    button.textContent = project.name;
    button.addEventListener("click", () => switchProject(project.id));

    li.appendChild(button);
    els.projectList.appendChild(li);
  });

  const active = getActiveProject();
  els.projectNameInput.value = active?.name || "";
}

function renderModelConfig() {
  const project = getActiveProject();
  if (!project) return;
  els.apiBaseInput.value = project.modelConfig?.apiBase || "";
  els.modelInput.value = project.modelConfig?.model || "";
  els.apiKeyInput.value = project.modelConfig?.apiKey || "";
}

function updateCanvasTransform() {
  const { x, y, scale } = state.transform;
  els.canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function renderCanvas() {
  els.canvas.innerHTML = "";
  const project = getActiveProject();
  if (!project) return;

  project.notes.forEach((note) => {
    const node = els.noteTemplate.content.firstElementChild.cloneNode(true);
    node.style.left = `${note.x}px`;
    node.style.top = `${note.y}px`;
    node.dataset.id = note.id;
    const textarea = node.querySelector(".note-content");
    textarea.value = note.text;
    textarea.addEventListener("input", () => {
      note.text = textarea.value;
      persist();
    });

    node.querySelector(".remove-note").addEventListener("click", () => {
      project.notes = project.notes.filter((n) => n.id !== note.id);
      renderCanvas();
      persist();
    });

    setupDrag(node, note, project);
    els.canvas.appendChild(node);
  });

  updateCanvasTransform();
}

function setupDrag(node, note, project) {
  const handle = node.querySelector(".drag-handle");
  let dragging = false;
  let startX = 0;
  let startY = 0;

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startX) / state.transform.scale;
    const dy = (e.clientY - startY) / state.transform.scale;
    note.x += dx;
    note.y += dy;
    node.style.left = `${note.x}px`;
    node.style.top = `${note.y}px`;
    startX = e.clientX;
    startY = e.clientY;
  });

  handle.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    persist();
  });

  handle.addEventListener("pointercancel", () => {
    dragging = false;
  });

  node.addEventListener("dblclick", () => {
    const text = prompt("快速编辑", note.text);
    if (text !== null) {
      note.text = text;
      renderCanvas();
      persist();
    }
  });
}

function addNote() {
  const project = getActiveProject();
  if (!project) return;

  project.notes.push({
    id: uid(),
    x: Math.round((-state.transform.x + 120) / state.transform.scale),
    y: Math.round((-state.transform.y + 80) / state.transform.scale),
    text: "新便签",
  });
  renderCanvas();
  persist();
}

function initPanAndZoom() {
  let panning = false;
  let sx = 0;
  let sy = 0;

  els.canvasContainer.addEventListener("pointerdown", (e) => {
    if (e.target !== els.canvasContainer && e.target !== els.canvas) return;
    panning = true;
    sx = e.clientX;
    sy = e.clientY;
    els.canvasContainer.setPointerCapture(e.pointerId);
  });

  els.canvasContainer.addEventListener("pointermove", (e) => {
    if (!panning) return;
    state.transform.x += e.clientX - sx;
    state.transform.y += e.clientY - sy;
    sx = e.clientX;
    sy = e.clientY;
    updateCanvasTransform();
  });

  els.canvasContainer.addEventListener("pointerup", () => {
    if (!panning) return;
    panning = false;
    persist();
  });

  els.canvasContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const next = state.transform.scale * (e.deltaY < 0 ? 1.08 : 0.92);
    state.transform.scale = Math.min(2.5, Math.max(0.3, next));
    updateCanvasTransform();
    persist();
  });
}

async function askLocalModel() {
  const project = getActiveProject();
  if (!project) return;

  const prompt = els.aiPrompt.value.trim();
  if (!prompt) return;

  const { apiBase, model, apiKey } = project.modelConfig;
  if (!apiBase || !model) {
    setSaveStatus("请先填写模型配置", true);
    return;
  }

  els.aiOutput.textContent = "请求中...";
  try {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是项目管理助手，回答简洁可执行。" },
          { role: "user", content: `项目：${project.name}\n需求：${prompt}` },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "模型未返回内容";
    els.aiOutput.textContent = content;
  } catch (err) {
    els.aiOutput.textContent = `调用失败：${err.message}\n请确认本地模型服务已启动，且已允许跨域。`;
  }
}

function bindEvents() {
  els.newProjectBtn.addEventListener("click", () => {
    const name = prompt("项目名", `项目-${state.projects.length + 1}`);
    if (!name) return;
    const project = createProject(name);
    switchProject(project.id);
  });

  els.renameProjectBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    const value = els.projectNameInput.value.trim();
    if (!value) return;
    project.name = value;
    renderProjects();
    persist();
  });

  els.deleteProjectBtn.addEventListener("click", () => {
    if (state.projects.length === 1) {
      setSaveStatus("至少保留一个项目", true);
      return;
    }
    const project = getActiveProject();
    if (!project) return;
    state.projects = state.projects.filter((p) => p.id !== project.id);
    state.activeProjectId = state.projects[0]?.id || null;
    renderProjects();
    renderCanvas();
    renderModelConfig();
    persist();
  });

  els.addNoteBtn.addEventListener("click", addNote);

  els.resetViewBtn.addEventListener("click", () => {
    state.transform = { x: 0, y: 0, scale: 1 };
    updateCanvasTransform();
    persist();
  });

  els.saveModelConfigBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    project.modelConfig = {
      apiBase: els.apiBaseInput.value.trim(),
      model: els.modelInput.value.trim(),
      apiKey: els.apiKeyInput.value.trim(),
    };
    persist();
    setSaveStatus("模型配置已保存", true);
  });

  els.askAiBtn.addEventListener("click", askLocalModel);

  els.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tapnow-lite-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  els.importInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.projects)) {
        throw new Error("文件格式不正确");
      }
      state.projects = data.projects;
      state.activeProjectId = data.activeProjectId || data.projects[0]?.id || null;
      state.transform = data.transform || { x: 0, y: 0, scale: 1 };
      renderProjects();
      renderCanvas();
      renderModelConfig();
      persist();
      setSaveStatus("导入成功", true);
    } catch (err) {
      setSaveStatus(`导入失败: ${err.message}`, true);
    } finally {
      e.target.value = "";
    }
  });
}

function init() {
  load();
  bindEvents();
  initPanAndZoom();
  renderProjects();
  renderCanvas();
  renderModelConfig();
  setSaveStatus("已加载");
}

init();
