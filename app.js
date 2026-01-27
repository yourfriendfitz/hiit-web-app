const VERSION = "3.0.1"; // App version - UI Refactor with Tailwind
const dbName = `hiit-app-db`;
const weightStore = "Weights";
const prodHostName = "yourfriendfitz.github.io";
const startDate = new Date("2025-07-28T00:00:00-05:00"); // Central Daylight Time (CDT)

let dbInstance = null; // Cached database instance
let currentPath = null; // Track the current path for navigation
let lastUpdateCheck = 0;

// IndexedDB initialization
function initDB() {
  if (dbInstance) {
    console.log("Reusing existing IndexedDB connection.");
    return Promise.resolve(dbInstance);
  }
  console.log("Initializing IndexedDB...");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      console.log("Upgrading IndexedDB...");
      const db = event.target.result;
      if (!db.objectStoreNames.contains(weightStore)) {
        const store = db.createObjectStore(weightStore, {
          autoIncrement: true,
        });
        store.createIndex("id", "id", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("weight", "weight", { unique: false });
      }
    };
    request.onsuccess = (event) => {
      console.log("IndexedDB initialized successfully");
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject("Failed to initialize IndexedDB.");
    request.onblocked = () => reject("IndexedDB initialization blocked.");
  });
}

// Save the entered weight to IndexedDB
// eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars
async function saveWeight(exerciseId) {
  const input = document.getElementById(`weight-${exerciseId}`);
  const weight = input.value;

  if (weight) {
    // Extract sets, reps, and RPE from the exercise template
    const sets = document.getElementById(`sets-${exerciseId}`).dataset.info;
    const reps = document.getElementById(`reps-${exerciseId}`).dataset.info;
    const earlyRpe = document.getElementById(`early-rpe-${exerciseId}`).dataset.info;
    const lastRpe = document.getElementById(`last-rpe-${exerciseId}`).dataset.info;

    console.log({ sets, reps, earlyRpe, lastRpe }); // Debug log
    // Append the additional details to the weight
    const weightWithDetails = `${weight} [Sets: ${sets}, Reps: ${reps}, Early RPE: ${earlyRpe}, Last RPE: ${lastRpe}]`;

    await storeWeight(exerciseId, weightWithDetails);

    // Show toast notification
    Toastify({
      text: "✓ Weight saved!",
      duration: 2500,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      className: "toastify",
    }).showToast();

    input.value = ""; // Clear input after saving
    window.dispatchEvent(new Event("dbUpdated")); // Trigger the event
  }
}

async function storeWeight(id, weight) {
  console.log(`Storing weight for exercise ID ${id}: ${weight}`); // Debug log
  const db = dbInstance || (await initDB());
  const tx = db.transaction(weightStore, "readwrite");
  tx.objectStore(weightStore).put({ id, weight, date: new Date() });

  // Ensure the event is dispatched after the transaction is complete
  return await new Promise((resolve) => {
    tx.oncomplete = () => {
      console.log("Weight stored successfully."); // Debug log
      window.dispatchEvent(new Event("dbUpdated"));
      resolve();
    };

    tx.onerror = (error) => {
      console.error("Failed to store weight:", error);
      resolve();
    };
  });
}

async function getWeight(id) {
  const db = dbInstance || (await initDB());
  const tx = db.transaction(weightStore, "readonly");
  const store = tx.objectStore(weightStore);
  const index = store.index("id");
  const request = index.openCursor(IDBKeyRange.only(id));
  return new Promise((resolve) => {
    let mostRecentEntry = null;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (
          !mostRecentEntry ||
          new Date(cursor.value.date) > new Date(mostRecentEntry.date)
        ) {
          mostRecentEntry = cursor.value;
        }
        cursor.continue();
      } else {
        resolve(mostRecentEntry ? mostRecentEntry.weight : "");
      }
    };
    request.onerror = () => {
      console.error(`Request failed for id: ${id}`);
      resolve("");
    };
  });
}

