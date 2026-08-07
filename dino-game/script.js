// =========================================================================
// CANVAS SETUP
// =========================================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;   // 750
const CANVAS_HEIGHT = canvas.height; // 500

// The horizon line inside background.png sits ~72% down the image (measured
// from the source art: sky/ground transition at y=732 of 1024). GROUND_Y is
// pinned to that same fraction of the canvas so sprites stand on the
// horizon that's actually painted, not on an arbitrary offset from the
// bottom edge.
const HORIZON_FRACTION = 0.72;
const GROUND_Y = Math.round(CANVAS_HEIGHT * HORIZON_FRACTION);

// =========================================================================
// IMAGE ASSETS
// Loaded once up front and reused every frame by the draw functions below.
// Swapping the sprite/asset here is all that's needed to reskin a shape.
// =========================================================================
const backgroundImg = new Image();
backgroundImg.src = "images/background.png";

// Full-canvas screen art for the welcome/end states. Same 1536x1024 frame
// as background.png (already stretched to CANVAS_WIDTH x CANVAS_HEIGHT
// elsewhere), so these are drawn the same way -- no background stripping,
// they're meant to fill the whole canvas as-is.
const introImg = new Image();
introImg.src = "images/intro.png";
const liveImg = new Image();
liveImg.src = "images/live.png";
const dieImg = new Image();
dieImg.src = "images/die.png";

// None of the sprite source files have real transparency (they were
// exported with a flattened background), and the fill color differs per
// file (near-white for the dino/fall sprites, a blue-gray for stall.jpeg).
// JPEG compression also leaves faint "ringing" halo pixels right at the
// subject's hard edges, which are background-colored but not directly
// touching the border — an edge-in flood fill misses those. So instead:
// sample the border pixels to learn both the background color and how
// much it naturally varies (gradient/compression noise), then key out
// every pixel in the whole image within that same variance, wherever it
// appears. This requires reading pixel data back from the canvas
// (getImageData), which the browser blocks as a cross-origin/tainted read
// when the page is opened via file:// — serve the project over http (e.g.
// `python3 -m http.server`) for this to work.
function stripBackgroundColor(img, marginTolerance = 20) {
  const off = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(img, 0, 0);

  const imageData = offCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Collect every border pixel's color to find the average background
  // color and its spread.
  const borderColors = [];
  let sumR = 0, sumG = 0, sumB = 0;
  function sampleBorder(x, y) {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    borderColors.push(r, g, b);
    sumR += r; sumG += g; sumB += b;
  }
  for (let x = 0; x < w; x++) {
    sampleBorder(x, 0);
    sampleBorder(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    sampleBorder(0, y);
    sampleBorder(w - 1, y);
  }
  const sampleCount = borderColors.length / 3;
  const avgR = sumR / sampleCount;
  const avgG = sumG / sampleCount;
  const avgB = sumB / sampleCount;

  let maxBorderDist = 0;
  for (let i = 0; i < borderColors.length; i += 3) {
    const dr = borderColors[i] - avgR;
    const dg = borderColors[i + 1] - avgG;
    const db = borderColors[i + 2] - avgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist > maxBorderDist) maxBorderDist = dist;
  }
  const tolerance = maxBorderDist + marginTolerance;

  // Key out any pixel close enough to the background color, regardless of
  // where it sits in the image.
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - avgR;
    const dg = data[i + 1] - avgG;
    const db = data[i + 2] - avgB;
    if (dr * dr + dg * dg + db * db <= tolerance * tolerance) {
      data[i + 3] = 0;
    }
  }

  offCtx.putImageData(imageData, 0, 0);
  return off;
}

// The source images are wider/taller than the character or rock actually
// drawn on them (background padding around the subject). Cropping to the
// tight bounding box of the remaining opaque pixels means drawImage()
// stretches only the real subject into the destination box, so e.g. the
// dino's feet land exactly at the bottom edge instead of partway up it.
function trimTransparentMargins(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const cctx = canvas.getContext("2d");
  const { data } = cctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas; // nothing opaque; leave as-is

  const trimmed = document.createElement("canvas");
  trimmed.width = maxX - minX + 1;
  trimmed.height = maxY - minY + 1;
  trimmed.getContext("2d").drawImage(
    canvas,
    minX, minY, trimmed.width, trimmed.height,
    0, 0, trimmed.width, trimmed.height
  );
  return trimmed;
}

