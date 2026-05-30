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

    const accordionContainer = this.shadowRoot.querySelector("#historyAccordion");
    
    if (Object.keys(groupedWeights).length === 0) {
      accordionContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No History Yet</h3>
          <p>Start logging your weights during workouts to see your progress here.</p>
        </div>
      `;
      return;
    }

    accordionContainer.innerHTML = Object.keys(groupedWeights)
      .map((id) => {
        const exerciseName = exerciseMap[id] || id;
        const weights = groupedWeights[id];
        const latestWeight = weights[weights.length - 1];
        
        const weightEntries = weights
          .slice()
          .reverse()
          .map((weight, index) => `
            <div class="weight-entry ${index === 0 ? 'latest' : ''}">
              <div class="weight-value">
                <span class="weight-number">${weight.weight}</span>
                ${index === 0 ? '<span class="latest-badge">Latest</span>' : ''}
              </div>
              <div class="weight-date">
                ${new Date(weight.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          `)
          .join("");

        return `
          <div class="accordion-item">
            <button class="accordion-header" aria-expanded="false" aria-controls="collapse-${id}">
              <div class="header-content">
                <span class="exercise-name">${exerciseName}</span>
                <span class="entry-count">${weights.length} ${weights.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div id="collapse-${id}" class="accordion-content">
              <div class="accordion-body">
                ${weightEntries}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach event listeners for accordion toggling
    this.shadowRoot.querySelectorAll(".accordion-header").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("aria-controls");
        const target = this.shadowRoot.querySelector(`#${targetId}`);

        if (target) {
          const isExpanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", !isExpanded);
          target.classList.toggle("open", !isExpanded);
          button.querySelector('.chevron').classList.toggle('rotated', !isExpanded);
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
      <style>
        :host {
          display: block;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .search-container {
          position: relative;
          margin-bottom: 1.5rem;
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #71717a;
        }
        
        #searchBar {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          color: #fafafa;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
        }
        
        #searchBar::placeholder {
          color: #71717a;
        }
        
        #searchBar:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        
        .accordion-item {
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .accordion-item:hover {
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .accordion-header {
          width: 100%;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          color: #fafafa;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .accordion-header:hover {
          background-color: rgba(39, 39, 42, 0.5);
        }
        
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
        
        .exercise-name {
          font-weight: 600;
          font-size: 0.9375rem;
        }
        
        .entry-count {
          font-size: 0.75rem;
          color: #71717a;
        }
        
        .chevron {
          width: 20px;
          height: 20px;
          color: #71717a;
          transition: transform 0.2s ease;
        }
        
        .chevron.rotated {
          transform: rotate(180deg);
        }
        
        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        
        .accordion-content.open {
          max-height: 1000px;
          transition: max-height 0.5s ease-in;
        }
        
        .accordion-body {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid #27272a;
        }
        
        .weight-entry {
          padding: 1rem 0;
          border-bottom: 1px solid #27272a;
        }
        
        .weight-entry:last-child {
          border-bottom: none;
        }
        
        .weight-entry.latest {
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%);
          margin: 0 -1.25rem;
          padding: 1rem 1.25rem;
          border-bottom: none;
        }
        
        .weight-value {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.375rem;
        }
        
        .weight-number {
          font-weight: 600;
          color: #fafafa;
          font-size: 1rem;
        }
        
        .latest-badge {
          padding: 0.125rem 0.5rem;
          background-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
          font-size: 0.6875rem;
          font-weight: 600;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        
        .weight-date {
          font-size: 0.8125rem;
          color: #71717a;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
          background-color: #18181b;
          border: 1px dashed #27272a;
          border-radius: 12px;
        }
        
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        .empty-state h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #fafafa;
          margin-bottom: 0.5rem;
        }
        
        .empty-state p {
          font-size: 0.875rem;
          color: #71717a;
          max-width: 280px;
          margin: 0 auto;
        }
      </style>
      
      <div class="search-container">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text" id="searchBar" placeholder="Search exercises..." />
      </div>
      <div id="historyAccordion"></div>
    `;
  }
}

// Register the custom element
customElements.define("view-history", History);