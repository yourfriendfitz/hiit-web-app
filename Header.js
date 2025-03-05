class Header extends HTMLElement {
  static get observedAttributes() {
    return ["home-disabled", "directory-disabled", "dynamic-title"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const homeDisabled = this.hasAttribute("home-disabled");
    const directoryDisabled = this.hasAttribute("directory-disabled");
    const historyDisabled = this.hasAttribute("history-disabled");
    const dynamicTitle = this.hasAttribute("dynamic-title");

    this.shadowRoot.innerHTML = `
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" 
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
      />
      <link rel="stylesheet" href="styles.css" />
  
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="d-flex justify-content-center align-items-center">
          <a href="#/" class="btn btn-secondary ${
            homeDisabled ? "disabled" : ""
          }" 
            data-link aria-disabled="${homeDisabled}">
            <i class="fas fa-home"></i>
          </a>
        </div>
  
        ${
          dynamicTitle
            ? `<div id="header" class="text-center flex-grow-1">Loading Workout...</div>`
            : `<div class="d-flex justify-content-center align-items-center">
                <h1 class="text-center flex-grow-1">${
                  historyDisabled ? "History" : "Workout Directory"
                }</h1>
              </div>`
        }
  
        <div class="d-flex justify-content-between align-items-center flex-column">
          <a href="#/directory" class="btn btn-secondary mt-2 ${
            directoryDisabled ? "disabled" : ""
          }" data-link aria-disabled="${directoryDisabled}">
            <i class="fas fa-book"></i>
          </a>
          <a href="#/history" class="btn btn-secondary mt-2 ${
            historyDisabled ? "disabled" : ""
          }" data-link aria-disabled="${historyDisabled}">
            <i class="fas fa-history"></i>
          </a>
        </div>
      </div>
    `;

    this.addLinkHandlers();
  }

  addLinkHandlers() {
    const links = this.shadowRoot.querySelectorAll("a[data-link]");
    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent page reload
        const hashPath = new URL(link.href).hash.slice(1); // Extract hash path
        console.log(`Navigating to: ${hashPath}`); // Debug log
        window.location.hash = hashPath; // Update the hash
      });
    });
  }
}

customElements.define("app-header", Header);
