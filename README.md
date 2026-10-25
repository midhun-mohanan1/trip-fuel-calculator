# Shared Trip Fuel Cost Calculator

A mobile-first, client-side web application designed to fairly split fuel costs for group road trips based on the actual distances each person travelled. 

## Features
- **Fair Split Algorithm:** Users only pay for the route segments they were actually in the car for.
- **Equal Split Option:** Simple divide-by-all toggle available.
- **Privacy-First:** 100% client-side. No backend, no API calls, no data tracking. Saves directly to browser `localStorage`.
- **Google Maps Integration:** Deep links dynamically generate directions so you can verify distances manually.

## Manual Testing Checklist
Before deploying, check the following scenarios:
- [x] Entering one segment with 2 people correctly halves the cost.
- [x] Dropping a passenger mid-trip recalculates subsequent segments correctly.
- [x] Setting distance to `0` results in `0` fuel cost.
- [x] Excluding the driver from paying distributes the segment cost entirely to other passengers.
- [x] Reloading the page retains data (click "Save Trip" first).
- [x] Clicking "Export to CSV" downloads an accurate settlement file.
- [x] Modifying the middle of a 3-stop route safely rebuilds the segments.

## GitHub Pages Deployment Guide (For Beginners)

Since this app requires no servers, databases, or build processes, hosting it on GitHub Pages is free and takes less than 2 minutes.

1. **Create a GitHub Repository:** 
   Log into GitHub and create a new repository (e.g., `trip-fuel-calculator`).
2. **Upload Files:** 
   Click "Add file" -> "Upload files" and drag the entire folder structure (including `index.html`, the `css` folder, the `js` folder, and `.nojekyll`) into the repository. Commit the changes.
3. **Enable GitHub Pages:**
   - Go to your repository **Settings**.
   - Click on **Pages** in the left sidebar.
   - Under "Source", select **Deploy from a branch**.
   - Under "Branch", select `main` (or `master`) and keep the folder as `/ (root)`.
   - Click **Save**.
4. **Access Your Site:** 
   Wait 1-2 minutes. GitHub will provide a link at the top of the Pages settings page (e.g., `https://yourusername.github.io/trip-fuel-calculator/`). 

If you see a blank page or unstyled text, double-check that your `css` and `js` folders are uploaded exactly as structured above and are not nested inside a sub-folder.
