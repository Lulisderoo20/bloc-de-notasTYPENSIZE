const editor = document.getElementById("editor");
const fileInput = document.getElementById("fileInput");
const fontFamily = document.getElementById("fontFamily");
const fontSize = document.getElementById("fontSize");
const windowTitle = document.getElementById("windowTitle");
const documentName = document.getElementById("documentName");
const documentStats = document.getElementById("documentStats");
const cursorPosition = document.getElementById("cursorPosition");
const selectionHint = document.getElementById("selectionHint");
const wrapCheckmark = document.getElementById("wrapCheckmark");

const storageKey = "bloc-notas-nts-rich";
const blockTags = new Set(["DIV", "P", "LI"]);

const state = {
  fileName: "Sin titulo.txt",
  dirty: false,
  wordWrap: true,
  savedRange: null,
};

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeLineBreaks(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function buildHtmlFromText(text) {
  const normalized = normalizeLineBreaks(text);

  if (!normalized) {
    return "";
  }

  return normalized
    .split("\n")
    .map((line) => (line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>"))
    .join("");
}

function extractPlainText(node) {
  if (!node) {
    return "";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue;
  }

  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return "";
  }

  if (node.nodeName === "BR") {
    return "\n";
  }

  const children = Array.from(node.childNodes);
  let result = "";

  children.forEach((child, index) => {
    result += extractPlainText(child);

    if (
      child.nodeType === Node.ELEMENT_NODE &&
      blockTags.has(child.nodeName) &&
      index < children.length - 1
    ) {
      result += "\n";
    }
  });

  return result.replace(/\u00a0/g, " ");
}

function getPlainText() {
  if (!editor.textContent && !editor.querySelector("br")) {
    return "";
  }

  return extractPlainText(editor);
}

function countLines(text) {
  return text.length === 0 ? 1 : text.split("\n").length;
}

function updateTitles() {
  const marker = state.dirty ? "* " : "";
  documentName.textContent = state.fileName;
  windowTitle.textContent = `${marker}${state.fileName.replace(/\.(txt|html|htm)$/i, "")} - Bloc de notas NTS`;
}

function updateStats() {
  const text = getPlainText();
  const chars = text.length;
  const lines = countLines(text);
  const lineLabel = lines === 1 ? "linea" : "lineas";

  documentStats.textContent = `${chars} caracteres, ${lines} ${lineLabel}`;
}

function isRangeInsideEditor(range) {
  const container = range.commonAncestorContainer;
  return container === editor || editor.contains(container);
}

function saveSelectionIfNeeded() {
  const selection = window.getSelection();

  if (!selection.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (isRangeInsideEditor(range)) {
    state.savedRange = range.cloneRange();
  }
}

function restoreSavedRange() {
  const selection = window.getSelection();

  if (state.savedRange) {
    try {
      selection.removeAllRanges();
      selection.addRange(state.savedRange);
      return selection.getRangeAt(0);
    } catch (error) {
      state.savedRange = null;
    }
  }

  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);
    return isRangeInsideEditor(range) ? range : null;
  }

  return null;
}

function getTextBeforeCaret() {
  const selection = window.getSelection();

  if (!selection.rangeCount) {
    return "";
  }

  const range = selection.getRangeAt(0);

  if (!isRangeInsideEditor(range)) {
    return "";
  }

  const caretRange = range.cloneRange();
  caretRange.collapse(true);

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(editor);
  beforeRange.setEnd(caretRange.endContainer, caretRange.endOffset);

  return extractPlainText(beforeRange.cloneContents());
}

function updateCursor() {
  const beforeCaret = getTextBeforeCaret();
  const line = beforeCaret.length === 0 ? 1 : beforeCaret.split("\n").length;
  const column = beforeCaret.length - beforeCaret.lastIndexOf("\n");

  cursorPosition.textContent = `Ln ${line}, Col ${column}`;
}

function updateWrapVisuals() {
  editor.style.whiteSpace = state.wordWrap ? "pre-wrap" : "pre";
  editor.style.overflowX = state.wordWrap ? "hidden" : "auto";
  wrapCheckmark.style.visibility = state.wordWrap ? "visible" : "hidden";
}

function markDirty(isDirty) {
  state.dirty = isDirty;
  updateTitles();
}

function saveLocally() {
  const snapshot = {
    contentHtml: editor.innerHTML,
    fileName: state.fileName,
    wordWrap: state.wordWrap,
  };

  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function refreshView() {
  updateTitles();
  updateStats();
  updateCursor();
  updateWrapVisuals();
  saveLocally();
}

function setSelectionHint(message) {
  if (selectionHint) {
    selectionHint.textContent = message;
  }
}

function clearDocument() {
  editor.innerHTML = "";
  state.fileName = "Sin titulo.txt";
  state.savedRange = null;
  markDirty(false);
  refreshView();
}

function confirmDiscardChanges(actionLabel) {
  if (!getPlainText() || !state.dirty) {
    return true;
  }

  return window.confirm(`Hay cambios sin guardar. Queres ${actionLabel}?`);
}

function normalizeFileName(name, extension) {
  const trimmed = (name || "").trim() || `Sin titulo${extension}`;
  const baseName = trimmed.replace(/\.[a-z0-9]+$/i, "");
  return `${baseName}${extension}`;
}

function hasRichFormatting() {
  return editor.querySelector("span[style]") !== null;
}

function buildHtmlDocument() {
  return [
    "<!DOCTYPE html>",
    '<html lang="es">',
    "<head>",
    '  <meta charset="UTF-8">',
    "  <title>Documento NTS</title>",
    "  <style>",
    "    body { margin: 0; padding: 20px; background: #ffffff; color: #111111; }",
    "    #nts-document { font-family: Consolas, 'Courier New', monospace; font-size: 11px; line-height: 1.42; white-space: pre-wrap; }",
    "  </style>",
    "</head>",
    "<body>",
    `  <main id="nts-document">${editor.innerHTML || "<div><br></div>"}</main>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function downloadDocument() {
  const rich = hasRichFormatting();
  const extension = rich ? ".html" : ".txt";
  const defaultName = normalizeFileName(state.fileName.replace(/\.(txt|html|htm)$/i, ""), extension);
  const chosenName = window.prompt("Nombre del archivo", defaultName);

  if (chosenName === null) {
    return;
  }

  const fileName = normalizeFileName(chosenName, extension);
  const payload = rich ? buildHtmlDocument() : getPlainText();
  const blob = new Blob([payload], { type: rich ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" });
  const link = document.createElement("a");

  state.fileName = fileName;
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);

  markDirty(false);
  refreshView();
}

function loadSavedState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    refreshView();
    return;
  }

  try {
    const snapshot = JSON.parse(saved);
    editor.innerHTML = snapshot.contentHtml || "";
    state.fileName = snapshot.fileName || state.fileName;
    state.wordWrap = snapshot.wordWrap !== false;
    markDirty(false);
  } catch (error) {
    console.error("No se pudo recuperar el estado guardado.", error);
  }

  refreshView();
}

function getIntersectingTextNodes(range) {
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }

        return range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  return nodes;
}

function isolateSelectedTextNode(node, range) {
  let target = node;

  if (node === range.endContainer && range.endOffset < node.nodeValue.length) {
    node.splitText(range.endOffset);
  }

  if (node === range.startContainer && range.startOffset > 0) {
    target = node.splitText(range.startOffset);
  }

  return target;
}

function wrapSelectedTextNode(node, stylePatch) {
  const parent = node.parentElement;

  if (parent && parent.tagName === "SPAN" && parent.childNodes.length === 1) {
    if (stylePatch.fontFamily) {
      parent.style.fontFamily = stylePatch.fontFamily;
    }

    if (stylePatch.fontSize) {
      parent.style.fontSize = `${stylePatch.fontSize}px`;
    }

    return parent;
  }

  const span = document.createElement("span");

  if (stylePatch.fontFamily) {
    span.style.fontFamily = stylePatch.fontFamily;
  }

  if (stylePatch.fontSize) {
    span.style.fontSize = `${stylePatch.fontSize}px`;
  }

  node.parentNode.insertBefore(span, node);
  span.appendChild(node);
  return span;
}

function mergeAdjacentSpans() {
  let changed = true;

  while (changed) {
    changed = false;
    const spans = Array.from(editor.querySelectorAll("span"));

    for (const span of spans) {
      const next = span.nextSibling;

      if (
        next &&
        next.nodeType === Node.ELEMENT_NODE &&
        next.tagName === "SPAN" &&
        next.style.cssText === span.style.cssText
      ) {
        while (next.firstChild) {
          span.appendChild(next.firstChild);
        }

        next.remove();
        changed = true;
        break;
      }
    }
  }
}

function removeEmptySpans() {
  Array.from(editor.querySelectorAll("span")).forEach((span) => {
    if (!span.textContent && !span.querySelector("br")) {
      span.remove();
    }
  });
}

function cleanupMarkup() {
  mergeAdjacentSpans();
  removeEmptySpans();
}

function selectWrappedNodes(wrappedNodes) {
  if (wrappedNodes.length === 0) {
    return;
  }

  const range = document.createRange();
  range.setStartBefore(wrappedNodes[0]);
  range.setEndAfter(wrappedNodes[wrappedNodes.length - 1]);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedRange = range.cloneRange();
}

function applyStyleToSelection(stylePatch) {
  const range = restoreSavedRange();

  if (!range || range.collapsed || !isRangeInsideEditor(range)) {
    setSelectionHint("Selecciona texto para aplicar la fuente o el tamano.");
    return;
  }

  const nodes = getIntersectingTextNodes(range);
  const wrappedNodes = [];

  nodes.forEach((node) => {
    const isolatedNode = isolateSelectedTextNode(node, range);
    wrappedNodes.push(wrapSelectedTextNode(isolatedNode, stylePatch));
  });

  cleanupMarkup();
  selectWrappedNodes(wrappedNodes);
  markDirty(true);
  setSelectionHint("Formato aplicado a la seleccion.");
  editor.focus();
  refreshView();
}

function insertPlainText(text) {
  const selection = window.getSelection();

  if (!selection.rangeCount) {
    return;
  }

  const success = document.execCommand("insertText", false, text);

  if (success) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function openFilePicker() {
  if (!confirmDiscardChanges("abrir otro archivo")) {
    return;
  }

  fileInput.click();
}

function focusEditor() {
  editor.focus();

  if (!state.savedRange && editor.childNodes.length > 0) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    state.savedRange = range.cloneRange();
  }
}

function loadHtmlIntoEditor(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const exportedRoot = doc.querySelector("#nts-document");

  doc.querySelectorAll("script").forEach((script) => script.remove());
  editor.innerHTML = exportedRoot ? exportedRoot.innerHTML : doc.body.innerHTML;
}

function runEditorCommand(command) {
  focusEditor();
  document.execCommand(command, false);
  refreshView();
}

function selectAllText() {
  focusEditor();
  const range = document.createRange();
  range.selectNodeContents(editor);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedRange = range.cloneRange();
  updateCursor();
}

function handleMenuAction(action) {
  switch (action) {
    case "new":
      if (confirmDiscardChanges("crear un documento nuevo")) {
        clearDocument();
      }
      break;
    case "open":
      openFilePicker();
      break;
    case "save":
      downloadDocument();
      break;
    case "undo":
      runEditorCommand("undo");
      break;
    case "cut":
      runEditorCommand("cut");
      break;
    case "copy":
      runEditorCommand("copy");
      break;
    case "paste":
      runEditorCommand("paste");
      break;
    case "select-all":
      selectAllText();
      break;
    case "toggle-wrap":
      state.wordWrap = !state.wordWrap;
      refreshView();
      break;
    case "about":
      window.alert("Bloc de notas NTS\nReplica tipo Notepad con fuente y tamano por seleccion.");
      break;
    default:
      break;
  }
}

document.querySelectorAll("[data-menu-root]").forEach((menuRoot) => {
  const trigger = menuRoot.querySelector(".menu-trigger");

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const wasOpen = menuRoot.classList.contains("open");

    document.querySelectorAll("[data-menu-root]").forEach((menu) => menu.classList.remove("open"));

    if (!wasOpen) {
      menuRoot.classList.add("open");
    }
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll("[data-menu-root]").forEach((menu) => menu.classList.remove("open"));
});

document.querySelectorAll(".menu-panel").forEach((panel) => {
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton || actionButton.disabled) {
      return;
    }

    handleMenuAction(actionButton.dataset.action);
    document.querySelectorAll("[data-menu-root]").forEach((menu) => menu.classList.remove("open"));
  });
});

fontFamily.addEventListener("change", () => {
  applyStyleToSelection({ fontFamily: fontFamily.value });
});

fontSize.addEventListener("change", () => {
  applyStyleToSelection({ fontSize: fontSize.value });
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  const content = await file.text();
  const isHtml = /\.(html|htm)$/i.test(file.name) || /<html|<body|<main/i.test(content);

  if (isHtml) {
    loadHtmlIntoEditor(content);
  } else {
    editor.innerHTML = buildHtmlFromText(content);
  }

  state.fileName = file.name;
  state.savedRange = null;
  markDirty(false);
  refreshView();
  fileInput.value = "";
});

editor.addEventListener("input", () => {
  markDirty(true);
  setSelectionHint("Selecciona texto para cambiar fuente o tamano solo en esa parte.");
  refreshView();
});

editor.addEventListener("paste", (event) => {
  event.preventDefault();
  const text = normalizeLineBreaks(event.clipboardData.getData("text/plain"));
  insertPlainText(text);
});

editor.addEventListener("focus", () => {
  saveSelectionIfNeeded();
  setSelectionHint("Selecciona texto para aplicar una fuente o tamano distinto.");
});

editor.addEventListener("mouseup", saveSelectionIfNeeded);
editor.addEventListener("keyup", saveSelectionIfNeeded);

document.addEventListener("selectionchange", () => {
  saveSelectionIfNeeded();
  updateCursor();
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (!event.ctrlKey) {
    return;
  }

  if (key === "s") {
    event.preventDefault();
    downloadDocument();
  }

  if (key === "o") {
    event.preventDefault();
    openFilePicker();
  }

  if (key === "n") {
    event.preventDefault();

    if (confirmDiscardChanges("crear un documento nuevo")) {
      clearDocument();
    }
  }

  if (key === "a" && document.activeElement === editor) {
    event.preventDefault();
    selectAllText();
  }
});

loadSavedState();
updateWrapVisuals();
updateCursor();
