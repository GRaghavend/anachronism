// ==========================================================
// archives.js
// Loads content/discoveries.md, parses it into discovery
// entries, and renders one sticky note per entry onto the
// masonry board. Fully data-driven: adding, removing, or
// editing entries in the Markdown file changes the page with
// no HTML/JS edits required.
// ==========================================================

var DISCOVERIES_MD_PATH = "contents/archives.md";

// Cache of parsed discoveries so we can re-render into a
// different number of columns on resize without re-fetching.
var cachedDiscoveries = [];
var resizeTimeoutId = null;

document.addEventListener("DOMContentLoaded", function () {
  loadDiscoveries();

  window.addEventListener("resize", function () {
    // Debounce so we're not rebuilding the board on every pixel.
    clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(function () {
      renderNotes(cachedDiscoveries);
    }, 150);
  });
});

/**
 * Fetches the Markdown file and kicks off parsing/rendering.
 * Note: fetch() of a local file requires the page to be served
 * over http:// (e.g. a local dev server) rather than opened
 * directly via file:// - browsers block that with a CORS error.
 */
function loadDiscoveries() {
  var statusEl = document.getElementById("notes-status");

  fetch(DISCOVERIES_MD_PATH)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + DISCOVERIES_MD_PATH);
      }
      return response.text();
    })
    .then(function (markdownText) {
      var discoveries = parseDiscoveries(markdownText);
      cachedDiscoveries = discoveries;
      renderNotes(discoveries);
    })
    .catch(function (err) {
      console.error("[archives] Failed to load discoveries:", err);
      if (statusEl) {
        statusEl.textContent =
          "Couldn't load the archives right now. If you're viewing this " +
          "file directly from disk, try running it through a local server instead.";
      }
    });
}

/**
 * Parses the custom Markdown format into an array of discovery
 * objects. Does NOT assume any fixed number of entries - splits
 * on every "## " heading found in the file.
 *
 * Expected shape per entry:
 *   ## Title
 *   Summary text (one or more lines)
 *   Link:
 *   https://...            <- optional
 *
 * @param {string} mdText raw Markdown file contents
 * @returns {Array<{title: string, summary: string, link: string|null}>}
 */
function parseDiscoveries(mdText) {
  if (!mdText) return [];

  // Split into blocks, each starting at a "## " heading.
  var blocks = mdText
    .split(/\n(?=##\s)/)
    .map(function (block) {
      return block.trim();
    })
    .filter(function (block) {
      return block.length > 0 && /^##\s/.test(block);
    });

  return blocks.map(function (block) {
    var lines = block.split("\n").map(function (line) {
      return line.trim();
    });

    var title = lines[0].replace(/^##\s*/, "").trim();
    var summaryLines = [];
    var link = null;

    for (var i = 1; i < lines.length; i++) {
      if (/^Link:$/i.test(lines[i])) {
        // Look ahead for the next non-empty line - that's the URL.
        for (var j = i + 1; j < lines.length; j++) {
          if (lines[j]) {
            link = lines[j];
            break;
          }
        }
        break;
      }
      if (lines[i]) {
        summaryLines.push(lines[i]);
      }
    }

    return {
      title: title,
      summary: summaryLines.join(" "),
      link: link
    };
  });
}

/**
 * Decides how many columns to use based on viewport width.
 * Kept in sync with the single breakpoint left in archives.css
 * (.notes-board switches to flex-direction: column under 600px,
 * so 1 column here matches that; 900px/600px split mirrors the
 * rest of the site's existing breakpoints).
 *
 * @returns {number}
 */
function getColumnCount() {
  var width = window.innerWidth;
  if (width <= 600) return 1;
  if (width <= 900) return 2;
  return 3;
}

/**
 * Renders discoveries as sticky notes distributed across real
 * flex columns (built here in JS, not CSS multi-column layout).
 *
 * Why: CSS `column-count` + `break-inside: avoid` looks right in
 * theory, but browsers don't always honor `break-inside: avoid`
 * for tall/shadowed blocks - a note can get visually sliced in
 * half across the column break. Building actual column <div>s
 * and appending each note as a single DOM child of one column
 * makes that impossible - a note can never straddle a break
 * because there's no automatic column-filling happening at all.
 *
 * Notes are assigned to whichever column currently has the
 * least estimated content (shortest-column-first), so the
 * board still balances out rather than just going round-robin.
 *
 * @param {Array<{title: string, summary: string, link: string|null}>} discoveries
 */
function renderNotes(discoveries) {
  var board = document.getElementById("notes-board");
  if (!board) return;

  board.innerHTML = "";

  var statusEl = document.getElementById("notes-status");

  if (discoveries.length === 0) {
    if (statusEl) {
      statusEl.textContent = "No discoveries yet - check back soon.";
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = "";
  }

  var columnCount = getColumnCount();
  var columns = [];
  var columnHeights = []; // running estimated content length per column

  for (var c = 0; c < columnCount; c++) {
    var columnEl = document.createElement("div");
    columnEl.className = "notes-column";
    board.appendChild(columnEl);
    columns.push(columnEl);
    columnHeights.push(0);
  }

  discoveries.forEach(function (discovery) {
    // Rough proxy for rendered height: longer text -> taller note.
    var estimatedHeight =
      discovery.title.length + discovery.summary.length + (discovery.link ? 40 : 0);

    // Find the column with the smallest running total so far.
    var targetIndex = 0;
    for (var i = 1; i < columnHeights.length; i++) {
      if (columnHeights[i] < columnHeights[targetIndex]) {
        targetIndex = i;
      }
    }

    columns[targetIndex].appendChild(buildNoteElement(discovery));
    columnHeights[targetIndex] += estimatedHeight;
  });
}

/**
 * Builds a single sticky-note DOM element for one discovery.
 * The "Read More ->" button only gets created when a link exists.
 *
 * @param {{title: string, summary: string, link: string|null}} discovery
 * @returns {HTMLElement}
 */
function buildNoteElement(discovery) {
  var note = document.createElement("div");
  note.className = "sticky-note";

  var titleEl = document.createElement("h3");
  titleEl.className = "note-title";
  titleEl.textContent = discovery.title;
  note.appendChild(titleEl);

  var summaryEl = document.createElement("p");
  summaryEl.className = "note-summary";
  summaryEl.textContent = discovery.summary;
  note.appendChild(summaryEl);

  // Only render the button if a link was actually found.
  if (discovery.link) {
    var linkBtn = document.createElement("a");
    linkBtn.className = "note-link-btn";
    linkBtn.href = discovery.link;
    linkBtn.target = "_blank";
    linkBtn.rel = "noopener noreferrer";
    linkBtn.textContent = "I'm curious \u2192";
    note.appendChild(linkBtn);
  }

  return note;
}