// Loads a sprite and swaps it for a background-stripped, trimmed version
// once ready. Returns a getter so draw functions always read the latest
// processed sprite without needing to know whether it has finished
// loading yet.
function loadSprite(src) {
  const img = new Image();
  let sprite = img; // draw the raw image until the processed version is ready
  img.onload = () => {
    sprite = trimTransparentMargins(stripBackgroundColor(img));
  };
  img.src = src;
  return () => sprite;
}

// Dino sprites: standing.png is the idle/airborne pose, forward.jpeg and
// backward.jpeg alternate while grounded to simulate a running motion.
const getDinoStandingSprite = loadSprite("images/standing.png");
const getDinoForwardSprite = loadSprite("images/forward.jpeg");
const getDinoBackwardSprite = loadSprite("images/backward.jpeg");

// Meteor sprites: fall.png for the falling (trajectory) meteor, stall.jpeg
// reused for both the rolling and the stagnant ground meteor.
const getFallMeteorSprite = loadSprite("images/fall.png");
const getStallMeteorSprite = loadSprite("images/stall.jpeg");

// =========================================================================
// PHYSICS CONSTANTS
// =========================================================================
const GRAVITY = 0.6;      // downward acceleration applied every frame
const JUMP_STRENGTH = -13; // initial upward velocity when jumping

// =========================================================================
// PLAYER OBJECT
// Kept as a single object so it's easy to later swap for a sprite,
// add animation frames, or extend with more properties (health, state, etc).
// =========================================================================
const PLAYER_WIDTH = 70;
const PLAYER_HEIGHT = 105; // same 2:3 aspect ratio as before, scaled up

const player = {
  x: 60,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  y: GROUND_Y - PLAYER_HEIGHT,   // standing on the ground initially
  velocityY: 0,
  isJumping: false,
};

// Running animation: alternates the forward/backward leg sprites while the
// dino is grounded, to simulate motion. Purely visual, does not affect
// player.x/y/velocityY or the jump physics above.
const RUN_FRAME_INTERVAL = 6; // frames between each leg swap
let runFrameTimer = 0;
let useForwardLeg = true;

// =========================================================================
// WORLD SCROLLING
// The player stays fixed on screen; the ground/obstacles move left instead
// to create the illusion of running. All obstacle types share this speed.
// =========================================================================
const WORLD_SPEED = 6;         // speed at the start of a run
const MAX_WORLD_SPEED = 16;    // speed reached once the run timer hits 0:60

// =========================================================================
// DIFFICULTY RAMP
// A run lasts 60 seconds. As it progresses, newly spawned meteors get
// faster (linear ramp from WORLD_SPEED to MAX_WORLD_SPEED), and once the
// run enters its final stretch they also spawn more often and with extra
// randomized speed on top of the ramp.
// =========================================================================
const GAME_DURATION_SECONDS = 60;
const GAME_DURATION_FRAMES = GAME_DURATION_SECONDS * 60; // ~60fps
const FINAL_STRETCH_FRACTION = 0.85; // last 15% of the run

let playFrameCount = 0; // frames elapsed in the current PLAYING run

// 0 at the start of the run, 1 once the 60s timer is up.
function getRunProgress() {
  return Math.min(playFrameCount / GAME_DURATION_FRAMES, 1);
}

// Speed for a meteor spawned right now. Ramps up over the run, with extra
// randomness layered on in the final stretch so meteors also feel erratic.
function getCurrentWorldSpeed() {
  const progress = getRunProgress();
  let speed = WORLD_SPEED + (MAX_WORLD_SPEED - WORLD_SPEED) * progress;

  if (progress >= FINAL_STRETCH_FRACTION) {
    speed += Math.random() * (MAX_WORLD_SPEED - WORLD_SPEED) * 0.5;
  }

  return speed;
}

