# HIIT Web App

This is a web app meant to display HIIT workout program

## Links

- [Staging](https://stellar-brash-raja.glitch.me/)
- [Prod](https://quickest-tortoiseshell-cupboard.glitch.me/)

## Code Merge Standard

- Create feature branch with code to be introduced.
- Squash and merge all commits in a PR from feature branch to `staging`, no review needed.
- Create PR from `staging` to `beta` and request review.
- Merge commit the PR from `staging` to `beta` to keep branch histories in sync.

### Features
- **Workout Directory:** Browse workouts by week and day.
- **Track Progress:** Log and view weights for each exercise.
- **Offline Support:** Use the app even without an internet connection.
- **Mobile-Friendly:** Installable as a PWA for easy access on iOS and Android.
- **Toast Notifications:** Get notifications when actions, like saving weights, are completed.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed. If it’s not installed, follow these steps:
1. Install [nvm](https://github.com/nvm-sh/nvm#install--update-script).
2. Install Node.js using nvm:  
   ```bash
   nvm install node
   nvm use node
   ```

### How to Test Locally
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd nippard-web-app
   ```

2. **Install `http-server`:**
   ```bash
   npm install -g http-server
   ```

3. **Start the server:**
   ```bash
   http-server . -p 8080
   ```

4. **Access the app in your browser:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.

### Installing the PWA on iOS
To install the PWA on an iOS device:
1. Open the app in Safari: [Prod](https://wobbly-atom-periodical.glitch.me/).
2. Tap the **Share** button at the bottom of the screen.
3. Scroll down and select **Add to Home Screen**.
4. Tap **Add** in the top right corner.

The app will now be installed and accessible from your home screen like a native app.

### Service Worker and Offline Caching
The service worker in this app ensures offline functionality by caching essential files and data. On subsequent visits, the app loads from the cache if the network is unavailable. 

If you encounter issues, ensure that:
1. The service worker is correctly registered in the browser's DevTools under **Application > Service Workers**.
2. You are accessing the app over HTTP or HTTPS, as service workers only work on secure origins.