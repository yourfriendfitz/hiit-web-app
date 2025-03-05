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
      this.render(weight || "N/A"); // Render the latest weight or "N/A"
    }
  
    render(weight = "Loading...") {
      this.shadowRoot.innerHTML = `
        <style>
          .weight-container {
            font-size: 1.2rem;
            font-weight: bold;
          }
        </style>
        <div class="weight-container">
          Last Weight: ${weight}
        </div>
      `;
    }
  }
  
  // Define the custom element
  customElements.define("last-weight", LastWeight);
  