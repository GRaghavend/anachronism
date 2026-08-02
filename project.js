// ==========================================================
// project.js
// Wires up the "Projects" nav button to swap the SPA content
// area (see #main-content-area in index.html) with the
// Projects layout, without a page reload. Follows the same
// pattern as about.js.
//
// All project cards are fully data-driven from
// contents/projs.md - no project content is hardcoded here,
// so adding/removing an entry in that file automatically
// adds/removes a card. The number of cards is never assumed.
// ==========================================================

var PROJECTS_MD_PATH = "contents/projs.md";
var PROJECT_ICON_PATH = "assets/projs/macintosh.jpeg";
var PROJECT_ICON_RESEARCH = "assets/research.jpeg";
var PROJECT_ICON_CORPORATE = "assets/corporate.jpeg";

document.addEventListener("DOMContentLoaded", function () {
  initProjectsNav();
});

/**
 * Wires the Projects button to load the Projects section into
 * the shared #main-content-area, replacing whatever is there now.
 */
function initProjectsNav() {
  var projectsBtn = document.getElementById("projects-nav-btn");
  if (!projectsBtn) return;

  projectsBtn.addEventListener("click", function () {
    loadProjectsSection();
  });
}

/**
 * Builds the Projects window shell and injects it into
 * #main-content-area, then kicks off the async Markdown fetch
 * that populates the card grid.
 */
function loadProjectsSection() {
  var container = document.getElementById("main-content-area");
  if (!container) return;

  container.innerHTML = buildProjectsSkeleton();

  loadProjectsMarkdown();
}

/**
 * Returns the static HTML shell for the Projects section: one
 * big Win98 application window (reusing .content-panel /
 * .panel-titlebar from styles.css) with an empty grid that
 * loadProjectsMarkdown() fills in.
 *
 * @returns {string}
 */
function buildProjectsSkeleton() {
  return (
    '<div class="content-panel projects-window">' +
      '<div class="panel-titlebar">' +
        '<span class="panel-titlebar-text">projects.exe</span>' +
        '<span class="panel-titlebar-btns">' +
          '<span class="tb-btn">-</span><span class="tb-btn">\u25a1</span><span class="tb-btn-close">\u2715</span>' +
        "</span>" +
      "</div>" +
      '<div class="panel-body projects-window-body">' +
        '<p id="projects-status" class="projects-status">Loading...</p>' +
        '<div id="projects-grid" class="projects-grid"></div>' +
      "</div>" +
    "</div>"
  );
}

/**
 * Fetches contents/projs.md, parses it, and renders one card
 * per project into #projects-grid. No fixed number of projects
 * is assumed - whatever entries exist in the file get rendered.
 */
function loadProjectsMarkdown() {
  var statusEl = document.getElementById("projects-status");
  var gridEl = document.getElementById("projects-grid");

  fetch(PROJECTS_MD_PATH)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + PROJECTS_MD_PATH);
      }
      return response.text();
    })
    .then(function (mdText) {
      var projects = parseProjectSections(mdText);

      if (statusEl) statusEl.remove();

      if (!gridEl) return;

      if (projects.length === 0) {
        gridEl.innerHTML =
          '<p class="projects-status">No projects listed yet - add an entry to ' +
          PROJECTS_MD_PATH + " to get started.</p>";
        return;
      }

      gridEl.innerHTML = "";
      projects.forEach(function (project) {
        gridEl.appendChild(buildProjectCard(project));
      });
    })
    .catch(function (err) {
      console.error("[projects] Failed to load Projects content:", err);
      if (statusEl) {
        statusEl.textContent =
          "Couldn't load this section right now. If you're viewing this " +
          "file directly from disk, try running it through a local server instead.";
      }
    });
}

/**
 * Resolves which icon a project card should use based on its
 * category flag ("-research" / "-corporate"). Falls back to the
 * generic placeholder icon when no category flag is present.
 *
 * @param {string|null} category
 * @returns {string}
 */
function resolveProjectIconPath(category) {
  if (category === "research") return PROJECT_ICON_RESEARCH;
  if (category === "corporate") return PROJECT_ICON_CORPORATE;
  return PROJECT_ICON_PATH;
}

