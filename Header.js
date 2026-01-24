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
      <style>
        :host {
          display: block;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          gap: 1rem;
        }
        
        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background-color: #18181b;
          border: 1px solid #27272a;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        
        .nav-btn:hover:not(.disabled) {
          background-color: #27272a;
          border-color: #10b981;
          color: #10b981;
        }
        
        .nav-btn:active:not(.disabled) {
          transform: scale(0.95);
        }
        
        .nav-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        .nav-btn.active {
          background-color: #10b981;
          border-color: #10b981;
          color: white;
        }
        
        .nav-btn svg {
          width: 20px;
          height: 20px;
        }
        
        .title-section {
          flex: 1;
          text-align: center;
          min-width: 0;
        }
        
        .title-section h1 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fafafa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .title-section p {
          font-size: 0.875rem;
          color: #71717a;
          margin-top: 0.25rem;
        }
        
        #header {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .refresh-btn {
          background-color: #27272a;
          border-color: #3f3f46;
        }
        
        .refresh-btn:hover {
          background-color: #3f3f46;
          border-color: #22d3ee;
          color: #22d3ee;
        }
      </style>
      
      <div class="header-container">
        <!-- Left Nav -->
        <div class="nav-group">
          <a href="#/" class="nav-btn ${homeDisabled ? 'disabled active' : ''}" data-link aria-disabled="${homeDisabled}" title="Home">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
          </a>
          <button id="update-cache" class="nav-btn refresh-btn" title="Refresh Cache">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
        
        <!-- Title Section -->
        ${dynamicTitle 
          ? `<div class="title-section">
              <div id="header">
                <p style="color: #71717a;">Loading...</p>
              </div>
            </div>`
          : `<div class="title-section">
              <h1>${historyDisabled ? 'History' : 'Workout Directory'}</h1>
            </div>`
        }
        
        <!-- Right Nav -->
        <div class="nav-group">
          <a href="#/directory" class="nav-btn ${directoryDisabled ? 'disabled active' : ''}" data-link aria-disabled="${directoryDisabled}" title="Directory">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </a>
          <a href="#/history" class="nav-btn ${historyDisabled ? 'disabled active' : ''}" data-link aria-disabled="${historyDisabled}" title="History">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </a>
        </div>
      </div>
    `;

    this.addLinkHandlers();
    this.addUpdateCacheHandler();
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

  addUpdateCacheHandler() {
    const updateCacheButton = this.shadowRoot.querySelector("#update-cache");
    updateCacheButton.addEventListener("click", () => {
      if (typeof window.triggerUpdateCache === "function") {
        window.triggerUpdateCache();
        window.location.reload();
      } else {
        console.error("triggerUpdateCache function is not defined on the window object.");
      }
    });
  }
}

customElements.define("app-header", Header);