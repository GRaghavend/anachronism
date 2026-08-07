// ==========================================================
// script.js
// Used in: index.html only.
// Vanilla JS for the retro homepage.
// Kept minimal for now - structured so it's easy to expand
// with more interactivity later (guestbook, hit counter, etc).
// ==========================================================

document.addEventListener("DOMContentLoaded", function () {
  initNavButtons();
  initVideoFallback();
  initSideWindowButtons();
  initHomeNav();
  initEmailCopy();
  initCurrentProjectWidget();
  initArcadeNav();
  initArcadeNotice();
});

/**
 * Nav buttons are currently visual placeholders only.
 * This just wires up a console log so it's easy to hook
 * real navigation in later without restructuring anything.
 */
function initNavButtons() {
  var buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach(function (btn) {
    // The About Me, Home, Projects and Arcade buttons are wired up
    // separately (in about.js / this file / project.js) with real
    // behavior - skip the placeholder logger here so they aren't
    // double-handled.
    if (
      btn.id === "about-nav-btn" ||
      btn.id === "home-nav-btn" ||
      btn.id === "projects-nav-btn" ||
      btn.id === "arcade-nav-btn"
    ) return;

    btn.addEventListener("click", function () {
      console.log("[nav] clicked:", btn.textContent.trim());
      // TODO: hook up real navigation once sub-pages exist.
    });
  });
}

/**
 * Wires the Arcade nav button to build a fourth Win98 window
 * (dino.exe) into #dino-box-container, below the existing three
 * boxes (save.txt, current_project.exe, discoveries.log), and
 * embed the DINO game (dino-game/index.html) in it via
 * iframe. The game's own script.js listens for the Space key on
 * its own window, so it jumps as soon as the iframe has focus.
 * Clicking the generated window's close button removes it again,
 * leaving the original three boxes.
 *
 * #dino-box-container only exists while the Home content is
 * loaded - about.js/project.js replace #main-content-area's
 * contents (container included) when About Me/Projects load - so
 * the container is looked up fresh on every click rather than
 * cached, and a missing container means "not on the Home page",
 * which shows the arcade notice popup instead.
 */
function initArcadeNav() {
  var arcadeBtn = document.getElementById("arcade-nav-btn");
  if (!arcadeBtn) return;

  arcadeBtn.addEventListener("click", function () {
    var container = document.getElementById("dino-box-container");
    if (!container) {
      showArcadeNotice();
      return;
    }

    // Already open - just bring it back into view instead of
    // rebuilding (rebuilding would restart the game).
    var existing = document.getElementById("dino-game-window");
    if (existing) {
      existing.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    container.innerHTML = buildDinoGameWindow();
    container.scrollIntoView({ behavior: "smooth", block: "center" });

    var closeBtn = document.getElementById("dino-game-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        container.innerHTML = "";
      });
    }

    var iframe = container.querySelector(".dino-game-iframe");
    if (iframe) {
      iframe.addEventListener("load", function () {
        iframe.contentWindow.focus();
      });
    }
  });
}

/**
 * Returns the markup for the dynamically-inserted "dino.exe"
 * window: same content-panel/panel-titlebar chrome as the site's
 * other windows, but with a green titlebar (.dino-panel-titlebar)
 * instead of the usual blue, so it reads as visually distinct.
 *
 * @returns {string}
 */
function buildDinoGameWindow() {
  return (
    '<div class="content-panel side-window dino-game-window" id="dino-game-window">' +
      '<div class="panel-titlebar dino-panel-titlebar">' +
        '<span class="panel-titlebar-text">dino.exe</span>' +
        '<span class="panel-titlebar-btns">' +
          '<span class="tb-btn">-</span><span class="tb-btn">□</span>' +
          '<button type="button" class="tb-btn-close" id="dino-game-close" aria-label="Close">✕</button>' +
        "</span>" +
      "</div>" +
      '<div class="panel-body dino-game-body">' +
        '<iframe src="dino-game/index.html" class="dino-game-iframe" ' +
          'title="Dino game" width="750" height="500" scrolling="no"></iframe>' +
      "</div>" +
    "</div>"
  );
}

/**
 * Wires the arcade notice popup's close interactions: the OK
 * button, the titlebar close button, and a click on its backdrop
 * all close it. Exposes showArcadeNotice() on window so
 * initArcadeNav() can open it when Arcade is clicked outside Home.
 */