// =========================================================================
// OBSTACLES
// Each obstacle type is a small set of create/update/draw functions that
// share the same object shape ({ type, x, y, radius, ... }). This keeps
// each type isolated so more types can be added later without touching
// the others or the ObstacleManager itself.
// =========================================================================
const METEOR_RADIUS = 18;
const METEOR_SPAWN_X = CANVAS_WIDTH + 50;
const METEOR_TRAIL_LENGTH = 6;

// --- Trajectory Meteor: enters diagonally from the upper-right, falls to
// the ground, then keeps sliding left with the world until it exits. ------

// ORIGINAL trajectory: a fixed vertical speed (4) regardless of horizontal
// speed, which made the fall angle steeper at low world speeds and
// shallower at high world speeds (angle from horizontal = atan(4 / speed)).
// Kept here, commented out, for reference.
// function createTrajectoryMeteor() {
//   return {
//     type: "trajectory",
//     x: METEOR_SPAWN_X,
//     y: -50,
//     radius: METEOR_RADIUS,
//     velocityX: -getCurrentWorldSpeed(),
//     velocityY: 4,
//     rotation: 0,
//     trail: [],
//   };
// }

// NEW trajectory: the vertical speed is derived from the horizontal speed
// and a target fall angle (measured from horizontal), instead of a flat
// number. This gives a flatter/shallower descent -- lowering
// FALL_ANGLE_DEGREES decreases the angle further (more glide, less drop);
// raising it steepens the fall back toward straight down.
const FALL_ANGLE_DEGREES = 40;
function createTrajectoryMeteor() {
  const speed = getCurrentWorldSpeed();
  return {
    type: "trajectory",
    x: METEOR_SPAWN_X,
    y: -50,
    radius: METEOR_RADIUS,
    velocityX: -speed,
    velocityY: speed * Math.tan(FALL_ANGLE_DEGREES * Math.PI / 180),
    rotation: 0,
    trail: [],
  };
}

function updateTrajectoryMeteor(m) {
  m.trail.push({ x: m.x, y: m.y });
  if (m.trail.length > METEOR_TRAIL_LENGTH) {
    m.trail.shift();
  }

  m.x += m.velocityX;
  m.y += m.velocityY;
  m.rotation += 0.05;

  // Stop falling once it reaches the ground; it keeps sliding left.
  const groundLevelY = GROUND_Y - m.radius;
  if (m.y >= groundLevelY) {
    m.y = groundLevelY;
    m.velocityY = 0;
  }
}

