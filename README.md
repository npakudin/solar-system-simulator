# Solar System 3D

Open `index.html` in a browser.

There is no dev server, npm install, or CDN dependency at runtime. Three.js is vendored locally in `vendor/`.

The default launch is tuned for a visible Jupiter gravity assist: the rocket flies to Jupiter, bends inward, and returns close to Earth's orbit.

Scenario data lives in `src/scenario-data.js` so the app still works when `index.html` is opened directly from disk. The matching JSON files are in `src/data/` for editing/generation workflows:

- `src/data/body-catalog.json`
- `src/data/scenarios.json`