function initArcadeNotice() {
  var backdrop = document.getElementById("arcade-notice-backdrop");
  var okBtn = document.getElementById("arcade-notice-ok");
  var closeBtn = document.getElementById("arcade-notice-close");
  if (!backdrop || !okBtn || !closeBtn) return;

  okBtn.addEventListener("click", closeArcadeNotice);
  closeBtn.addEventListener("click", closeArcadeNotice);

  backdrop.addEventListener("click", function (event) {
    if (event.target === backdrop) closeArcadeNotice();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !backdrop.hidden) closeArcadeNotice();
  });
}

function showArcadeNotice() {
  var backdrop = document.getElementById("arcade-notice-backdrop");
  if (backdrop) backdrop.hidden = false;
}

function closeArcadeNotice() {
  var backdrop = document.getElementById("arcade-notice-backdrop");
  if (backdrop) backdrop.hidden = true;
}

/**
 * Buttons inside the two new side windows (Current Project /
 * Eureka Moments) are visual placeholders for now. Same pattern
 * as initNavButtons() - just log a click so it's easy to swap
 * in real navigation later without restructuring anything.
 */
function initSideWindowButtons() {
  // Open Project button: wired up in initCurrentProjectWidget() once the
  // current project's real GitHub link has been loaded from
  // contents/projs.md, instead of being bound here as a placeholder.

  var archivesBtn = document.getElementById("archives-btn");
  if (archivesBtn) {
    archivesBtn.addEventListener("click", function () {
      window.location.href = "archives.html";
    });
  }
}

// To navigate to home button function
function initHomeNav() {
    var homeBtn = document.getElementById("home-nav-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", function () {
        window.location.href = "index.html";
      });
    }
  }

// Same Markdown file the Projects page reads from - kept as its
// own constant here since this file loads/populates the homepage
// widget independently of project.js.
var CURRENT_PROJECT_MD_PATH = "contents/projs.md";

/**
 * Populates the homepage "Current Project" window (title,
 * summary, and the "Open Project" button's link) with whichever
 * project in contents/projs.md is flagged "-curr". Relies on
 * parseProjectSections(), defined in project.js, which already
 * excludes flag lines (-curr, -research, -corporate, etc.) from
 * the parsed summary text.
 */
function initCurrentProjectWidget() {
  var titleEl = document.getElementById("current-project-title");
  var descEl = document.getElementById("current-project-desc");
  var btnEl = document.getElementById("open-project-btn");

  if (!titleEl || !descEl || !btnEl) return;
  if (typeof parseProjectSections !== "function") return;

  fetch(CURRENT_PROJECT_MD_PATH)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + CURRENT_PROJECT_MD_PATH);
      }
      return response.text();
    })
    .then(function (mdText) {
      var projects = parseProjectSections(mdText);
      var current = projects.filter(function (p) {
        return p.isCurrent;
      })[0];

      if (!current) return;

      titleEl.textContent = current.title;
      descEl.textContent = current.summary;

      if (current.link) {
        btnEl.addEventListener("click", function () {
          window.open(current.link, "_blank", "noopener,noreferrer");
        });
      }
    })
    .catch(function (err) {
      console.error("[home] Failed to load current project:", err);
    });
}

/**
 * If the intro video fails to load (e.g. assets/intro.mp4
 * hasn't been added yet), swap in a simple placeholder
 * message inside the video frame instead of a broken box.
 */
function initVideoFallback() {
  var video = document.querySelector(".intro-video");
  if (!video) return;

  video.addEventListener("error", function () {
    var frame = video.closest(".video-frame");
    if (!frame) return;

    frame.innerHTML =
      '<div style="color:#ffffff;font-size:10px;padding:10px;">' +
      "[ video not found ]" +
      "</div>";
  });
}

// PLACEHOLDER: paste your email address below
var CONTACT_EMAIL = "rosypack2026@gmail.com";

/**
 * Wires the Email footer icon to copy CONTACT_EMAIL to the
 * clipboard and show a brief retro-style "Email copied!" toast.
 */
function initEmailCopy() {
  var emailBtn = document.getElementById("email-social-btn");
  var toast = document.getElementById("email-toast");
  if (!emailBtn) return;

  emailBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(function () {
      showEmailToast();
    }).catch(function (err) {
      console.error("[footer] Failed to copy email:", err);
    });
  });

  function showEmailToast() {
    if (!toast) return;
    toast.classList.add("is-visible");
    setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2000);
  }
}