# Uno-Game-Tracker

# Project Definition: Browser-Based Uno Score Tracker (v3 - Enhanced)

## 1. Overview

This project defines a significantly enhanced client-side web application for tracking scores during games of classic Uno. The application allows users to input player names, record scores after each round (hand) with **tracking of which player went out**, automatically calculates totals, manages game progression (score limit, **highlighted rotating dealer**), and supports multiple games within a session.

Persistence between sessions relies on **manual CSV export/import**, now featuring **more robust validation** on import and a UI note recommending backups. The application includes user **confirmation dialogues** to prevent accidental data loss.

A major feature is the **integrated, toggleable statistics section** which is now significantly expanded. It displays overall, per-session/day, and detailed per-game statistics (including **round-by-round scores with the round winner highlighted**). New statistics include **win streaks, longest streaks of individual hand wins, highest/lowest scoring rounds**, and player head-to-head records. Basic **filtering by date and player** is implemented for the statistics view, complemented by a **bar chart visualizing total wins**.

The UI incorporates **basic animations** for feedback and is designed with **CSS responsiveness** for better usability across different screen sizes. The application runs entirely within the user's web browser using HTML, CSS, and JavaScript, requiring no server-side backend.

## 2. Core Features

* **Player Setup:** Define players manually or load automatically from imported CSV.
* **CSV Data Import:** Load game history from a previously exported CSV file with improved format validation and error handling.
* **CSV Data Export:** Export *all* current data (loaded + session) to a CSV file. Includes a UI note recommending manual backups. The CSV now includes data on which player went out each round.
* **Starting Player Selection:** Select the dealer for the first hand of a new game.
* **Round Score Entry & "Who Went Out" Tracking:** Enter scores per round; the application automatically identifies and stores which player scored 0 ("went out").
* **Automatic Totals:** Calculates and displays cumulative scores for the current game.
* **Rotating Dealer with Highlighting:** Tracks and visually highlights the current dealer.
* **Single Zero Score Validation:** Enforces that exactly one player scores 0 per round.
* **Game End Condition:** Detects game end when a player reaches/exceeds 500 points.
* **Winner Declaration:** Identifies and displays the winner(s) of a completed game.
* **Multiple Game Support:** Play multiple games per session, appending to loaded data.
* **Confirmation Dialogs:** Prompts user before starting a new game if current is unfinished, and before loading a CSV if current session has potentially unsaved changes.
* **Score Progression Graph:** Line chart showing score progression for the *current* game.
* **Enhanced Integrated Statistics Display:**
    * Toggleable section within the main page.
    * **Calculated from currently loaded/played data.**
    * **Filtering:** Basic filtering by date range and selected players.
    * **Overall Stats:** Total games, wins/player (list & bar chart), max win streaks, counts of \*hand win streaks\* (\u22654), highest/lowest scoring rounds (details), and head-to-head win/loss records between players.
    * **Session/Day Stats:** Groups completed games by date, showing games played and winner(s) of the day.
    * **Per-Game Stats:** Detailed view including final scores and a table of **round-by-round scores showing who went out each round.**
* **UI Feedback & Responsiveness:**
    * Dealer highlighting.
    * Subtle animations on score addition and game end.
    * Improved layout adapting to different screen sizes via CSS media queries.

## 3. Technical Requirements

* **Frontend:** HTML5, CSS3 (with media queries), JavaScript (ES6+)
* **Charting Library:** Chart.js (loaded via CDN)
* **Environment:** Standard modern web browser with JavaScript enabled.
* **Dependencies:** Chart.js.
* **Persistence:** Manual CSV export/import supplemented by in-session JavaScript memory.

## 4. File Structure

/uno-score-tracker/
├── index.html     # Main HTML structure, UI, stats display, filter controls, chart canvases
├── style.css      # CSS including base styles, animations, highlighting, and media queries
└── script.js      # JavaScript logic: gameplay, CSV handling, stats calc, filtering, confirmations, UI updates

## 5. Detailed Feature Breakdown (Highlights of Key Logic)

* **UI Initialization (`initializeUI`):** Sets initial visibility, resets flags and inputs.
* **Confirmations (`confirmAction`, integrated into `startNewGame`, `handleFileUpload`):** Uses `window.confirm()` to ask the user before potentially losing unsaved session data.
* **CSV Import (`handleFileUpload`, `parseCsvData`):**
    * Includes confirmation dialog.
    * `parseCsvData` now performs more checks (file length, expected columns based on header, numeric scores). Extracts player list, game data, round scores, and the **`roundWinners` index** (handling old formats). Throws more descriptive errors.
* **CSV Export (`downloadCSV`, `generateCsvContent`):**
    * Collects all data, sorts by game number.
    * Includes the **`WentOutIndex` column** in the CSV output (saving -1 if data is missing).
    * Includes UTF-8 BOM. UI includes backup recommendation text.
* **Dealer Highlight (`updateRoundStarterDisplay`):** Adds/removes a `.highlight` CSS class to the dealer display element.
* **"Who Went Out" Tracking (`addRound`):** Identifies the player index scoring 0 and stores it in `currentGameData.roundWinners`.
* **Animations:** CSS classes (`.flash`, `.fade-in`) are briefly added/removed by JS (`addRound`, `endGame`) to trigger simple feedback animations defined in CSS.
* **Responsiveness:** Primarily handled in `style.css` using `@media` queries to adjust layout, sizes, and visibility for smaller screens.
* **Statistics (`toggleStatsDisplay`, `applyAndDisplayStats`, calculation functions):**
    * `toggleStatsDisplay` shows/hides the main stats section.
    * `applyAndDisplayStats` (called by toggle button and filter button):
        * Reads filter values using `getStatsFilters`.
        * Filters the combined game data using `applyFilters`.
        * Calls calculation functions (`calculateWinCounts`, `calculateWinStreaks`, `calculateHiLoRounds`, `displayHeadToHead`) with filtered data.
        * Calls display functions (`displayOverallStats_internal`, etc.) to populate the UI.
        * Calls `createWinsBarChart` to generate the wins visualization based on filtered data.
    * `displayPerGameStats_internal` now creates two tables: one for totals, one for rounds including **displaying the name of the player who went out** based on `game.roundWinners`.
    * New calculation functions implemented for streaks, HiLo rounds, and H2H data.

## 6. Data Structures (JavaScript)

* `players`: Array of strings.
* `currentGameData` / `allGamesData` objects:
    ```javascript
    {
        gameNumber: number,
        startingPlayer: string | null,
        players: string[],
        rounds: number[][],       // e.g., [[score1, score2], [score3, score4]]
        roundWinners: number[],   // Index of player scoring 0 per round, e.g., [1, 0] (-1 if none/tie/missing)
        totals: number[],
        isOver: boolean,
        currentDealerIndex: number,
        gameEndTime: string | null
    }
    ```
* `scoreChart`: Chart.js instance (current game line chart).
* `winsBarChart`: Chart.js instance (stats bar chart).
* `gameCounter`: Number tracking the highest game number.
* `unsavedChanges`: Boolean flag used for confirmation dialogs.

## 7. CSV Export Format (Example with new column)

```csv
"Peli","1"
"Pelin päättymisaika","28.3.2025, 10:30:00"
"Kierros","Alice","Bob","Charlie","WentOutIndex"
"1","15","0","55","1"
"2","0","22","10","0"
"3","102","30","0","2"
"Yhteensä","117","52","65"

"Peli","2"
"Pelin päättymisaika","28.3.2025, 10:45:12"
"Kierros","Alice","Bob","Charlie","WentOutIndex"
"1","0","40","5","0"
"Yhteensä","0","40","5"