async function loadContent(path = window.location.hash.slice(1) || "/") {
  if (path === currentPath) return; // Prevent duplicate loads
  currentPath = path;

  const appContent = document.getElementById("appContent");
  const header = document.getElementById("header");
  const loader = document.getElementById("loader");

  // Show the loader before loading the content
  appContent.hidden = true;
  header.hidden = true;
  loader.hidden = false;

  if (path.startsWith("/workout")) {
    updateHeaderComponent("workout");
    await loadWorkoutPage();
  } else if (path === "/directory") {
    updateHeaderComponent("directory");
    await loadDirectory();
  } else if (path === "/history") {
    updateHeaderComponent("history");
    loadViewHistoryPage();
  } else if (path === "/") {
    updateHeaderComponent("home");
    await loadWorkout();
  } else {
    appContent.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16">
        <span class="text-6xl mb-4">🔍</span>
        <h1 class="text-2xl font-bold text-zinc-100">Page Not Found</h1>
        <p class="text-zinc-400 mt-2">The page you're looking for doesn't exist.</p>
        <a href="#/" class="mt-6 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors">
          Go Home
        </a>
      </div>
    `;
  }
  setTimeout(async () => {
    // Hide the loader once the content is loaded
    loader.hidden = true;
    header.hidden = false;
    appContent.hidden = false;

    checkForUpdates(); // Check for service worker updates
  }, 200); // Optional small delay for smooth transition
}

function checkForUpdates() {
  const now = Date.now();
  if (now - lastUpdateCheck < 20000) {
    return; // Prevent running more than 3 times a min
  }
  lastUpdateCheck = now;
  if (triggerUpdateCache) {
    console.log("Triggering service worker update check...");
    triggerUpdateCache();
  }
}

// Function to load the view-history page
function loadViewHistoryPage() {
  document.getElementById("appContent").innerHTML = `
    <view-history></view-history>
  `;
}

// Handle SPA navigation properly
window.onhashchange = async () => {
  await loadContent();
};

// Ensure internal links use SPA navigation
document.addEventListener("click", async (event) => {
  const target = event.target.closest("a[data-link]");
  if (target) {
    event.preventDefault();
    const path = new URL(target.href).hash.slice(1); // Extract hash path
    await navigateTo(path); // Navigate using hash
  }
});

// Render the workout or directory content
async function renderExercises(exercises, exerciseMap) {
  const workoutList = document.getElementById("appContent");

  // Build the entire HTML content as a string
  let htmlContent = exercises.map(async (exercise, index) => {
    const exerciseDetails = exerciseMap[exercise.id] || {};
    const latestWeight = await getWeight(exercise.id); // Fetch latest weight

    return `
      <div class="exercise-card mb-4 bg-surface rounded-2xl border border-zinc-800 overflow-hidden card-glow transition-all duration-300 hover:border-primary/30">
        <button 
          onclick="toggleAccordion('${exercise.id}')"
          class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-light/50 transition-colors group"
          aria-expanded="false"
          aria-controls="content-${exercise.id}"
        >
          <div class="flex items-center gap-3">
            <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
              ${index + 1}
            </span>
            <span class="font-semibold text-zinc-100 group-hover:text-primary transition-colors">
              ${exerciseDetails.name || "Unnamed Exercise"}
            </span>
          </div>
          <svg class="w-5 h-5 text-zinc-400 transform transition-transform duration-200 accordion-icon-${exercise.id}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="content-${exercise.id}" class="accordion-content">
          <div class="px-5 pb-5 pt-2 border-t border-zinc-800/50">
            ${exerciseTemplate(exercise, exerciseDetails, latestWeight)}
          </div>
        </div>
      </div>
    `;
  });

  // Resolve all promises in the array using Promise.all
  const resolvedHTML = await Promise.all(htmlContent);

  // Set the innerHTML once with the complete HTML
  workoutList.innerHTML = `<div class="space-y-4">${resolvedHTML.join("")}</div>`;
}

// Toggle accordion
window.toggleAccordion = function(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.querySelector(`.accordion-icon-${id}`);
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    content.classList.remove('open');
    icon.classList.remove('rotate-180');
  } else {
    content.classList.add('open');
    icon.classList.add('rotate-180');
  }
}

// Load the workout list or specific workout details
async function loadWorkoutPage() {
  const { week, day } = getQueryParams();
  console.log(`Query Params - Week: ${week}, Day: ${day}`); // Debug log

  const [data, exercises] = await fetchData();
  console.log({ data, exercises }); // Debug log
  const exerciseMap = mapExercisesById(exercises);

  if (!data[week] || !data[week][day]) {
    console.error(`Invalid week or day: week=${week}, day=${day}`);
    document.getElementById("appContent").innerHTML = `
      <div class="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
        <span class="text-4xl mb-3 block">⚠️</span>
        <p class="text-danger font-medium">Workout not found for Week ${week + 1}, Day ${day + 1}.</p>
        <a href="#/directory" class="inline-block mt-4 px-5 py-2.5 bg-surface hover:bg-surface-light text-zinc-100 font-medium rounded-xl transition-colors">
          Browse Directory
        </a>
      </div>`;
    return;
  }

  const workout = data[week][day];
  updateHeaderContent(week, day + 1, workout.name);

  const appContent = document.getElementById("appContent");
  appContent.innerHTML = `<div id="workoutList"></div>`;
  console.log("Rendering exercises...");
  renderExercises(workout.exercises, exerciseMap);
}

// Load directory and add link handlers
async function loadDirectory() {
  const data = await fetch("data.json").then((res) => res.json());
  const directoryList = document.getElementById("appContent");

  directoryList.innerHTML = data
    .map((week, index) => {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + index * 7);

      return `
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-zinc-100">Week ${index + 1}</h2>
              <p class="text-sm text-zinc-500">${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          <div class="space-y-2">
            ${week
              .map((workout, dayIndex) => {
                const workoutDate = new Date(weekStartDate);
                workoutDate.setDate(weekStartDate.getDate() + dayIndex);
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                return `
                  <a href="#/workout?week=${index}&day=${dayIndex}" 
                    class="group flex items-center gap-4 p-4 bg-surface hover:bg-surface-light border border-zinc-800 hover:border-primary/30 rounded-xl transition-all" 
                    data-link>
                    <div class="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center rounded-lg bg-surface-light group-hover:bg-primary/10 transition-colors">
                      <span class="text-xs font-medium text-zinc-400 group-hover:text-primary">${dayNames[dayIndex] || 'Day'}</span>
                      <span class="text-lg font-bold text-zinc-100 group-hover:text-primary">${workoutDate.getDate()}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-zinc-100 group-hover:text-primary transition-colors truncate">
                        ${workout.name}
                      </p>
                      <p class="text-sm text-zinc-500">
                        ${workout.exercises?.length || 0} exercises
                      </p>
                    </div>
                    <svg class="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </a>
                `;
              })
              .join("")}
          </div>
        </div>`;
    })
    .join("");

  addLinkHandlers(); // Ensure SPA links work correctly
}

// Ensure new links are handled after directory load
function addLinkHandlers() {
  const links = document.querySelectorAll("a[data-link]");
  links.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const path = new URL(link.href).pathname + window.location.search;
      await navigateTo(path);
    });
  });
}

async function navigateTo(path) {
  console.log(`Navigating to: ${path}`); // Debug log

  window.location.hash = path; // Use hash-based routing
  await loadContent(path); // Load content based on the new hash path
}

// Utility functions for fetching data and query parameters
async function fetchData() {
  const dataResponse = fetch("data.json");
  const exercisesResponse = fetch("exercises.json");
  return Promise.all(
    [dataResponse, exercisesResponse].map((r) => r.then((res) => res.json()))
  );
}

function getWorkoutForToday(data, currentWeek) {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let scheduleDay = null;

  if (dayIndex === 1) {
    // Monday
    scheduleDay = 1;
  } else if (dayIndex === 2) {
    // Tuesday
    scheduleDay = 2;
  } else if (dayIndex === 3) {
    // Wednesday
    scheduleDay = 3;
  } else if (dayIndex === 4) {
    // Thursday
    scheduleDay = 4;
  } else if (dayIndex === 5) {
    // Friday
    scheduleDay = 5;
  } else {
    return null; // Off day for Saturday and Sunday
  }

  // Each week now has 5 workouts, so we use scheduleDay - 1 as the index
  return {
    workout: data[currentWeek][scheduleDay - 1],
    workoutDay: scheduleDay,
  };
}

function exerciseTemplate(exercise, exerciseDetails) {
  const { videoId, timestamp } = extractYouTubeVideoId(
    exerciseDetails.link || ""
  );

  const numberOfSets = parseInt(exercise.workingSets, 10);
  const workingSetsCheckboxes = Array.from(
    { length: numberOfSets },
    (_, index) => `
      <label class="flex items-center gap-3 p-3 bg-surface-light/50 rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
        <input type="checkbox" id="set-${exercise.id}-${index}" 
          class="w-5 h-5 rounded border-zinc-600 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2" />
        <span class="text-zinc-300">Set ${index + 1}</span>
      </label>`
  ).join("");

  return `
    <div class="space-y-4">
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide">Warmup Sets</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.warmupSets}</p>
        </div>
        <div id="sets-${exercise.id}" data-info="${exercise.workingSets}" class="p-3 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide">Working Sets</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.workingSets}</p>
        </div>
        <div id="reps-${exercise.id}" data-info="${exercise.repsOrDuration}" class="p-3 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide">Reps/Duration</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.repsOrDuration}</p>
        </div>
        <div class="p-3 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide">Rest</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.rest}</p>
        </div>
      </div>

      <!-- RPE Section -->
      <div class="flex gap-3">
        <div id="early-rpe-${exercise.id}" data-info="${exercise.earlyRpe}" class="flex-1 p-3 bg-accent/5 border border-accent/20 rounded-xl">
          <p class="text-xs text-accent uppercase tracking-wide">Early Set RPE</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.earlyRpe || "N/A"}</p>
        </div>
        <div id="last-rpe-${exercise.id}" data-info="${exercise.lastRpe}" class="flex-1 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <p class="text-xs text-primary uppercase tracking-wide">Last Set RPE</p>
          <p class="text-lg font-semibold text-zinc-100">${exercise.lastRpe || "N/A"}</p>
        </div>
      </div>

      <!-- Last Set Technique -->
      ${exercise.lastSetTech && exercise.lastSetTech !== "N/A" ? `
        <div class="p-3 bg-warning/5 border border-warning/20 rounded-xl">
          <p class="text-xs text-warning uppercase tracking-wide">Last-Set Intensity Technique</p>
          <p class="text-sm font-medium text-zinc-100 mt-1">${exercise.lastSetTech}</p>
        </div>
      ` : ""}

      <!-- Notes -->
      ${exercise.notes ? `
        <div class="p-4 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide mb-2">Notes</p>
          <p class="text-sm text-zinc-300 leading-relaxed">${exercise.notes}</p>
        </div>
      ` : ""}

      <!-- Video -->
      ${videoId ? `
        <div class="video-container">
          <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?start=${timestamp || 0}" 
            frameborder="0" 
            allowfullscreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            loading="lazy">
          </iframe>
        </div>
      ` : ""}

      <!-- Substitutions -->
      ${exerciseDetails.subs ? `
        <div class="p-3 bg-surface-light/30 rounded-xl">
          <p class="text-xs text-zinc-500 uppercase tracking-wide mb-1">Substitutions</p>
          <p class="text-sm text-zinc-400">${exerciseDetails.subs}</p>
        </div>
      ` : ""}

      <!-- Set Tracking -->
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-3">Track Your Sets</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${workingSetsCheckboxes}
        </div>
      </div>

      <!-- Weight Input -->
      <div class="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-zinc-100">Log Weight</p>
          <last-weight exercise-id="${exercise.id}"></last-weight>
        </div>
        <div class="flex gap-2">
          <input 
            type="text" 
            id="weight-${exercise.id}" 
            placeholder="Enter weight (e.g., 135 lbs)" 
            class="flex-1 px-4 py-3 bg-surface border border-zinc-700 focus:border-primary rounded-xl text-zinc-100 placeholder-zinc-500 transition-colors"
          />
          <button 
            onclick="saveWeight('${exercise.id}')"
            class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  `;
}

function extractYouTubeVideoId(url) {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&\n?#]+)(?:.*[?&]t=(\d+))?/
  );
  const videoId = match ? match[1] : null;
  const timestamp = match && match[2] ? parseInt(match[2], 10) : null;
  return { videoId, timestamp };
}

function getQueryParams() {
  const hash = window.location.hash; // Capture the full hash
  const queryString = hash.split("?")[1] || ""; // Extract query string from hash
  console.log("Query String:", queryString); // Debugging log

  const params = new URLSearchParams(queryString); // Parse query parameters

  const week = parseInt(params.get("week"), 10);
  const day = parseInt(params.get("day"), 10);

  console.log(`Parsed Params - Week: ${week}, Day: ${day}`); // Debug log

  return {
    week: isNaN(week) ? 0 : week,
    day: isNaN(day) ? 0 : day,
  };
}

function mapExercisesById(exercises) {
  return exercises.reduce((map, ex) => ((map[ex.id] = ex), map), {});
}

// Update the header component based on the page
function updateHeaderComponent(page) {
  const headerContainer = document.querySelector("app-header");
  let newHeader;

  switch (page) {
    case "home":
      newHeader = `<app-header home-disabled dynamic-title></app-header>`;
      break;
    case "directory":
      newHeader = `<app-header directory-disabled></app-header>`;
      break;
    case "history":
      newHeader = `<app-header history-disabled></app-header>`;
      break;
    case "workout":
      newHeader = `<app-header dynamic-title></app-header>`;
      break;
  }

  headerContainer.outerHTML = newHeader;
  document.querySelector("app-header").connectedCallback(); // Re-run connectedCallback
}

function updateHeaderContent(currentWeek, workoutDay, workoutName) {
  console.log(
    `Updating header: Week ${
      currentWeek + 1
    }, Day ${workoutDay}, Workout: ${workoutName}`
  ); // Debugging Log

  const appHeader = document.querySelector("app-header");
  if (!appHeader) {
    console.error("app-header element not found");
    return;
  }

  const shadowRoot = appHeader.shadowRoot;
  if (!shadowRoot) {
    console.error("Shadow root not found in app-header");
    return;
  }

  const header = shadowRoot.querySelector("#header");
  if (!header) {
    console.error("#header element not found in shadow root");
    return;
  }

  header.innerHTML = `
    <h1 class="text-xl font-bold text-zinc-100">${workoutName}</h1>
    <p class="text-sm text-zinc-500">Week ${currentWeek + 1} • Day ${workoutDay}</p>
  `;
}

async function loadWorkout() {
  console.log("loadWorkout() called");

  const [data, exercises] = await fetchData();
  const exerciseMap = mapExercisesById(exercises);

  const currentWeek = getCurrentWeek(startDate);

  const result = getWorkoutForToday(data, currentWeek);
  const appContent = document.getElementById("appContent");

  if (result && result.workout) {
    const { workout, workoutDay } = result;
    updateHeaderContent(currentWeek, workoutDay, workout.name);
    appContent.innerHTML = `<div id="todaysWorkout"></div>`;
    renderExercises(workout.exercises, exerciseMap);
  } else {
    updateHeaderContent(currentWeek, 0, "Rest Day");
    appContent.innerHTML = `
      <div class="rest-day-gradient rounded-2xl p-8 text-center">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          <span class="text-4xl">😴</span>
        </div>
        <h2 class="text-2xl font-bold text-zinc-100 mb-2">Rest Day</h2>
        <p class="text-zinc-400 mb-6">No workout scheduled for today. Take it easy and recover!</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#/directory" 
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light text-zinc-100 font-medium rounded-xl transition-colors" 
            data-link>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            Browse Workouts
          </a>
          <a href="#/history" 
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-xl transition-colors" 
            data-link>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            View History
          </a>
        </div>
      </div>`;
  }
}

// Determine the current week based on the date
function getCurrentWeek(startDate) {
  const today = new Date();
  const daysSinceStart = Math.floor(
    (today - startDate) / (1000 * 60 * 60 * 24)
  );
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  return today < startDate ? 0 : weeksSinceStart;
}

function updateLastWeightComponents() {
  const weightComponents = document.querySelectorAll("last-weight");
  weightComponents.forEach((component) => component.fetchAndDisplayWeight());
}

// Initialize the application
const load = () => {
  window.addEventListener("dbUpdated", () => {
    console.log("Database updated event received.");

    // Update only the <last-weight> components
    updateLastWeightComponents();
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const host = window.location.hostname;
    if (host !== prodHostName) document.title = `(STAGING) ${document.title}`;
    await loadContent(); // Initial content load
    const versionIndicator = document.getElementById("versionIndicator");
    if (versionIndicator) {
      versionIndicator.hidden = false;
      versionIndicator.textContent = `v${VERSION}`;
    }
  });
};
load();