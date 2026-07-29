// ==========================================================
// script.js
// Vanilla JS for the retro homepage.
// Kept minimal for now - structured so it's easy to expand
// with more interactivity later (guestbook, hit counter, etc).
// ==========================================================

document.addEventListener("DOMContentLoaded", function () {
  initNavButtons();
  initVideoFallback();
  initSideWindowButtons();
});

/**
 * Nav buttons are currently visual placeholders only.
 * This just wires up a console log so it's easy to hook
 * real navigation in later without restructuring anything.
 */
function initNavButtons() {
  var buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      console.log("[nav] clicked:", btn.textContent.trim());
      // TODO: hook up real navigation once sub-pages exist.
    });
  });
}

/**
 * Buttons inside the two new side windows (Current Project /
 * Eureka Moments) are visual placeholders for now. Same pattern
 * as initNavButtons() - just log a click so it's easy to swap
 * in real navigation later without restructuring anything.
 */
function initSideWindowButtons() {
  var openProjectBtn = document.getElementById("open-project-btn");
  if (openProjectBtn) {
    openProjectBtn.addEventListener("click", function () {
      // TODO: Connect to Projects endpoint
      console.log("[side-window] Open Project clicked - navigation not yet implemented");
    });
  }

  var archivesBtn = document.getElementById("archives-btn");
  if (archivesBtn) {
    archivesBtn.addEventListener("click", function () {
      window.location.href = "archives.html";
    });
  }
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
