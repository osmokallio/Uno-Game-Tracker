Uno Game Tracker
A modern, single-file web application for tracking scores in the card game Uno. This tool is designed for ease of use, with no server-side setup required. Just open the HTML file in your browser and start playing.

Features
Player Management: Easily add, remove, and reorder players before starting a game.

Real-time Scorekeeping: Enter scores for each player at the end of a round, and the totals are updated automatically.

Dealer Tracking: The dealer role automatically rotates to the next player after each round.

Game Logic: The game automatically ends when one or more players reach 500 points, and the player with the lowest score is declared the winner.

Undo Functionality: Made a mistake? Easily undo the last submitted round.

Persistent State: Your game is automatically saved in your browser's local storage, so you can close the tab and resume later.

Data Portability: Export your entire game history and player list to a JSON file for backup or for importing on another device.

Dark & Light Modes: Includes a theme toggler that respects your system's preferred color scheme.

Detailed Statistics: View comprehensive stats, including total wins, head-to-head records, longest win streaks, and a detailed history of every game played.

Responsive Design: The interface is fully responsive and works great on desktops, tablets, and mobile phones.

How to Use
Download the uno-score-tracker.html file.

Open the file in any modern web browser (like Chrome, Firefox, Safari, or Edge).

Add player names.

Click "Start New Game" and select the first dealer.

After each round, enter the points each player has in their hand (the round winner gets 0).

Click "Submit Round" to proceed.

The game ends when a player's score reaches 500.

Technologies Used
HTML: For the structure of the application.

Tailwind CSS: For a modern, utility-first styling approach.

JavaScript: For all the game logic, state management, and interactivity.

Chart.js: For rendering the score progression and statistics charts.
