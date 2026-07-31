// ==========================================================
// about.js
// Wires up the "About Me" nav button to swap the SPA content
// area (see #main-content-area in index.html) with the About
// layout, without a page reload.
//
// Box 2 (About Me text) is fully data-driven from
// contents/me.md - no content is hardcoded here, so editing
// that file changes the rendered page automatically.
// ==========================================================

// --------------------------------------------------------
// SINGLE PLACE TO CONFIGURE THE "WHAT AM I LISTENING TO" VIDEO
// --------------------------------------------------------
// TODO: Paste YouTube URL here (any standard watch/share URL works)
var YOUTUBE_VIDEO_URL = "";

var ABOUT_MD_PATH = "contents/me.md";
var ABOUT_PHOTO_PATH = "assets/place-holder.jpeg";

document.addEventListener("DOMContentLoaded", function () {
  initAboutNav();
});

/**
 * Wires the About Me button to load the About section into the
 * shared #main-content-area, replacing whatever is there now.
 */
function initAboutNav() {
  var aboutBtn = document.getElementById("about-nav-btn");
  if (!aboutBtn) return;

  aboutBtn.addEventListener("click", function () {
    loadAboutSection();
  });
}

/**
 * Builds the three-column About layout and injects it into
 * #main-content-area, then kicks off the async Markdown fetch
 * (Box 2) and YouTube thumbnail/title fetch (Box 3).
 */
function loadAboutSection() {
  var container = document.getElementById("main-content-area");
  if (!container) return;

  container.innerHTML = buildAboutSkeleton();

  loadAboutMarkdown();
  loadMusicBox();
}

/**
 * Returns the static HTML shell for the About section. The
 * dynamic bits (Markdown content, video thumbnail/title) get
 * filled in afterwards by loadAboutMarkdown() / loadMusicBox().
 *
 * @returns {string}
 */
function buildAboutSkeleton() {
  return (
    '<div class="about-columns">' +
      // ---- Box 1: Photo ----
      '<div class="about-photo-box plain-panel">' +
        '<img src="' + ABOUT_PHOTO_PATH + '" class="about-photo-img" alt="Photo">' +
      "</div>" +

      // ---- Box 2: About Me (filled in by loadAboutMarkdown) ----
      '<div class="about-main-box plain-panel">' +
        '<p id="about-md-status" class="about-md-status">Loading...</p>' +
        '<div id="about-md-content"></div>' +
      "</div>" +

      // ---- Box 3: Music window (Win98 style, reuses site classes) ----
      '<div class="about-music-box content-panel">' +
        '<div class="panel-titlebar">' +
          '<span class="panel-titlebar-text">music.exe</span>' +
          '<span class="panel-titlebar-btns">' +
            '<span class="tb-btn">-</span><span class="tb-btn">\u25a1</span><span class="tb-btn-close">\u2715</span>' +
          "</span>" +
        "</div>" +
        '<div class="panel-body music-window-body">' +
          '<div class="music-header-row">' +
            '<div class="music-icon-holder" id="music-icon-holder">\u266a</div>' +
            '<span class="music-header-label">WHAT AM I LISTENING TO</span>' +
          "</div>" +
          '<div id="music-content-slot">' +
            '<p class="about-md-status">Loading...</p>' +
          "</div>" +
          '<div class="music-button-spacer"></div>' +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

/**
 * Fetches contents/me.md, parses it, and renders every
 * heading/paragraph found into Box 2. No fixed number of
 * sections is assumed - whatever headings exist in the file
 * get rendered.
 */
function loadAboutMarkdown() {
  var statusEl = document.getElementById("about-md-status");
  var contentEl = document.getElementById("about-md-content");

  fetch(ABOUT_MD_PATH)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + ABOUT_MD_PATH);
      }
      return response.text();
    })
    .then(function (mdText) {
      var sections = parseHeadingSections(mdText);

      if (statusEl) statusEl.remove();
      if (contentEl) {
        contentEl.innerHTML = "";
        sections.forEach(function (section) {
          var h = document.createElement("h3");
          h.className = "about-md-heading";
          h.textContent = section.heading;
          contentEl.appendChild(h);

          var p = document.createElement("p");
          p.className = "about-md-paragraph";
          p.textContent = section.body;
          contentEl.appendChild(p);
        });
      }
    })
    .catch(function (err) {
      console.error("[about] Failed to load About content:", err);
      if (statusEl) {
        statusEl.textContent =
          "Couldn't load this section right now. If you're viewing this " +
          "file directly from disk, try running it through a local server instead.";
      }
    });
}

/**
 * Parses a Markdown document made up of "## Heading" lines
 * followed by paragraph text, into an array of sections.
 * Does not assume any fixed number of headings.
 *
 * @param {string} mdText
 * @returns {Array<{heading: string, body: string}>}
 */
function parseHeadingSections(mdText) {
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

    var heading = lines[0].replace(/^##\s*/, "").trim();
    var bodyLines = lines.slice(1).filter(function (line) {
      return line.length > 0;
    });

    return {
      heading: heading,
      body: bodyLines.join(" ")
    };
  });
}

/**
 * Populates Box 3 with the YouTube thumbnail + title, based on
 * the single YOUTUBE_VIDEO_URL value configured at the top of
 * this file. Falls back to a clearly marked placeholder if no
 * URL is set yet, or if the title lookup fails.
 */
function loadMusicBox() {
  var slot = document.getElementById("music-content-slot");
  if (!slot) return;

  var videoId = extractYouTubeVideoId(YOUTUBE_VIDEO_URL);

  if (!videoId) {
    slot.innerHTML =
      '<p class="music-video-title is-placeholder">' +
      "[ No video configured yet - paste a URL into YOUTUBE_VIDEO_URL in about.js ]" +
      "</p>";
    return;
  }

  var thumbnailUrl = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

  slot.innerHTML =
    '<div class="music-thumb-wrap">' +
      '<img class="music-thumb-img" src="' + thumbnailUrl + '" alt="Video thumbnail">' +
      '<div class="youtube-badge"><span class="play-triangle"></span>YouTube</div>' +
    "</div>" +
    '<p id="music-video-title" class="music-video-title is-placeholder">Loading title...</p>';

  // Try to fetch the real title via YouTube's public oEmbed
  // endpoint. If that fails (offline, blocked, etc.), leave a
  // clearly marked placeholder instead of guessing.
  fetch("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=" + videoId + "&format=json")
    .then(function (response) {
      if (!response.ok) throw new Error("oEmbed request failed");
      return response.json();
    })
    .then(function (data) {
      var titleEl = document.getElementById("music-video-title");
      if (titleEl && data && data.title) {
        titleEl.textContent = data.title;
        titleEl.classList.remove("is-placeholder");
      }
    })
    .catch(function (err) {
      console.error("[about] Failed to fetch YouTube title:", err);
      var titleEl = document.getElementById("music-video-title");
      if (titleEl) {
        titleEl.textContent = "[ Video title unavailable ]";
      }
    });
}

/**
 * Pulls the video ID out of common YouTube URL formats
 * (watch?v=, youtu.be/, embed/).
 *
 * @param {string} url
 * @returns {string|null}
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;

  var patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /embed\/([^?&#]+)/
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = url.match(patterns[i]);
    if (match && match[1]) return match[1];
  }

  return null;
}