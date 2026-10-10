# Mor Smes veg 11C planner

Editable 3D model of the apartment, built from the FINN listing (floor plan dimensions + photos).

- Online: https://claude.ai/artifact/Uv3hhKhGY39zxmSYjnJj7f (designs save to your Claude account)
- Local: run `node apartment-3d/serve.js` from the repository root and open http://localhost:8765/apartment-3d/
  (with the listing photos in `listing/images/` the local copy also shows them and can overlay the original floor plan in Plan view)

Edit the sources in `src/`, then run `node apartment-3d/build.js` to regenerate `planner.html` (published page)
and `index.html` (local page). `node apartment-3d/dist.js` collects the public site in `dist/` (used by Vercel).

The listing photos, and the AI stages and videos made from them, belong to the broker's photographer and are not
in this repository.

Model notes: walls follow the Anticimex sketch (marked "not to scale"), so expect a few centimetres of error.
Ceiling height is assumed to be 2.40 m. Top of the plan faces east (balcony, lake view).