function drawTrajectoryMeteor(m) {
  // Fading motion trail, opposite the direction of travel.
  for (let i = 0; i < m.trail.length; i++) {
    const point = m.trail[i];
    const progress = i / m.trail.length; // 0 (oldest) -> 1 (newest)
    ctx.beginPath();
    ctx.arc(point.x, point.y, m.radius * (0.4 + progress * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120, 120, 120, ${progress * 0.3})`;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rotation);

  // Draw the falling-meteor sprite centered on the rotated origin.
  const size = m.radius * 2;
  ctx.drawImage(getFallMeteorSprite(), -m.radius, -m.radius, size, size);

  ctx.restore();
}

// --- Rolling Meteor: rolls along the ground, spinning as it scrolls. -----
const ROLLING_METEOR_RADIUS = 16;

function createRollingMeteor() {
  return {
    type: "rolling",
    x: METEOR_SPAWN_X,
    y: GROUND_Y - ROLLING_METEOR_RADIUS,
    radius: ROLLING_METEOR_RADIUS,
    velocityX: -getCurrentWorldSpeed(),
    rotation: 0,
  };
}

function updateRollingMeteor(m) {
  m.x += m.velocityX;
  // Rotation speed matches how far it has rolled, like a wheel.
  m.rotation += Math.abs(m.velocityX) / m.radius;
}

function drawRollingMeteor(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rotation);

  // Draw the stall sprite centered on the rotated origin; the same
  // rotation logic above (m.rotation) makes it visibly spin as it rolls.
  const size = m.radius * 2;
  ctx.drawImage(getStallMeteorSprite(), -m.radius, -m.radius, size, size);

  ctx.restore();
}

// --- Ground Meteor: a stationary rock that scrolls toward the player. ----
const GROUND_METEOR_RADIUS = 20;

function createGroundMeteor() {
  return {
    type: "ground",
    x: METEOR_SPAWN_X,
    y: GROUND_Y - GROUND_METEOR_RADIUS,
    radius: GROUND_METEOR_RADIUS,
    velocityX: -getCurrentWorldSpeed(),
  };
}

function updateGroundMeteor(m) {
  m.x += m.velocityX;
}

function drawGroundMeteor(m) {
  // Stationary sprite, no rotation applied.
  const size = m.radius * 2;
  ctx.drawImage(getStallMeteorSprite(), m.x - m.radius, m.y - m.radius, size, size);
}

// --- Dispatch tables so the manager can treat every obstacle the same. ---
const OBSTACLE_FACTORIES = {
  trajectory: createTrajectoryMeteor,
  rolling: createRollingMeteor,
  ground: createGroundMeteor,
};

const OBSTACLE_UPDATERS = {
  trajectory: updateTrajectoryMeteor,
  rolling: updateRollingMeteor,
  ground: updateGroundMeteor,
};

const OBSTACLE_DRAWERS = {
  trajectory: drawTrajectoryMeteor,
  rolling: drawRollingMeteor,
  ground: drawGroundMeteor,
};

const OBSTACLE_TYPES = Object.keys(OBSTACLE_FACTORIES);

// =========================================================================
// OBSTACLE MANAGER
// Spawns exactly one obstacle at a time at random intervals, chosen
// randomly from the available obstacle types. The game loop only talks to
// this manager, never to individual obstacles.
// =========================================================================
const MIN_SPAWN_DELAY = 25;  // frames (~0.4s at 60fps)
const MAX_SPAWN_DELAY = 70;  // frames (~1.2s at 60fps)

function randomSpawnDelay() {
  let minDelay = MIN_SPAWN_DELAY;
  let maxDelay = MAX_SPAWN_DELAY;

  // Final stretch: obstacles arrive more often as well as faster.
  if (getRunProgress() >= FINAL_STRETCH_FRACTION) {
    minDelay = MIN_SPAWN_DELAY * 0.4;
    maxDelay = MAX_SPAWN_DELAY * 0.6;
  }

  return minDelay + Math.random() * (maxDelay - minDelay);
}

const ObstacleManager = {
  current: null,
  timer: 0,
  nextSpawnDelay: randomSpawnDelay(),

  spawnRandom() {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    this.current = OBSTACLE_FACTORIES[type]();
  },

  isOffScreen(obstacle) {
    return obstacle.x + obstacle.radius < 0;
  },

  update() {
    if (!this.current) {
      this.timer++;
      if (this.timer >= this.nextSpawnDelay) {
        this.spawnRandom();
        this.timer = 0;
      }
      return;
    }

    OBSTACLE_UPDATERS[this.current.type](this.current);

    if (this.isOffScreen(this.current)) {
      this.current = null;
      this.nextSpawnDelay = randomSpawnDelay();
    }
  },

  draw() {
    if (this.current) {
      OBSTACLE_DRAWERS[this.current.type](this.current);
    }
  },
};

// =========================================================================
// GAME STATE
// The game moves through three screens; only one is active at a time.
// WELCOME - shown before the run starts (blank placeholder for now).
// PLAYING - the gameplay screen, unchanged from before.
// END     - shown once the run is over. A win plays the parachute rise
//           animation; a loss stays a blank screen.
// =========================================================================
const GameState = {
  WELCOME: "welcome",
  PLAYING: "playing",
  END: "end",
};

let gameState = GameState.WELCOME;
let runOutcome = null; // "win" | "lose", set when entering GameState.END

// Resets the player/obstacles and enters the gameplay screen.
function startGame() {
  player.y = GROUND_Y - PLAYER_HEIGHT;
  player.velocityY = 0;
  player.isJumping = false;
  runFrameTimer = 0;
  useForwardLeg = true;
  playFrameCount = 0;
  runOutcome = null;

  ObstacleManager.current = null;
  ObstacleManager.timer = 0;
  ObstacleManager.nextSpawnDelay = randomSpawnDelay();

  gameState = GameState.PLAYING;
}

// =========================================================================
// WIN ANIMATION (parachute)
// Once the player survives the full 60 seconds, the dino sprite is
// replaced with the parachute image, which rises frame by frame and
// drifts off the top of the canvas until it's fully out of view.
// parachute.jpeg's background is a blurred gradient close in color to the
// parachute itself, so unlike the other sprites it isn't background-
// stripped -- it's drawn as the full image.
// =========================================================================
const parachuteImg = new Image();
parachuteImg.src = "images/parachute.jpeg";

const PARACHUTE_WIDTH = 300;
const PARACHUTE_HEIGHT = Math.round(PARACHUTE_WIDTH * (1024 / 1536)); // source aspect ratio
const PARACHUTE_RISE_SPEED = 2; // pixels moved up per frame

let parachuteX = 0;
let parachuteY = 0;

// Positions the parachute where the dino was standing. Called once when
// the win screen is entered.
function startParachuteAnimation() {
  parachuteX = player.x + player.width / 2 - PARACHUTE_WIDTH / 2;
  parachuteY = GROUND_Y - PARACHUTE_HEIGHT;
}

function updateParachuteAnimation() {
  parachuteY -= PARACHUTE_RISE_SPEED;
}

function drawParachuteAnimation() {
  // Once fully above the canvas it has vanished -- nothing left to draw.
  if (parachuteY + PARACHUTE_HEIGHT < 0) return;
  ctx.drawImage(parachuteImg, parachuteX, parachuteY, PARACHUTE_WIDTH, PARACHUTE_HEIGHT);
}

// =========================================================================
// COLLISION DETECTION
// Circle-vs-rectangle test: finds the closest point on the player's
// rectangle to the obstacle's center and checks if it's within the radius.
// =========================================================================
function isCollidingWithPlayer(obstacle) {
  const closestX = Math.max(player.x, Math.min(obstacle.x, player.x + player.width));
  const closestY = Math.max(player.y, Math.min(obstacle.y, player.y + player.height));

  const dx = obstacle.x - closestX;
  const dy = obstacle.y - closestY;

  return dx * dx + dy * dy < obstacle.radius * obstacle.radius;
}

// Checks the current obstacle (if any) against the player and moves to the
// end screen on contact.
function checkCollisions() {
  if (ObstacleManager.current && isCollidingWithPlayer(ObstacleManager.current)) {
    runOutcome = "lose";
    gameState = GameState.END;
  }
}

// =========================================================================
// INPUT HANDLING
// =========================================================================
const keys = {
  space: false,
};

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    keys.space = true;
    if (gameState === GameState.WELCOME) {
      startGame();
    } else if (gameState === GameState.END) {
      if (isEndScreenSettled()) startGame();
    } else {
      tryJump();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    keys.space = false;
  }
});

// Starts a jump only if the player is currently standing on the ground.
// This prevents double jumping / mid-air jumping.
function tryJump() {
  if (gameState !== GameState.PLAYING) return;
  if (!player.isJumping) {
    player.velocityY = JUMP_STRENGTH;
    player.isJumping = true;
  }
}

// =========================================================================
// UPDATE (PHYSICS)
// Applies gravity, updates position, and clamps the player to the ground.
// This is the place to later add obstacle movement, collision checks, etc.
// =========================================================================
function update() {
  // Apply gravity to vertical velocity.
  player.velocityY += GRAVITY;

  // Apply vertical velocity to position.
  player.y += player.velocityY;

  // Ground collision: player must never sink below the ground.
  const groundLevelY = GROUND_Y - player.height;
  if (player.y >= groundLevelY) {
    player.y = groundLevelY;
    player.velocityY = 0;
    player.isJumping = false;
  }

  // Advance the running animation only while grounded; airborne frames
  // just hold the standing sprite (handled in drawPlayer).
  if (!player.isJumping) {
    runFrameTimer++;
    if (runFrameTimer >= RUN_FRAME_INTERVAL) {
      runFrameTimer = 0;
      useForwardLeg = !useForwardLeg;
    }
  }
}

// =========================================================================
// DRAWING
// =========================================================================

// Draws the player as its current sprite: standing while airborne, and
// alternating forward/backward leg poses while grounded to simulate running.
// The ground is whatever background.png already paints at GROUND_Y — no
// separate ground line is drawn.
function drawPlayer() {
  const sprite = player.isJumping
    ? getDinoStandingSprite()
    : (useForwardLeg ? getDinoForwardSprite() : getDinoBackwardSprite());
  ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
}

// Clears the entire canvas before each frame is drawn.
function clearCanvas() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Draws the background image across the whole canvas, replacing the plain
// canvas background color.
function drawBackground() {
  ctx.drawImage(backgroundImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Shared look for all on-canvas text: a blocky, spaced-out monospace
// treatment (bold + letter-spacing) approximating a Y2K arcade pixel font,
// in a mustard/dijon color. Caller sets textAlign/textBaseline/position.
function applyRetroTextStyle(fontSizePx) {
  ctx.font = `bold ${fontSizePx}px 'Courier New', monospace`;
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "2px";
  }
  ctx.fillStyle = "#C9962B"; // mustard/dijon
}

// Formats the seconds remaining in the current run as MM:SS. Uses floor
// (not ceil/round) so the display starts one second below the configured
// duration -- e.g. a 60s run starts at 00:59, a 10s run starts at 00:09 --
// and scales automatically with whatever GAME_DURATION_SECONDS is set to.
function formatTimeRemaining() {
  const framesRemaining = Math.max(GAME_DURATION_FRAMES - playFrameCount, 0);
  const secondsRemaining = Math.floor(framesRemaining / 60);
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Countdown timer for the gameplay screen: bottom-right corner, inside the
// green ground band.
function drawTimer() {
  ctx.save();
  applyRetroTextStyle(20);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(formatTimeRemaining(), CANVAS_WIDTH - 16, CANVAS_HEIGHT - 14);
  ctx.restore();
}

// Draws a prompt line near the bottom of the canvas, to sit on top of any
// of the three screen images.
function drawPromptText(text) {
  ctx.save();
  applyRetroTextStyle(22);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14);
  ctx.restore();
}

// Welcome screen: the intro art with a "press space to begin" prompt near
// the bottom of the canvas.
function drawWelcomeScreen() {
  ctx.drawImage(introImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPromptText("Press space to begin");
}

// True once the end screen has settled on its final art -- immediately on
// a loss, or once the win's parachute has fully risen off-canvas.
function isEndScreenSettled() {
  if (runOutcome === "lose") return true;
  if (runOutcome === "win") return parachuteY + PARACHUTE_HEIGHT < 0;
  return false;
}

// Screen shown once the run ends. A win plays the parachute rise animation
// over the background first, then settles on the live.png "saved" card; a
// loss goes straight to the die.png card. Both cards get a "press space to
// play again" prompt once settled.
function drawEndScreen() {
  if (runOutcome === "win" && !isEndScreenSettled()) {
    clearCanvas();
    drawBackground();
    updateParachuteAnimation();
    drawParachuteAnimation();
    return;
  }

  if (runOutcome === "win") {
    ctx.drawImage(liveImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (runOutcome === "lose") {
    ctx.drawImage(dieImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  drawPromptText("Press space to play again");
}

// =========================================================================
// GAME LOOP
// Dispatches update/draw by the current screen. Only PLAYING runs physics,
// obstacles, and collision checks; WELCOME and END are static screens.
// =========================================================================
function gameLoop() {
  switch (gameState) {
    case GameState.WELCOME:
      drawWelcomeScreen();
      break;

    case GameState.PLAYING:
      playFrameCount++;
      if (playFrameCount >= GAME_DURATION_FRAMES) {
        runOutcome = "win"; // survived the full 60 seconds
        startParachuteAnimation();
        gameState = GameState.END;
        break;
      }

      update();
      ObstacleManager.update();
      checkCollisions();

      clearCanvas();
      drawBackground();
      drawPlayer();
      ObstacleManager.draw();
      drawTimer();
      break;

    case GameState.END:
      drawEndScreen();
      break;
  }

  requestAnimationFrame(gameLoop);
}

// Kick off the game.
requestAnimationFrame(gameLoop);
