const VERSION = "1.0.0"; // App version
const dbName = `hiit-app-db`;
const weightStore = "Weights";
const prodHostName = "wobbly-atom-periodical.glitch.me";

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
    const rpe = document.getElementById(`rpe-${exerciseId}`).dataset.info;

    console.log({ sets, reps, rpe }); // Debug log
    // Append the additional details to the weight
    const weightWithDetails = `${weight} [Sets: ${sets}, Reps: ${reps}, RPE: ${rpe}]`;

    await storeWeight(exerciseId, weightWithDetails);

    // Show toast notification
    Toastify({
      text: "Weight saved successfully!",
      duration: 3000,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      style: {
        borderRadius: "5px",
        background: "linear-gradient(to right, #2D3540, #A68160)",
      },
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

// Route handling for SPA
// const routes = {
//   "/": loadWorkout,
//   "/directory": loadDirectory,
//   "/workout": loadWorkoutPage,
//   "/history": loadViewHistoryPage,
// };

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
    appContent.innerHTML = "<h1>Page Not Found</h1>";
  }
  setTimeout(async () => {
    // Hide the loader once the content is loaded
    loader.hidden = true;
    header.hidden = false;
    appContent.hidden = false;

    checkForUpdates(); // Check for service worker updates
  }, 250); // Optional small delay for smooth transition
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
  let htmlContent = exercises.map(async (exercise) => {
    const exerciseDetails = exerciseMap[exercise.id] || {};
    const latestWeight = await getWeight(exercise.id); // Fetch latest weight

    return `
        <div class="accordion" id="exercise-${exercise.id}">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" data-bs-toggle="collapse"
                data-bs-target="#collapse-${exercise.id}">
                ${exerciseDetails.name || "Unnamed Exercise"}
              </button>
            </h2>
            <div id="collapse-${
              exercise.id
            }" class="accordion-collapse collapse">
              <div class="accordion-body">
                ${exerciseTemplate(exercise, exerciseDetails, latestWeight)}
              </div>
            </div>
          </div>
        </div>
      `;
  });

  // Resolve all promises in the array using Promise.all
  const resolvedHTML = await Promise.all(htmlContent);

  // Set the innerHTML once with the complete HTML
  workoutList.innerHTML = resolvedHTML.join("");
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
      <div class="alert alert-danger" role="alert">
        Workout not found for Week ${week + 1}, Day ${day + 1}.
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
    .map(
      (week, index) => `
        <div class="mb-4">
          <h2>Week ${index + 1}</h2>
          <ul class="list-group">
            ${week
              .map(
                (workout, dayIndex) => `
                <li class="list-group-item bg-secondary">
                  <a href="#/workout?week=${index}&day=${dayIndex}" class="text-white" data-link>
                    Day ${dayIndex + 1} - ${workout.name}
                  </a>
                </li>`
              )
              .join("")}
          </ul>
        </div>`
    )
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
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  let workoutDay = null;
  if (dayIndex === 3) {          // Wednesday
    workoutDay = 1;
  } else if (dayIndex === 5) {   // Friday
    workoutDay = 2;
  } else if (dayIndex === 6) {   // Saturday
    workoutDay = 3;
  } else {
    return null; // Off day for all other days
  }

  // In our new schedule, each week (A or B) has 3 workouts, so use workoutDay - 1 as index
  return {
    workout: data[currentWeek][workoutDay - 1],
    workoutDay: workoutDay
  };
}

function exerciseTemplate(exercise, exerciseDetails) {
  const { videoId, timestamp } = extractYouTubeVideoId(
    exerciseDetails.link || ""
  );

  return `
    <ul class="list-group list-group-flush">
      <li class="list-group-item">Warmup Sets: ${exercise.warmupSets}</li>
      <li id="sets-${exercise.id}" class="list-group-item" data-info="${
    exercise.workingSets
  }">Working Sets: ${exercise.workingSets}</li>
      <li id="reps-${exercise.id}" class="list-group-item" data-info="${
    exercise.repsOrDuration
  }">Reps/Duration: ${exercise.repsOrDuration}</li>
      <li id="rpe-${exercise.id}" class="list-group-item" data-info="${
    exercise.rpeOrPercent
  }">RPE/Percent: ${exercise.rpeOrPercent}</li>
      <li class="list-group-item">Rest: ${exercise.rest}</li>
      <li class="list-group-item">Notes: ${exercise.notes}</li>
      ${
        videoId
          ? `<li class="list-group-item">
              <iframe 
                width="100%" 
                height="200" 
                src="https://www.youtube-nocookie.com/embed/${videoId}?start=${
              timestamp || 0
            }" 
                frameborder="0" 
                allowfullscreen 
                sandbox="allow-scripts allow-same-origin allow-presentation"
                loading="lazy">
              </iframe>
            </li>`
          : ""
      }
      <li class="list-group-item">Substitutions: ${
        exerciseDetails.subs || "None"
      }</li>
      <li class="list-group-item">
        <last-weight exercise-id="${exercise.id}"></last-weight>
        <input type="text" class="form-control mt-2" id="weight-${
          exercise.id
        }" placeholder="Enter weight" />
        <button class="btn btn-primary mt-2" onclick="saveWeight('${
          exercise.id
        }')">Save</button>
      </li>
    </ul>
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

  header.innerHTML = ""; // Clear existing content

  // Create h1, h2 elements
  const name = document.createElement("h1");
  name.textContent = workoutName;;

  // Append elements to header
  header.appendChild(name);

  // Apply Bootstrap classes for styling
  header.className = "d-flex flex-column align-items-center text-center m-2";
}

async function loadWorkout() {
  console.log("loadWorkout() called");

  const [data, exercises] = await fetchData();
  const exerciseMap = mapExercisesById(exercises);

  // Update startDate to March 5th, 2025 (CST)
  const startDate = new Date("2025-03-05");
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
      <div class="alert alert-info" role="alert">
        Today is a rest day! No workout planned.
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
  return today < startDate ? 0 : Math.min(weeksSinceStart, 19);
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
