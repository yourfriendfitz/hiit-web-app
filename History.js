class History extends HTMLElement {
  constructor() {
    super();
    console.log("History component initialized");
    this.attachShadow({ mode: "open" });
    this.render(); // Initial render
  }

  async connectedCallback() {
    console.log("History component connected to the DOM");
    await this.fetchAndRenderHistory(); // Fetch and display weights
    this.addSearchHandler(); // Handle search input
  }

  async fetchAndRenderHistory(filter = "") {
    console.log(`Fetching and rendering history with filter: "${filter}"`);

    const weights = await this.getAllWeights();
    const exercises = await this.fetchExercises();

    const exerciseMap = exercises.reduce((map, ex) => {
      map[ex.id] = ex.name;
      return map;
    }, {});

    const filteredWeights = weights.filter((w) =>
      exerciseMap[w.id]?.toLowerCase().includes(filter.toLowerCase())
    );

    const groupedWeights = filteredWeights.reduce((acc, weight) => {
      if (!acc[weight.id]) {
        acc[weight.id] = [];
      }
      acc[weight.id].push(weight);
      return acc;
    }, {});

    this.shadowRoot.querySelector("#historyAccordion").innerHTML = Object.keys(
      groupedWeights
    )
      .map((id) => {
        const exerciseName = exerciseMap[id] || id;
        const weightEntries = groupedWeights[id]
          .map(
            (weight) => `
              <p><strong>Weight:</strong> ${weight.weight}</p>
              <p><strong>Date:</strong> ${new Date(weight.date).toLocaleString(
                "en-US",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                }
              )}</p>
            `
          )
          .join("");

        return `
          <div class="accordion-item">
            <h2 class="accordion-header" id="heading-${id}">
              <button class="accordion-button collapsed" type="button"
                aria-expanded="false" aria-controls="collapse-${id}">
                ${exerciseName}
              </button>
            </h2>
            <div id="collapse-${id}" class="accordion-collapse collapse" aria-labelledby="heading-${id}">
              <div class="accordion-body">
                ${weightEntries}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach event listeners for accordion toggling
    this.shadowRoot.querySelectorAll(".accordion-button").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("aria-controls");
        const target = this.shadowRoot.querySelector(`#${targetId}`);

        if (target) {
          // Ensure target exists
          const isExpanded = button.getAttribute("aria-expanded") === "true";

          button.setAttribute("aria-expanded", !isExpanded);
          target.classList.toggle("show", !isExpanded); // Toggle the 'show' class
        } else {
          console.error(`Target not found for accordion button: ${targetId}`);
        }
      });
    });
  }

  async fetchExercises() {
    try {
      const response = await fetch("exercises.json");
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      return [];
    }
  }

  async getAllWeights() {
    console.log("Fetching all weights from the database");
    const db = dbInstance || (await initDB());
    const tx = db.transaction(weightStore, "readonly");
    const store = tx.objectStore(weightStore);
    return new Promise((resolve) => {
      const weights = [];
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          weights.push(cursor.value);
          cursor.continue();
        } else {
          console.log("All weights fetched:", weights);
          resolve(weights);
        }
      };
    });
  }

  addSearchHandler() {
    console.log("Adding search handler");
    const searchInput = this.shadowRoot.querySelector("#searchBar");
    searchInput.addEventListener("input", (event) => {
      console.log(`Search input changed: "${event.target.value}"`);
      this.fetchAndRenderHistory(event.target.value);
    });
  }

  render() {
    console.log("Rendering History component");
    this.shadowRoot.innerHTML = `
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" defer></script>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
      />
      <link rel="stylesheet" href="styles.css" />
      <input type="text" id="searchBar" class="form-control" placeholder="Search exercises..." />
      <div id="historyAccordion" class="accordion mt-5"></div>
    `;
  }
}

// Register the custom element
customElements.define("view-history", History);