/**
 * Builds a single project card element.
 *
 * @param {{title: string, summary: string, link: string|null, flags: string[], isCurrent: boolean, category: string|null}} project
 * @returns {HTMLElement}
 */
function buildProjectCard(project) {
  var card = document.createElement("div");
  card.className = "project-card";

  var header = document.createElement("div");
  header.className = "project-card-header";

  var iconHolder = document.createElement("div");
  iconHolder.className = "project-card-icon-holder";
  var icon = document.createElement("img");
  icon.src = resolveProjectIconPath(project.category);
  icon.className = "project-card-icon";
  icon.alt = project.title + " icon";
  iconHolder.appendChild(icon);

  var title = document.createElement("h3");
  title.className = "project-card-title";
  title.textContent = project.title;

  header.appendChild(iconHolder);
  header.appendChild(title);

  var hr = document.createElement("hr");
  hr.className = "project-card-hr";

  var desc = document.createElement("p");
  desc.className = "project-card-desc";
  desc.textContent = project.summary;

  var btn = document.createElement("a");
  btn.className = "win-button project-card-btn";
  if (project.link) {
    btn.href = project.link;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.textContent = "GitHub \u2192";
  } else {
    btn.href = "#";
    btn.classList.add("is-disabled");
    btn.textContent = "No link yet";
  }

  card.appendChild(header);
  card.appendChild(hr);
  card.appendChild(desc);
  card.appendChild(btn);

  return card;
}

/**
 * Parses a Markdown document made up of repeating blocks:
 *
 *   ## Project Title
 *   -curr
 *   -research
 *
 *   Project summary text (may wrap multiple lines).
 *
 *   Link:
 *   https://github.com/...
 *
 * Flag lines (a leading "-" followed by a single word, e.g.
 * "-curr", "-research", "-corporate") are metadata, not part of
 * the summary - they're recognized wherever they appear in the
 * block and are always excluded from the parsed summary text.
 * "Link:" and its URL may also appear on the same line
 * ("Link: https://..."). Does not assume any fixed number of
 * project entries.
 *
 * Recognized flags:
 *   -curr        -> isCurrent: true (shown in the homepage
 *                   "Current Project" window)
 *   -research    -> category: "research"
 *   -corporate / -corp -> category: "corporate"
 *
 * @param {string} mdText
 * @returns {Array<{title: string, summary: string, link: string|null, flags: string[], isCurrent: boolean, category: string|null}>}
 */
function parseProjectSections(mdText) {
  if (!mdText) return [];

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

    var flags = [];
    var summaryLines = [];
    var link = null;

    for (var i = 1; i < lines.length; i++) {
      var line = lines[i];
      if (line.length === 0) continue;

      // Flag line, e.g. "-curr" / "-research" / "-corporate".
      // Recognized (and excluded from the summary) regardless of
      // where it appears in the block.
      var flagMatch = line.match(/^-\s*([a-zA-Z0-9_]+)\s*$/);
      if (flagMatch) {
        flags.push(flagMatch[1].toLowerCase());
        continue;
      }

      // "Link:" on its own line, URL follows on a later line.
      if (/^link:?$/i.test(line)) {
        for (var j = i + 1; j < lines.length; j++) {
          if (lines[j].length > 0) {
            link = lines[j];
            break;
          }
        }
        break;
      }

      // "Link: https://..." on a single line.
      var inlineMatch = line.match(/^link:?\s*(\S+)/i);
      if (inlineMatch) {
        link = inlineMatch[1];
        break;
      }

      summaryLines.push(line);
    }

    var category = null;
    if (flags.indexOf("research") !== -1) {
      category = "research";
    } else if (flags.indexOf("corporate") !== -1 || flags.indexOf("corp") !== -1) {
      category = "corporate";
    }

    return {
      title: title,
      summary: summaryLines.join(" "),
      link: link,
      flags: flags,
      isCurrent: flags.indexOf("curr") !== -1,
      category: category
    };
  });
}