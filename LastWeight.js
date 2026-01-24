class LastWeight extends HTMLElement {
  static get observedAttributes() {
    return ["exercise-id"]; // Track changes to the exercise ID
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render(); // Initial render
  }

  connectedCallback() {
    this.fetchAndDisplayWeight(); // Fetch weight when component is connected
    window.addEventListener("dbUpdated", this.fetchAndDisplayWeight.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener("dbUpdated", this.fetchAndDisplayWeight.bind(this));
  }

  attributeChangedCallback() {
    this.fetchAndDisplayWeight(); // Refetch weight if the exercise ID changes
  }

  async fetchAndDisplayWeight() {
    const exerciseId = this.getAttribute("exercise-id");
    const weight = await getWeight(exerciseId); // Fetch from IndexedDB
    this.render(weight || null); // Render the latest weight or null
  }

  render(weight = null) {
    const hasWeight = weight !== null && weight !== "";
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        
        .weight-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .weight-label {
          font-size: 0.75rem;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .weight-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: ${hasWeight ? '#10b981' : '#71717a'};
        }
        
        .weight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background-color: ${hasWeight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(113, 113, 122, 0.1)'};
          border: 1px solid ${hasWeight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(113, 113, 122, 0.2)'};
          border-radius: 8px;
        }
        
        .weight-icon {
          width: 14px;
          height: 14px;
          color: ${hasWeight ? '#10b981' : '#71717a'};
        }
      </style>
      
      <div class="weight-badge">
        <svg class="weight-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${hasWeight 
            ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>`
            : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>`
          }
        </svg>
        <span class="weight-value">${hasWeight ? weight : 'No previous'}</span>
      </div>
    `;
  }
}

// Define the custom element
customElements.define("last-weight", LastWeight);