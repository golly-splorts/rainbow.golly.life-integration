/*jslint onevar: true, undef: false, nomen: true, eqeqeq: true, plusplus: false, bitwise: true, regexp: true, newcap: true, immed: true  */

/**
 * Game of Life - JS & CSS
 * Pedro Verruma (http://pmav.eu)
 * 04 September 2010
 *
 * Major modifications by Charles Reid (https://github.com/charlesreid1)
 * 12 February 2018
 * 11 July 2019
 *
 * Major modifications by Ch4zm of Hellmouth (https://github.com/ch4zm)
 * 26 October 2020
 */

(function () {

  var realBackgroundColor = "#272b30";
  var gridStrokeColor1    = "#3a3a3a";
  var mapZoneStrokeColor  = "#dddddd";
  var grays = ["#3a3a3a", "#404040"];

  var GOL = {

    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),
    mapsApiUrl : getMapsApiUrl(),

    // this may duplicate / between the base url and simulator
    baseSimulatorUrl : getBaseUIUrl() + '/simulator/index.html',

    simulatorDivIds : [
      'container-golly-header',
      'container-golly-controls',
      'container-canvas',
      'container-golly-frontmatter',
      'container-loading'
    ],

    // 1 acorn apiece
    //s1Default: '[{"50":[60]},{"51":[62]},{"52":[59,60,63,64,65]}]',
    //s2Default: '[{"60":[60]},{"61":[62]},{"62":[59,60,63,64,65]}]',
    //s3Default: '[{"31":[29,30,33,34,35]},{"32":[32]},{"33":[30]}]',
    //s4Default: '[{"61":[29,30,33,34,35]},{"62":[32]},{"63":[30]}]',

    // 2 acorns
    s1Default: '[{"50":[60,160]},{"51":[62,162]},{"52":[59,60,63,64,65,159,160,163,164,165]}]',
    s2Default: '[{"60":[60,160]},{"61":[62,162]},{"62":[59,60,63,64,65,159,160,163,164,165]}]',
    s3Default: '[{"31":[29,30,33,34,35,129,130,133,134,135]},{"32":[32,132]},{"33":[30,130]}]',
    s4Default: '[{"61":[29,30,33,34,35,129,130,133,134,135]},{"62":[32,132]},{"63":[30,130]}]',

    defaultCols: 180,
    defaultRows: 120,
    defaultCellSize: 4,

    // Previously this was 240, but that was a bit too small
    // If increased to 300, it never converges if oscillators present
    runningAvgMaxDim: 280,

    gameMode : false,
    mapMode : false,
    sandboxMode : false,
    legacyStoppingCriteria: false,

    teamNames: [],
    teamColors: [],

    columns : 0,
    rows : 0,
    cellSize: 0,

    waitTimeMs: 0,
    generation : 0,

    running : false,
    autoplay : false,

    // Cell colors
    //
    // dead/trail colors always the same
    // alive color sets are either set by the game (game mode)
    // or set by the user via the schemes (sandbox mode)
    colors : {
      current : 0,
      schedule : false,
      dead: realBackgroundColor,
      trail: grays,
      alive: null,

      schemes : [
        {
          alive: ['#ffc20a', '#0c7bdc', '#e66100', '#9963ab'],
          alive_labels: ['Yellow', 'Blue', 'Orange', 'Purple']
        },
        {
          alive: ['#3b9dff', '#dc3220', '#fefe62', '#ffa6c9'],
          alive_labels: ['Blue', 'Red', 'Yellow', 'Pink']
        },
        {
          alive: ['#EEEEEE', '#AAAAAA', '#777777', '#0A0A0A'],
          alive_labels: ['Bright1', 'Bright2', 'Bright3', 'Bright4']
        }
      ],
    },

    // Grid style
    grid : {
      current : 1,
      mapOverlay : false,

      schemes : [
        {
          color : gridStrokeColor1,
        },
        {
          color : '', // Special case: 0px grid
        },
      ],
    },

    // information about winner/loser
    showWinnersLosers : false,
    foundVictor : false,
    runningAvgWindow : [],
    runningAvgLast3 : [0.0, 0.0, 0.0],

    // Clear state
    clear : {
      schedule : false
    },

    // Average execution times
    times : {
      algorithm : 0,
      gui : 0
    },

    // DOM elements
    element : {
      generation : null,
      livecells : null,
      livecells1 : null,
      livecells2 : null,
      livecells3 : null,
      livecells4 : null,
      livepct: null,
      // territory1: null,
      // territory2: null,
      team1color: null,
      team2color: null,
      team3color: null,
      team4color: null,
      team1name: null,
      team2name: null,
      team3name: null,
      team4name: null,
      z1lab: null,
      z2lab: null,
      z3lab: null,
      z4lab: null,
      mapName: null,
      mapPanel: null,
    },

    // Initial state
    // Set in loadConfig()
    initialState1 : null,
    initialState2 : null,
    initialState3 : null,
    initialState4 : null,

    // Trail state
    trail : {
      current: false,
      schedule : false
    },

    /**
     * On Load Event
     */
    init : function() {
      try {
        this.loading();
        this.listLife.init();   // Reset/init algorithm
        this.loadConfig();      // Load config from URL
        this.keepDOMElements(); // Keep DOM references (getElementsById)
        this.loadState();       // Load state from config
        // Previously, we had the following function calls here:
        //this.registerEvents();  // Register event handlers
        //this.prepare();
        // However, when loading data from an API, those calls
        // need to wait until the data has been loaded.
        // They were moved to inside the loadState() function.
      } catch (e) {
        console.log(e);
        this.error(-1);
      }
    },

    error : function(mode) {

      // Hide elements
      for (var c in this.simulatorDivIds) {
        try {
          var elem = document.getElementById(this.simulatorDivIds[c]);
          elem.classList.add('invisible');
        } catch (e) {
          // do nothing
        }
      }

      // Show error 
      var container = document.getElementById('container-error');
      container.classList.remove("invisible");

    },

    loading : function() {
      this.loadingElem = document.getElementById('container-loading');
      this.loadingElem.classList.remove('invisible');
    },

    removeLoadingElem : function() {
      this.loadingElem.classList.add('invisible');
    },

    showControlsElem : function() {
      var controls = document.getElementById('container-golly-controls');
      controls.classList.remove('invisible');
    },

    showGridElem : function() {
      var canv = document.getElementById('container-canvas');
      canv.classList.remove('invisible');
    },

    /**
     * Load config from URL
     *
     * This function loads configuration variables for later processing.
     * Here is how it works:
     * - if user provides gameId param, switch to game simulation mode
     * - if user provides no gameId param, switch to sandbox mode
     *   - if user provides map param, show map display
     *   - if user provides random param, don't show map display
     *   - if user provides s1 or s2 params, don't show map display
     *   - if user provides nothing, don't show map display
     * Any options that require data to be loaded are set elsewhere.
     */
    loadConfig : function() {
      var grid, zoom;

      // User providing gameId means we go to game mode
      this.gameId = this.helpers.getUrlParameter('gameId');

      // User NOT providing gameId means we go to sandbox mode
      // User can provide a map,
      this.patternName = this.helpers.getUrlParameter('patternName');
      // Or specify the random flag,
      this.random = parseInt(this.helpers.getUrlParameter('random'));
      // Or specify the states of the two colors
      this.s1user = this.helpers.getUrlParameter('s1');
      this.s2user = this.helpers.getUrlParameter('s2');
      this.s3user = this.helpers.getUrlParameter('s3');
      this.s4user = this.helpers.getUrlParameter('s4');

      if (this.gameId != null) {
        // Game simulation mode with map overlay
        this.gameMode = true;
        this.grid.mapOverlay = true;

      } else if (this.patternName != null) {
        // Map mode with map overlay
        this.mapMode = true;
        this.sandboxMode = true;
        this.grid.mapOverlay = true;

      } else if (this.random == 1) {
        // Random map
        this.sandboxMode = true;
        this.grid.mapOverlay = false;

      } else if ((this.s1user != null) || (this.s2user != null) || (this.s3user != null) || (this.s4user != null)) {
        // User-provided patterns
        this.sandboxMode = true;
        this.grid.mapOverlay = false;

      } else {
        // Default patterns
        this.sandboxMode = true;
        this.grid.mapOverlay = false;

      }

      // Initialize the victor percent running average window array
      var maxDim = this.runningAvgMaxDim;
      // var maxDim = Math.max(2*this.columns, 2*this.rows);
      for (var i = 0; i < maxDim; i++) {
        this.runningAvgWindow[i] = 0;
      }

      // The following configuration/user variables can always be set,
      // regardless of whether in game mode, map mode, or sandbox mode

      // Initial grid config
      grid = parseInt(this.helpers.getUrlParameter('grid'), 10);
      if (isNaN(grid) || grid < 1 || grid > this.grid.schemes.length) {
        grid = 0;
      }
      this.grid.current = 1 - grid;

      // Add ?autoplay=1 to the end of the URL to enable autoplay
      this.autoplay = this.helpers.getUrlParameter('autoplay') === '1' ? true : this.autoplay;

      // Add ?trail=1 to the end of the URL to show trails
      this.trail.current = this.helpers.getUrlParameter('trail') === '1' ? true : this.trail.current;
    },

    /**
     * Load world state from config
     *
     * This method is complicated because it loads the data,
     * and a lot of other actions have to wait for the data
     * to be loaded before they can be completed.
     */
    loadState : function() {

      if (this.gameId != null) {

        // ~~~~~~~~~~ GAME MODE ~~~~~~~~~~

        // Load a game from the /game API endpoint
        let url = this.baseApiUrl + '/game/' + this.gameId;
        fetch(url)
        .then(res => res.json())
        .then((gameApiResult) => {
      
          // Remove loading message, show controls and grid
          this.removeLoadingElem();
          this.showControlsElem();
          this.showGridElem();

          this.gameApiResult = gameApiResult;

          // Set the game title
          var gameTitleElem = document.getElementById('golly-game-title');
          if (gameApiResult.isPostseason == true) {
            var sp1 = gameApiResult.season + 1;
            gameTitleElem.innerHTML = "Rainbow Cup: " + gameApiResult.description + " <small>- S" + sp1 + "</small>";
          } else {
            var sp1 = gameApiResult.season + 1;
            var dp1 = gameApiResult.day + 1;
            var descr = "Rainbow Season " + sp1 + " Day " + dp1;
            gameTitleElem.innerHTML = descr;
          }

          // Determine if we know a winner/loser
          if (
            this.gameApiResult.hasOwnProperty('team1Score') && 
            this.gameApiResult.hasOwnProperty('team2Score') && 
            this.gameApiResult.hasOwnProperty('team3Score') && 
            this.gameApiResult.hasOwnProperty('team4Score')
          ) {
            var s1 = this.gameApiResult.team1Score;
            var s2 = this.gameApiResult.team2Score;
            var s3 = this.gameApiResult.team3Score;
            var s4 = this.gameApiResult.team4Score;
            this.showWinnersLosers = true;
            if (s1 > s2) {
              this.whoWon = 1;
            } else {
              this.whoWon = 2;
            }
          }

          this.setTeamNames();
          this.setColors();
          this.drawIcons();

          // If the game is season 0-1,
          // use the legacy stopping criteria (to preserve outcome)
          // otherwise, use updated stopping criteria
          this.legacyStoppingCriteria = (this.gameApiResult.season < 3);

          // Map initial conditions
          this.initialState1 = this.gameApiResult.initialConditions1;
          this.initialState2 = this.gameApiResult.initialConditions2;
          this.initialState3 = this.gameApiResult.initialConditions3;
          this.initialState4 = this.gameApiResult.initialConditions4;
          this.columns = this.gameApiResult.columns;
          this.rows = this.gameApiResult.rows;
          this.cellSize = this.gameApiResult.cellSize;
          this.mapName = this.gameApiResult.mapName;
          this.mapZone1Name = this.gameApiResult.mapZone1Name;
          this.mapZone2Name = this.gameApiResult.mapZone2Name;
          this.mapZone3Name = this.gameApiResult.mapZone3Name;
          this.mapZone4Name = this.gameApiResult.mapZone4Name;

          this.setZoomState();
          this.setInitialState();

          this.updateMapLabels();
          this.updateTeamNamesColors();
          this.updateTeamRecords();
          this.updateGameInitCounts();
          this.updateGameControls();
          this.updateWinLossLabels();

          this.canvas.init();
          this.registerEvents();
          this.prepare()

        })
        .catch(err => { 
          this.error(-1);
          //throw err 
        });
        // Done loading game from /game API endpoint

      } else if (this.patternName != null) {

        // ~~~~~~~~~~ MAP MODE ~~~~~~~~~~

        // Get user-specified rows/cols, if any
        var rows = this.getRowsFromUrlSafely();
        var cols = this.getColsFromUrlSafely();

        // Load a random map from the /map API endpoint
        let url = this.mapsApiUrl + '/map/rainbow/' + this.patternName + '/r/' + this.getRowsFromUrlSafely() + '/c/' + this.getColsFromUrlSafely();
        fetch(url)
        .then(res => res.json())
        .then((mapApiResult) => {

          // Remove loading message, show controls and grid
          this.removeLoadingElem();
          this.showControlsElem();
          this.showGridElem();

          // Set the game title
          var gameTitleElem = document.getElementById('golly-game-title');
          gameTitleElem.innerHTML = "Rainbow Map: " + mapApiResult.mapName;

          this.setTeamNames();
          this.setColors();

          // Initial conditions
          this.initialState1 = mapApiResult.initialConditions1;
          this.initialState2 = mapApiResult.initialConditions2;
          this.initialState3 = mapApiResult.initialConditions3;
          this.initialState4 = mapApiResult.initialConditions4;

          this.columns = mapApiResult.columns;
          this.rows = mapApiResult.rows;
          this.cellSize = mapApiResult.cellSize;

          this.mapName = mapApiResult.mapName;
          this.mapZone1Name = mapApiResult.mapZone1Name;
          this.mapZone2Name = mapApiResult.mapZone2Name;
          this.mapZone3Name = mapApiResult.mapZone3Name;
          this.mapZone4Name = mapApiResult.mapZone4Name;

          this.setZoomState();
          this.setInitialState();

          this.updateMapLabels();
          this.updateTeamNamesColors();
          this.updateTeamRecords();
          this.updateGameInitCounts();
          this.updateGameControls();

          this.canvas.init();
          this.registerEvents();
          this.prepare()

        })
        .catch(err => { 
          this.error(-1);
          //throw err 
        });
        // Done loading pattern from /map API endpoint

      } else {

        // ~~~~~~~~~~ PLAIN OL SANDBOX MODE ~~~~~~~~~~

        this.setTeamNames();
        this.setColors();
        this.setZoomState();

        if (this.random == 1) {
          // Load a random configuration for each state
          this.initialState1 = 'random';
          this.initialState2 = 'random';
          this.initialState3 = 'random';
          this.initialState4 = 'random';

          // Set the game title
          var gameTitleElem = document.getElementById('golly-game-title');
          gameTitleElem.innerHTML = "Rainbow Random Pattern";

        } else if ((this.s1user != null) || (this.s2user != null)) {
          if (this.s1user != null) {
            this.initialState1 = this.s1user;
          } else {
            this.initialState1 = [{}];
          }
          if (this.s2user != null) {
            this.initialState2 = this.s2user;
          } else {
            this.initialState2 = [{}];
          }
          if (this.s3user != null) {
            this.initialState3 = this.s3user;
          } else {
            this.initialState3 = [{}];
          }
          if (this.s4user != null) {
            this.initialState4 = this.s4user;
          } else {
            this.initialState4 = [{}];
          }

          // Set the game title
          var gameTitleElem = document.getElementById('golly-game-title');
          gameTitleElem.innerHTML = "Rainbow Sandbox";

        } else {
          this.initialState1 = this.s1Default;
          this.initialState2 = this.s2Default;
          this.initialState3 = this.s3Default;
          this.initialState4 = this.s4Default;

          // Set the game title
          var gameTitleElem = document.getElementById('golly-game-title');
          gameTitleElem.innerHTML = "Rainbow Sandbox";

        }

        // Remove loading message, show controls and grid
        this.removeLoadingElem();
        this.showControlsElem();
        this.showGridElem();

        this.setInitialState();

        this.updateMapLabels();
        this.updateTeamNamesColors();
        this.updateTeamRecords();
        this.updateGameInitCounts();
        this.updateGameControls();

        this.canvas.init();
        this.registerEvents();
        this.prepare()
      }
    },

    /**
     * Update the Game of Life with initial cell counts/stats.
     */
    updateGameInitCounts : function() {

      // Update live counts for initial state
      this.element.generation.innerHTML = '0';
      var liveCounts = this.getCounts();
      this.updateStatisticsElements(liveCounts);
      // If three cell counts are 0 to begin with, disable victory check
      this.zeroStart = false;
      var zeroScores = 0;
      if (liveCounts.liveCells1 == 0) { zeroScores++; }
      if (liveCounts.liveCells2 == 0) { zeroScores++; }
      if (liveCounts.liveCells3 == 0) { zeroScores++; }
      if (liveCounts.liveCells4 == 0) { zeroScores++; }
      var shutoutConditions = (zeroScores == 3);
      if (shutoutConditions) {
        this.zeroStart = true;
      }
    },

    /**
     * Update the Game of Life scoreboard with winner/loser
     * indicators, if this is a game and we know the score.
     */
    updateWinLossLabels : function() {

      if (GOL.showWinnersLosers) {
        // If time to show winners/losers and no victor,
        // it's because this game is in the past.
        if (this.foundVictor === false) {
          this.ranks = [this.gameApiResult.team1Rank, this.gameApiResult.team2Rank, this.gameApiResult.team3Rank, this.gameApiResult.team4Rank];
        }

        if(this.ranks[0] == 0) {
            GOL.element.team1rank.innerHTML = "+11🌈";
        } else if(this.ranks[0] == 1) {
            GOL.element.team1rank.innerHTML = "+7🌈";
        } else if(this.ranks[0] == 2) {
            GOL.element.team1rank.innerHTML = "+3🌈";
        } else if(this.ranks[0] == 3) {
            GOL.element.team1rank.innerHTML = "L";
        }

        if(this.ranks[1] == 0) {
            GOL.element.team2rank.innerHTML = "+11🌈";
        } else if(this.ranks[1] == 1) {
            GOL.element.team2rank.innerHTML = "+7🌈";
        } else if(this.ranks[1] == 2) {
            GOL.element.team2rank.innerHTML = "+3🌈";
        } else if(this.ranks[1] == 3) {
            GOL.element.team2rank.innerHTML = "L";
        }

        if(this.ranks[2] == 0) {
            GOL.element.team3rank.innerHTML = "+11🌈";
        } else if(this.ranks[2] == 1) {
            GOL.element.team3rank.innerHTML = "+7🌈";
        } else if(this.ranks[2] == 2) {
            GOL.element.team3rank.innerHTML = "+3🌈";
        } else if(this.ranks[2] == 3) {
            GOL.element.team3rank.innerHTML = "L";
        }

        if(this.ranks[3] == 0) {
            GOL.element.team4rank.innerHTML = "+11🌈";
        } else if(this.ranks[3] == 1) {
            GOL.element.team4rank.innerHTML = "+7🌈";
        } else if(this.ranks[3] == 2) {
            GOL.element.team4rank.innerHTML = "+3🌈";
        } else if(this.ranks[3] == 3) {
            GOL.element.team4rank.innerHTML = "L";
        }

        // Losers should be in red.
        var last = 3;
        if (this.ranks[0]==last) {
          GOL.element.team1rank.classList.remove('badge-success');
          GOL.element.team1rank.classList.add('badge-danger');
        }
        if (this.ranks[1]==last) {
          GOL.element.team2rank.classList.remove('badge-success');
          GOL.element.team2rank.classList.add('badge-danger');
        }
        if (this.ranks[2]==last) {
          GOL.element.team3rank.classList.remove('badge-success');
          GOL.element.team3rank.classList.add('badge-danger');
        }
        if (this.ranks[3]==last) {
          GOL.element.team4rank.classList.remove('badge-success');
          GOL.element.team4rank.classList.add('badge-danger');
        }

      }
    },

    /**
     * Update the Game of Life controls depending on what mode we're in.
     */
    updateGameControls : function() {
      if (this.gameMode === true) {
        // In game mode, hide controls that the user won't need
        this.element.clearButton.remove();
      }
    },

    /**
     * Update map labels using loaded map label data
     */
    updateMapLabels : function() {
      if (this.grid.mapOverlay===true) {
        this.element.mapName.innerHTML = this.mapName;
        this.element.z1lab.innerHTML = this.mapZone1Name;
        this.element.z2lab.innerHTML = this.mapZone2Name;
        this.element.z3lab.innerHTML = this.mapZone3Name;
        this.element.z4lab.innerHTML = this.mapZone4Name;
      } else {
        // Remove the Map line from the scoreboard
        this.element.mapPanel.remove();
        this.element.z1lab.remove();
        this.element.z2lab.remove();
        this.element.z3lab.remove();
        this.element.z4lab.remove();
      }

    },

    /**
     * Set the names of the two teams
     */
    setTeamNames : function() {
      if (this.gameMode === true) {
        // If game mode, get team names from game API result
        this.teamNames = [this.gameApiResult.team1Name, this.gameApiResult.team2Name, this.gameApiResult.team3Name, this.gameApiResult.team4Name];
      } else {
        // Use color labels
        this.teamNames = this.colors.schemes[this.colors.current].alive_labels;
      }
    },
      
    /**
     * Set the default color palatte.
     * There is a default set of color pallettes that are colorblind-friendly.
     * In game mode, we insert the two teams' default colors,
     * but still allow folks to cycle through other color schemes.
     */
    setColors : function() {
      if (this.gameMode === true) {
        // Modify the color schemes available:
        // - insert the two teams' original color schemes in front
        // - update the labels for each color scheme to be the team names
        this.colors.schemes.unshift({
          alive : [this.gameApiResult.team1Color, this.gameApiResult.team2Color, this.gameApiResult.team3Color, this.gameApiResult.team4Color],
          alive_labels : [this.gameApiResult.team1Name, this.gameApiResult.team2Name, this.gameApiResult.team3Name, this.gameApiResult.team4Name]
        });
        this.colors.current = 0;
        this.colors.alive = this.colors.schemes[this.colors.current].alive;

      } else {
        // Parse color options and pick out scheme
        colorpal = parseInt(this.helpers.getUrlParameter('color'));
        if (isNaN(colorpal) || colorpal < 1 || colorpal > this.colors.schemes.length) {
          colorpal = 1;
        }
        this.colors.current = colorpal - 1;
        this.colors.alive = this.colors.schemes[this.colors.current].alive;
      }
    },

    /**
     * Draw the icons for each team.
     * Get data from the /teams endpoint first.
     * Team abbreviation.
     * This is only called when in gameMode.
     */
    drawIcons : function() {

      // Get team abbreviations from /teams endpoint
      // (abbreviations are used to get svg filename)
      let url = this.baseApiUrl + '/teams/' + this.gameApiResult.season;
      fetch(url)
      .then(res => res.json())
      .then((teamApiResult) => {

        this.teamApiResult = teamApiResult;

        // Assemble team1/2/3/4 abbreviations
        var teamAbbrs = ['', '', '', ''];
        var k;
        for (k = 0; k < teamApiResult.length; k++) {
          if (teamApiResult[k].teamName === this.gameApiResult.team1Name) {
            teamAbbrs[0] = teamApiResult[k].teamAbbr.toLowerCase();
          } else if (teamApiResult[k].teamName === this.gameApiResult.team2Name) {
            teamAbbrs[1] = teamApiResult[k].teamAbbr.toLowerCase();
          } else if (teamApiResult[k].teamName === this.gameApiResult.team3Name) {
            teamAbbrs[2] = teamApiResult[k].teamAbbr.toLowerCase();
          } else if (teamApiResult[k].teamName === this.gameApiResult.team4Name) {
            teamAbbrs[3] = teamApiResult[k].teamAbbr.toLowerCase();
          }
        }

        // Assemble team colors/names
        var teamColors = [this.gameApiResult.team1Color, this.gameApiResult.team2Color, this.gameApiResult.team3Color, this.gameApiResult.team4Color];
        var teamNames = [this.gameApiResult.team1Name, this.gameApiResult.team2Name, this.gameApiResult.team3Name, this.gameApiResult.team4Name];

        // For each team, make a new <object> tag
        // that gets data from an svg file.
        var iconSize = "25";
        var i;
        for (i = 0; i < 4; i++) {
          var ip1 = i + 1;
          var containerId = "team" + ip1 + "-icon-container";
          var iconId = "team" + ip1 + "-icon";

          var container = document.getElementById(containerId);
          var svg = document.createElement("object");
          svg.setAttribute('type', 'image/svg+xml');
          svg.setAttribute('data', '../img/' + teamAbbrs[i].toLowerCase() + '.svg');
          svg.setAttribute('height', iconSize);
          svg.setAttribute('width', iconSize);
          svg.setAttribute('id', iconId);
          svg.classList.add('icon');
          svg.classList.add('team-icon');
          svg.classList.add('invisible');
          container.appendChild(svg);

          // Wait a little bit for the data to load,
          // then modify the color and make it visible
          var paint = function(color, elemId) {
            var mysvg = $('#' + elemId).getSVG();
            var child = mysvg.find("g path:first-child()");
            if (child.length > 0) {
              child.attr('fill', color);
              $('#' + elemId).removeClass('invisible');
            }
          }
          // This fails pretty often, so try a few times.
          setTimeout(paint, 100,  teamColors[i], iconId);
          setTimeout(paint, 250,  teamColors[i], iconId);
          setTimeout(paint, 500,  teamColors[i], iconId);
          setTimeout(paint, 1000, teamColors[i], iconId);
          setTimeout(paint, 1500, teamColors[i], iconId);
        }

      })
      .catch();
      // Note: intentionally do nothing.
      // If we can't figure out how to draw
      // the team icon, just leave it be.

    },

    getRowsFromUrlSafely : function() {
      // Get the number of rows from the URL parameters,
      // checking the specified value and setting to default
      // if invalid or not specified
      rows = parseInt(this.helpers.getUrlParameter('rows'));
      if (isNaN(rows) || rows < 0 || rows > 1000) {
        rows = this.defaultRows;
      }
      if (rows >= 200) {
        // Turn off the grid
        this.grid.current = 1;
      }
      return rows;
    },

    getColsFromUrlSafely : function() {
      // Get the number of cols from the URL parameters,
      // checking the specified value and setting to default
      // if invalid or not specified
      cols = parseInt(this.helpers.getUrlParameter('cols'));
      if (isNaN(cols) || cols < 0 || cols > 1000) {
        cols = this.defaultCols;
      }
      if (cols >= 200) {
        // Turn off the grid
        this.grid.current = 1;
      }
      return cols;
    },

    getCellSizeFromUrlSafely : function() {
      // Get the cell size from the URL parameters,
      // checking the specified value and setting to default
      // if invalid or not specified
      cellSize = parseInt(this.helpers.getUrlParameter('cellSize'));
      if (isNaN(cellSize) || cellSize < 1 || cellSize > 10) {
        cellSize = this.defaultCellSize;
      }
      if (cellSize <= 5) {
        // Turn off the grid
        this.grid.current = 1;
      }
      return cellSize;
    },

    /**
     * Set number of rows/columns and cell size.
     */
    setZoomState : function() {
      if (this.gameMode === true || this.mapMode === true) {
        /* we are all good
        this.columns  = this.mapApiResult.columns;
        this.rows     = this.mapApiResult.rows;
        this.cellSize = this.mapApiResult.cellSize;
         */
      } else {
        this.columns = this.getColsFromUrlSafely();
        this.rows = this.getRowsFromUrlSafely();
        this.cellSize = this.getCellSizeFromUrlSafely();
      }
    },

    /**
     * Parse the initial state variables s1/s2/s3/s4.
     * Initialize the internal state of the simulator.
     *
     * The internal state is stored as a list of live cells,
     * in the form of an array of arrays with this scheme:
     * [
     *   [ y1, x1, x2, x3, x4, x5 ],
     *   [ y2, x6, x7, x8, x9, x10 ],
     *   ...
     * ]
     */
    setInitialState : function() {

      // state 1 parameter
      if (this.initialState1 === 'random') {
        this.randomState(1);
      } else {
        state1 = jsonParse(decodeURI(this.initialState1));
        var irow, icol, y;
        for (irow = 0; irow < state1.length; irow++) {
          for (y in state1[irow]) {
            for (icol = 0 ; icol < state1[irow][y].length ; icol++) {
              var yy = parseInt(y);
              var xx = state1[irow][yy][icol];
              this.listLife.addCell(xx, yy, this.listLife.actualState);
              this.listLife.addCell(xx, yy, this.listLife.actualState1);
            }
          }
        }
      }

      // state 2 parameter
      if (this.initialState2 === 'random') {
        this.randomState(2);
      } else {
        state2 = jsonParse(decodeURI(this.initialState2));
        var irow, icol, y;
        for (irow = 0; irow < state2.length; irow++) {
          for (y in state2[irow]) {
            for (icol = 0 ; icol < state2[irow][y].length ; icol++) {
              var yy = parseInt(y);
              var xx = state2[irow][yy][icol];
              if (!this.listLife.isAlive(xx, yy)) {
                this.listLife.addCell(xx, yy, this.listLife.actualState);
                this.listLife.addCell(xx, yy, this.listLife.actualState2);
              }
            }
          }
        }
      }

      // state 3 parameter
      if (this.initialState3 === 'random') {
        this.randomState(3);
      } else {
        state3 = jsonParse(decodeURI(this.initialState3));
        var irow, icol, y;
        for (irow = 0; irow < state3.length; irow++) {
          for (y in state3[irow]) {
            for (icol = 0 ; icol < state3[irow][y].length ; icol++) {
              var yy = parseInt(y);
              var xx = state3[irow][yy][icol];
              if (!this.listLife.isAlive(xx, yy)) {
                this.listLife.addCell(xx, yy, this.listLife.actualState);
                this.listLife.addCell(xx, yy, this.listLife.actualState3);
              }
            }
          }
        }
      }

      // state 4 parameter
      if (this.initialState4 === 'random') {
        this.randomState(4);
      } else {
        state4 = jsonParse(decodeURI(this.initialState4));
        var irow, icol, y;
        for (irow = 0; irow < state4.length; irow++) {
          for (y in state4[irow]) {
            for (icol = 0 ; icol < state4[irow][y].length ; icol++) {
              var yy = parseInt(y);
              var xx = state4[irow][yy][icol];
              if (!this.listLife.isAlive(xx, yy)) {
                this.listLife.addCell(xx, yy, this.listLife.actualState);
                this.listLife.addCell(xx, yy, this.listLife.actualState4);
              }
            }
          }
        }
      }
    },


    /**
     * Create a random pattern for the given color.
     *
     * color parameter:
     *   0: set random pattern for both colors
     *   1: set random pattern for team/color 1
     *   2: set random pattern for team/color 2
     *   3: set random pattern for team/color 3
     *   4: set random pattern for team/color 4
     */
    randomState : function(color) {
      // original pct was 12%, for binary we split 5%
      var i, liveCells = (this.rows * this.columns) * 0.05;

      if (color===0 || color===1) {
        // Color 1
        for (i = 0; i < liveCells; i++) {
          var xx = this.helpers.random(0, this.columns - 1);
          var yy = this.helpers.random(0, this.rows - 1);
          while (this.listLife.isAlive(xx, yy)) {
              xx = this.helpers.random(0, this.columns - 1);
              yy = this.helpers.random(0, this.rows - 1);
          }
          this.listLife.addCell(xx, yy, this.listLife.actualState);
          this.listLife.addCell(xx, yy, this.listLife.actualState1);
        }
      }

      if (color===0 || color===2) {
        // Color 2
        for (i = 0; i < liveCells; i++) {
          var xx = this.helpers.random(0, this.columns - 1);
          var yy = this.helpers.random(0, this.rows - 1);
          while (this.listLife.isAlive(xx, yy)) {
              xx = this.helpers.random(0, this.columns - 1);
              yy = this.helpers.random(0, this.rows - 1);
          }
          this.listLife.addCell(xx, yy, this.listLife.actualState);
          this.listLife.addCell(xx, yy, this.listLife.actualState2);
        }
      }

      if (color===0 || color===3) {
        // Color 3
        for (i = 0; i < liveCells; i++) {
          var xx = this.helpers.random(0, this.columns - 1);
          var yy = this.helpers.random(0, this.rows - 1);
          while (this.listLife.isAlive(xx, yy)) {
              xx = this.helpers.random(0, this.columns - 1);
              yy = this.helpers.random(0, this.rows - 1);
          }
          this.listLife.addCell(xx, yy, this.listLife.actualState);
          this.listLife.addCell(xx, yy, this.listLife.actualState3);
        }
      }

      if (color===0 || color===4) {
        // Color 4
        for (i = 0; i < liveCells; i++) {
          var xx = this.helpers.random(0, this.columns - 1);
          var yy = this.helpers.random(0, this.rows - 1);
          while (this.listLife.isAlive(xx, yy)) {
              xx = this.helpers.random(0, this.columns - 1);
              yy = this.helpers.random(0, this.rows - 1);
          }
          this.listLife.addCell(xx, yy, this.listLife.actualState);
          this.listLife.addCell(xx, yy, this.listLife.actualState4);
        }
      }

    },


    /**
     * Clean up actual state and prepare a new run
     */
    cleanUp : function() {
      this.listLife.init(); // Reset/init algorithm
      this.prepare();
    },

    approxEqual : function(a, b, tol) {
      var aa = parseFloat(a);
      var bb = parseFloat(b);
      var smol = 1e-12;
      return Math.abs(a-b)/Math.abs(a + smol) < tol;
    },

    /**
     * Check for a victor
     */
    checkForVictor : function(liveCounts) {
      if (this.zeroStart===true) {
        return;
      }
      if (this.foundVictor==false) {
        var maxDim = this.runningAvgMaxDim;
        // update running average window
        if (this.generation < maxDim) {
          // // keep populating the window...
          if (this.legacyStoppingCriteria) {
            // legacy mode for season 0-1, to preserve existing results
            this.runningAvgWindow[this.generation] = parseFloat(liveCounts.livePct);
          } else {
            // Rainbow Cup criteria uses vector magnitude, to account for changes in all four team scores
            var liveAmt1 = liveCounts.liveCells1;
            var liveAmt2 = liveCounts.liveCells2;
            var liveAmt3 = liveCounts.liveCells3;
            var liveAmt4 = liveCounts.liveCells4;
            this.runningAvgWindow[this.generation] = Math.sqrt(liveAmt1**2 + liveAmt2**2 + liveAmt3**2 + liveAmt4**2);
          }

        } else {
          // // update running average window with next live pct
          if (this.legacyStoppingCriteria) {
            // legacy mode for season 0-2
            var removed = this.runningAvgWindow.shift();
            this.runningAvgWindow.push(parseFloat(liveCounts.liveAmt));
          } else {
            // Rainbow Cup criteria uses vector magnitude
            var liveAmt1 = liveCounts.liveCells1;
            var liveAmt2 = liveCounts.liveCells2;
            var liveAmt3 = liveCounts.liveCells3;
            var liveAmt4 = liveCounts.liveCells4;
            var removed = this.runningAvgWindow.shift();
            this.runningAvgWindow.push(Math.sqrt(liveAmt1**2 + liveAmt2**2 + liveAmt3**2 + liveAmt4**2));
          }

          // compute running average
          var sum = 0.0;
          for (var i = 0; i < this.runningAvgWindow.length; i++) {
            sum += this.runningAvgWindow[i];
          }
          var runningAvg = sum/this.runningAvgWindow.length;

          console.log(runningAvg);

          // update running average last 3
          removed = this.runningAvgLast3.shift();
          this.runningAvgLast3.push(runningAvg);

          // Ignore case of running average of 0
          var tol = 1e-8;
          if (!this.approxEqual(removed, 0.0, tol)) {
            // We have a nonzero running average, and no victor,
            // check if average has become stable
            var bool0eq1 = this.approxEqual(this.runningAvgLast3[0], this.runningAvgLast3[1], tol);
            var bool1eq2 = this.approxEqual(this.runningAvgLast3[1], this.runningAvgLast3[2], tol);
            var victoryByStability = ((bool0eq1 && bool1eq2) && (liveCounts.liveCells > 0));
            if (victoryByStability) {
              // Someone won due to the simulation becoming stable
              this.ranks = this.getRanks(liveCounts);
              this.foundVictor = true;
              this.showWinnersLosers = true;
              this.handlers.buttons.run();
              this.running = false;
            }
          }
        } // end if gen > maxDim

        // Second way for a victor to be declared,
        // is to have three teams get shut out.
        var zeroScores = 0;
        if (liveCounts.liveCells1 == 0) { zeroScores++; }
        if (liveCounts.liveCells2 == 0) { zeroScores++; }
        if (liveCounts.liveCells3 == 0) { zeroScores++; }
        if (liveCounts.liveCells4 == 0) { zeroScores++; }
        var victoryByShutout = (zeroScores == 3);
        if (victoryByShutout) {
          // Someone won because everyone else died
          this.ranks = this.getRanks(liveCounts);
          this.foundVictor = true;
          this.showWinnersLosers = true;
          this.handlers.buttons.run();
          this.running = false;
        }
      } // end if no victor found
    },

    getRanks : function(liveCounts) {
      // Return an array of 4 elements:
      // The ranks of each team
      // [team1rank, team2rank, team3rank, team4rank]
      //
      // TODO:
      // This accounts for 0 = last place,
      // but it still doesn't give us
      // the information we want:
      // Teams, and points earned.
      //
      var unsortedScores = [
        liveCounts.liveCells1, 
        liveCounts.liveCells2, 
        liveCounts.liveCells3, 
        liveCounts.liveCells4
      ];
      var sortedScores = [...unsortedScores];
      sortedScores.sort(function(a, b){return b-a});
      var ranks = [3, 3, 3, 3];
      var i;
      for (i=0; i<4; i++) {
        if (unsortedScores[i] > 0) {
          ranks[i] = sortedScores.indexOf(unsortedScores[i]);
        }
      }
      return ranks;
    },

    /**
     * Update the statistics
     */
    updateStatisticsElements : function(liveCounts) {
      // TODO: fix this
      this.element.livecells.innerHTML  = liveCounts.liveCells;
      this.element.livecells1.innerHTML = liveCounts.liveCells1;
      this.element.livecells2.innerHTML = liveCounts.liveCells2;
      this.element.livecells3.innerHTML = liveCounts.liveCells3;
      this.element.livecells4.innerHTML = liveCounts.liveCells4;
      this.element.livepct.innerHTML    = liveCounts.livePct.toFixed(1) + "%";
    },

    /**
     * Prepare DOM elements and Canvas for a new run
     */
    prepare : function() {
      this.generation = this.times.algorithm = this.times.gui = 0;
      this.mouseDown = this.clear.schedule = false;

      this.canvas.clearWorld(); // Reset GUI
      this.canvas.drawWorld(); // Draw State

      if (this.autoplay) { // Next Flow
        this.autoplay = false;
        this.handlers.buttons.run();
      }
    },

    updateTeamRecords : function() {
      if (this.gameMode === true) {
        var game = this.gameApiResult;
        if (game.isPostseason) {
          // Postseason: win-loss record in current series
          var t1_wlstr = game.team1SeriesW23L[0] + "-" + game.team1SeriesW23L[1] + "-" + game.team1SeriesW23L[2] + "-" + game.team1SeriesW23L[3];
          var t2_wlstr = game.team2SeriesW23L[0] + "-" + game.team2SeriesW23L[1] + "-" + game.team2SeriesW23L[2] + "-" + game.team2SeriesW23L[3];
          var t3_wlstr = game.team3SeriesW23L[0] + "-" + game.team3SeriesW23L[1] + "-" + game.team3SeriesW23L[2] + "-" + game.team3SeriesW23L[3];
          var t4_wlstr = game.team4SeriesW23L[0] + "-" + game.team4SeriesW23L[1] + "-" + game.team4SeriesW23L[2] + "-" + game.team4SeriesW23L[3];

          this.element.team1wlrec.innerHTML = t1_wlstr;
          this.element.team2wlrec.innerHTML = t2_wlstr;
          this.element.team3wlrec.innerHTML = t3_wlstr;
          this.element.team4wlrec.innerHTML = t4_wlstr;

          var t1_rainstr = (11*game.team1SeriesW23L[0] + 7*game.team1SeriesW23L[1] + 3*game.team1SeriesW23L[2]) + " 🌈";
          var t2_rainstr = (11*game.team2SeriesW23L[0] + 7*game.team2SeriesW23L[1] + 3*game.team2SeriesW23L[2]) + " 🌈";
          var t3_rainstr = (11*game.team3SeriesW23L[0] + 7*game.team3SeriesW23L[1] + 3*game.team3SeriesW23L[2]) + " 🌈";
          var t4_rainstr = (11*game.team4SeriesW23L[0] + 7*game.team4SeriesW23L[1] + 3*game.team4SeriesW23L[2]) + " 🌈";

          this.element.team1rain.innerHTML = t1_rainstr;
          this.element.team2rain.innerHTML = t2_rainstr;
          this.element.team3rain.innerHTML = t3_rainstr;
          this.element.team4rain.innerHTML = t4_rainstr;

        } else {
          // Season: win-loss record to date
          var t1_wlstr = game.team1W23L[0] + "-" + game.team1W23L[1] + "-" + game.team1W23L[2] + "-" + game.team1W23L[3];
          var t2_wlstr = game.team2W23L[0] + "-" + game.team2W23L[1] + "-" + game.team2W23L[2] + "-" + game.team2W23L[3];
          var t3_wlstr = game.team3W23L[0] + "-" + game.team3W23L[1] + "-" + game.team3W23L[2] + "-" + game.team3W23L[3];
          var t4_wlstr = game.team4W23L[0] + "-" + game.team4W23L[1] + "-" + game.team4W23L[2] + "-" + game.team4W23L[3];

          this.element.team1wlrec.innerHTML = t1_wlstr;
          this.element.team2wlrec.innerHTML = t2_wlstr;
          this.element.team3wlrec.innerHTML = t3_wlstr;
          this.element.team4wlrec.innerHTML = t4_wlstr;

          var t1_rainstr = (11*game.team1W23L[0] + 7*game.team1W23L[1] + 3*game.team1W23L[2]) + " 🌈"; 
          var t2_rainstr = (11*game.team2W23L[0] + 7*game.team2W23L[1] + 3*game.team2W23L[2]) + " 🌈"; 
          var t3_rainstr = (11*game.team3W23L[0] + 7*game.team3W23L[1] + 3*game.team3W23L[2]) + " 🌈"; 
          var t4_rainstr = (11*game.team4W23L[0] + 7*game.team4W23L[1] + 3*game.team4W23L[2]) + " 🌈"; 

          this.element.team1rain.innerHTML = t1_rainstr;
          this.element.team2rain.innerHTML = t2_rainstr;
          this.element.team3rain.innerHTML = t3_rainstr;
          this.element.team4rain.innerHTML = t4_rainstr;

        }
      } else {

        // TODO When not in game mode, do the following:
        // - remove table columns for records and rainbows
        // - shrink icons column to 0px
        // - shrink scoreboard container to sm-4
        var elems;
        var i, j, k;

        // Delete unused columns from scoreboard table
        var idsToDelete = ['scoreboard-table-column-icon', 'scoreboard-table-column-spacing', 'scoreboard-table-column-record', 'scoreboard-table-column-rainbows'];
        for(i = 0; i < idsToDelete.length; i++) {
          idToDelete = idsToDelete[i];
          elems = document.getElementsByClassName(idToDelete);
          while(elems[0]) {
            elems[0].parentNode.removeChild(elems[0]);
          }
        }

        // Shrink scoreboard container to sm-4
        var elem = document.getElementById('scoreboard-panels-container');
        elem.classList.remove('col-sm-8');
        elem.classList.add('col-sm-4');

      }
    },

    updateTeamNamesColors : function() {
      var i, e;

      // Team colors
      for (i = 0; i < this.element.team1color.length; i++) {
        e = this.element.team1color[i];
        e.style.color = this.colors.alive[0];
      }
      for (i = 0; i < this.element.team2color.length; i++) {
        e = this.element.team2color[i];
        e.style.color = this.colors.alive[1];
      }
      for (i = 0; i < this.element.team3color.length; i++) {
        e = this.element.team3color[i];
        e.style.color = this.colors.alive[2];
      }
      for (i = 0; i < this.element.team4color.length; i++) {
        e = this.element.team4color[i];
        e.style.color = this.colors.alive[3];
      }

      // Team names
      for (i = 0; i < this.element.team1name.length; i++) {
        e = this.element.team1name[i];
        e.innerHTML = this.teamNames[0];
      }
      for (i = 0; i < this.element.team2name.length; i++) {
        e = this.element.team2name[i];
        e.innerHTML = this.teamNames[1];
      }
      for (i = 0; i < this.element.team3name.length; i++) {
        e = this.element.team3name[i];
        e.innerHTML = this.teamNames[2];
      }
      for (i = 0; i < this.element.team4name.length; i++) {
        e = this.element.team4name[i];
        e.innerHTML = this.teamNames[3];
      }
    },

    getCounts : function() {
      var liveCounts = GOL.listLife.getLiveCounts();
      return liveCounts;
    },

    /**
     * keepDOMElements
     * Save DOM references for this session (one time execution)
     */
    keepDOMElements : function() {
      // TODO: fix this
      this.element.generation = document.getElementById('generation');
      this.element.livecells  = document.getElementById('livecells');
      this.element.livecells1 = document.getElementById('livecells1');
      this.element.livecells2 = document.getElementById('livecells2');
      this.element.livecells3 = document.getElementById('livecells3');
      this.element.livecells4 = document.getElementById('livecells4');

      this.element.team1wlrec = document.getElementById("team1record");
      this.element.team2wlrec = document.getElementById("team2record");
      this.element.team3wlrec = document.getElementById("team3record");
      this.element.team4wlrec = document.getElementById("team4record");

      this.element.team1rain = document.getElementById("team1rainbows");
      this.element.team2rain = document.getElementById("team2rainbows");
      this.element.team3rain = document.getElementById("team3rainbows");
      this.element.team4rain = document.getElementById("team4rainbows");

      this.element.livepct    = document.getElementById('livePct');
      // this.element.territory1 = document.getElementById('territory1');
      // this.element.territory2 = document.getElementById('territory2');

      this.element.team1color = document.getElementsByClassName("team1color");
      this.element.team1name  = document.getElementsByClassName("team1name");

      this.element.team2color = document.getElementsByClassName("team2color");
      this.element.team2name  = document.getElementsByClassName("team2name");

      this.element.team3color = document.getElementsByClassName("team3color");
      this.element.team3name  = document.getElementsByClassName("team3name");

      this.element.team4color = document.getElementsByClassName("team4color");
      this.element.team4name  = document.getElementsByClassName("team4name");

      this.element.clearButton = document.getElementById('buttonClear');
      this.element.colorButton = document.getElementById('buttonColors');

      this.element.mapName = document.getElementById('mapname-label');
      this.element.mapPanel = document.getElementById('stats-panel-map');

      this.element.speedSlider = document.getElementById('speed-slider');

      this.element.z1lab = document.getElementById('zone1label');
      this.element.z2lab = document.getElementById('zone2label');
      this.element.z3lab = document.getElementById('zone3label');
      this.element.z4lab = document.getElementById('zone4label');

      this.element.team1rank = document.getElementById('team1rank');
      this.element.team2rank = document.getElementById('team2rank');
      this.element.team3rank = document.getElementById('team3rank');
      this.element.team4rank = document.getElementById('team4rank');
    },


    /**
     * registerEvents
     * Register event handlers for this session (one time execution)
     */
    registerEvents : function() {

      // Keyboard Events
      this.helpers.registerEvent(document.body, 'keyup', this.handlers.keyboard, false);
      // Controls
      this.helpers.registerEvent(document.getElementById('buttonRun'), 'click', this.handlers.buttons.run, false);
      this.helpers.registerEvent(document.getElementById('buttonStep'), 'click', this.handlers.buttons.step, false);
      if (this.sandboxMode === true || this.mapMode === true) {
        // Clear control only available in sandbox or map mode
        this.helpers.registerEvent(document.getElementById('buttonClear'), 'click', this.handlers.buttons.clear, false);
      }

      // Speed control slider
      this.helpers.registerEvent(document.getElementById('speed-slider'), 'input', this.handlers.buttons.speedControl, false);

      // Layout
      this.helpers.registerEvent(document.getElementById('buttonTrail'), 'click', this.handlers.buttons.trail, false);
      this.helpers.registerEvent(document.getElementById('buttonGrid'), 'click', this.handlers.buttons.grid, false);
      this.helpers.registerEvent(document.getElementById('buttonColors'), 'click', this.handlers.buttons.colorcycle, false);
    },

    /**
     * Run Next Step
     */
    nextStep : function() {
      
      var i, x, y, r;
      var liveCellNumbers, liveCellNumber, liveCellNumber1, liveCellNumber2;
      var algorithmTime, guiTime;

      // Algorithm run

      algorithmTime = (new Date());

      liveCounts = GOL.listLife.nextGeneration();

      algorithmTime = (new Date()) - algorithmTime;

      // Canvas run

      guiTime = (new Date());

      for (i = 0; i < GOL.listLife.redrawList.length; i++) {
        x = GOL.listLife.redrawList[i][0];
        y = GOL.listLife.redrawList[i][1];

        if (GOL.listLife.redrawList[i][2] === 1) {
          GOL.canvas.changeCelltoAlive(x, y);
        } else if (GOL.listLife.redrawList[i][2] === 2) {
          GOL.canvas.keepCellAlive(x, y);
        } else {
          GOL.canvas.changeCelltoDead(x, y);
        }
      }

      guiTime = (new Date()) - guiTime;

      // Post-run updates

      // Clear Trail
      if (GOL.trail.schedule) {
        GOL.trail.schedule = false;
        GOL.canvas.drawWorld();
      }

      // Change Grid
      if (GOL.grid.schedule) {
        GOL.grid.schedule = false;
        GOL.canvas.drawWorld();
      }

      // Change Colors
      if (GOL.colors.schedule) {
        GOL.colors.schedule = false;
        GOL.canvas.drawWorld();
      }

      // Running Information
      GOL.generation++;
      GOL.element.generation.innerHTML = GOL.generation;

      // Update statistics
      GOL.updateStatisticsElements(liveCounts);

      // Check for victor
      GOL.checkForVictor(liveCounts);

      // Update winner/loser if found
      if ((this.foundVictor)||(this.showWinnersLosers)) {
        GOL.updateWinLossLabels();
      }

      r = 1.0/GOL.generation;
      GOL.times.algorithm = (GOL.times.algorithm * (1 - r)) + (algorithmTime * r);
      GOL.times.gui = (GOL.times.gui * (1 - r)) + (guiTime * r);

      var v = this.helpers.getWaitTimeMs();

      // Sleepy time before going on to next step
      setTimeout(() => {
        // Flow Control
        if (GOL.running) {
          GOL.nextStep();
        } else {
          if (GOL.clear.schedule) {
            GOL.cleanUp();
          }
        }
      }, v);

    },


    /** ****************************************************************************************************************************
     * Event Handlers
     */
    handlers : {

      mouseDown : false,
      lastX : 0,
      lastY : 0,


      /**
       * When user clicks down, set mouse down state
       * and change change cell alive/dead state at
       * the current mouse location.
       * (sandbox mode only)
       */
      canvasMouseDown : function(event) {
        if (GOL.sandboxMode === true || GOL.mapMode === true) {
          var position = GOL.helpers.mousePosition(event);
          GOL.canvas.switchCell(position[0], position[1]);
          GOL.handlers.lastX = position[0];
          GOL.handlers.lastY = position[1];
          GOL.handlers.mouseDown = true;
        }
      },


      /**
       * Handle user mouse up instance.
       * (sandbox mode only)
       */
      canvasMouseUp : function() {
        if (GOL.sandboxMode === true || GOL.mapModed === true) {
          GOL.handlers.mouseDown = false;
        }
      },


      /**
       * If we have captured a mouse down event,
       * track where the mouse is going and change
       * cell alive/dead state at mouse location.
       * (sandbox mode only)
       */
      canvasMouseMove : function(event) {
        if (GOL.sandboxMode === true || GOL.mapMode === true) {
          if (GOL.handlers.mouseDown) {
            var position = GOL.helpers.mousePosition(event);
            if ((position[0] !== GOL.handlers.lastX) || (position[1] !== GOL.handlers.lastY)) {
              GOL.canvas.switchCell(position[0], position[1]);
              GOL.handlers.lastX = position[0];
              GOL.handlers.lastY = position[1];
            }
          }
        }
      },


      /**
       * Allow keyboard shortcuts
       */
      keyboard : function(e) {
        var event = e;
        if (!event) {
          event = window.event;
        }

        if (event.keyCode === 67) { // Key: C
          // User can only clear the board in sandbox mode
          if (GOL.sandboxMode === true || GOL.mapMode === true) {
            GOL.handlers.buttons.clear();
          }

        } else if (event.keyCode === 82 ) { // Key: R
          GOL.handlers.buttons.run();

        } else if (event.keyCode === 83 ) { // Key: S
          if (GOL.running) {
            // If running, S will stop the simulation
            GOL.handlers.buttons.run();
          } else {
            GOL.handlers.buttons.step();
          }

        } else if (event.keyCode === 70 ) { // Key: F
          var speed = GOL.element.speedSlider.value;
          speed = speed - 1;
          if (speed===0) {
            speed = 4;
          }
          GOL.element.speedSlider.value = speed;

        } else if (event.keyCode === 71 ) { // Key: G
          GOL.handlers.buttons.grid();

        }
      },


      buttons : {

        /**
         * Button Handler - Run
         */
        run : function() {

          GOL.running = !GOL.running;
          // Update run/stop button state
          if (GOL.running) {
            GOL.nextStep();
            document.getElementById('buttonRun').innerHTML = '<u>S</u>top';
            document.getElementById('buttonRun').classList.remove("btn-success");
            document.getElementById('buttonRun').classList.add("btn-danger");
          } else {
            document.getElementById('buttonRun').innerHTML = '<u>R</u>un';
            document.getElementById('buttonRun').classList.remove("btn-danger");
            document.getElementById('buttonRun').classList.add("btn-success");
          }
        },


        /**
         * Button Handler - Next Step - One Step only
         */
        step : function() {
          if (!GOL.running) {
            GOL.nextStep();
          }
        },


        /**
         * Button Handler - Clear World
         */
        clear : function() {
          if (GOL.sandboxMode === true || GOL.mapMode === true) {
            if (GOL.running) {
              GOL.clear.schedule = true;
              GOL.running = false;
              $("#buttonRun").text("Run");
              document.getElementById('buttonRun').classList.remove("btn-danger");
              document.getElementById('buttonRun').classList.add("btn-success");
            } else {
              GOL.cleanUp();
            }
          }
        },


        /**
         * Button Handler - Remove/Add Trail
         */
        trail : function() {
          GOL.trail.current = !GOL.trail.current;
          if (GOL.running) {
            GOL.trail.schedule = true;
          } else {
            GOL.canvas.drawWorld();
          }
        },

        /**
         * Cycle through the color schemes
         */
        colorcycle : function() {
          GOL.colors.current = (GOL.colors.current + 1) % GOL.colors.schemes.length;
          GOL.colors.alive = GOL.colors.schemes[GOL.colors.current].alive;
          if (GOL.gameMode === false) {
            GOL.teamNames = GOL.colors.schemes[GOL.colors.current].alive_labels;
          }
          GOL.updateTeamNamesColors();
          if (GOL.running) {
            GOL.colors.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },

        /**
         * Show/hide the grid
         */
        grid : function() {
          GOL.grid.current = (GOL.grid.current + 1) % GOL.grid.schemes.length;
          if (GOL.running) {
            GOL.grid.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },

        /**
         * Update simulation speed
         */
        speedControl : function() {
          //console.log('updated speed slider');
          //var x = 0;
          //try {
          //  x = parseInt(document.getElementById("speed-slider").value);
          //} catch {
          //  console.log("Could not read speed-slider value, setting to default of 10 ms");
          //  x = 10;
          //}
          // Set the wait time to be the maximum of
          // 1s and whatever the slider specifies
          //this.waitTimeMs = Math.min(10**x, 1000);
          //console.log("Updated wait time to " + this.waitTimeMs);
        },

      },

    },


    /** ****************************************************************************************************************************
     *
     */
    canvas: {

      context : null,
      width : null,
      height : null,
      age : null,
      cellSize : null,
      cellSpace : null,


      /**
       * init
       */
      init : function() {

        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.cellSize = GOL.cellSize;
        this.cellSpace = 1;

        // register the mousedown/mouseup/mousemove events with function callbacks
        GOL.helpers.registerEvent(this.canvas, 'mousedown', GOL.handlers.canvasMouseDown, false);
        GOL.helpers.registerEvent(document, 'mouseup', GOL.handlers.canvasMouseUp, false);
        GOL.helpers.registerEvent(this.canvas, 'mousemove', GOL.handlers.canvasMouseMove, false);

        this.clearWorld();
      },


      /**
       * clearWorld
       */
      clearWorld : function () {
        var i, j;

        // Init ages (Canvas reference)
        this.age = [];
        for (i = 0; i < GOL.columns; i++) {
          this.age[i] = [];
          for (j = 0; j < GOL.rows; j++) {
            this.age[i][j] = 0; // Dead
          }
        }
      },


      /**
       * drawWorld
       */
      drawWorld : function() {
        var i, j;

        // Special no grid case
        if (GOL.grid.schemes[GOL.grid.current].color === '') {
          this.setNoGridOn();
          this.width = this.height = 0;
        } else {
          this.setNoGridOff();
          this.width = this.height = 1;
        }

        // Dynamic canvas size
        this.width = this.width + (this.cellSpace * GOL.columns) + (this.cellSize * GOL.columns);
        this.canvas.setAttribute('width', this.width);

        this.height = this.height + (this.cellSpace * GOL.rows) + (this.cellSize * GOL.rows);
        this.canvas.setAttribute('height', this.height);

        // Fill background
        this.context.fillStyle = GOL.grid.schemes[GOL.grid.current].color;
        this.context.fillRect(0, 0, this.width, this.height);

        for (i = 0 ; i < GOL.columns; i++) {
          for (j = 0 ; j < GOL.rows; j++) {
            if (GOL.listLife.isAlive(i, j)) {
              this.drawCell(i, j, true);
            } else {
              this.drawCell(i, j, false);
            }
          }
        }

      },


      /**
       * setNoGridOn
       */
      setNoGridOn : function() {
        this.cellSize = GOL.cellSize + 1;
        this.cellSpace = 0;
      },


      /**
       * setNoGridOff
       */
      setNoGridOff : function() {
        this.cellSize = GOL.cellSize;
        this.cellSpace = 1;
      },


      /**
       * drawCell
       */
      drawCell : function (i, j, alive) {

        if (alive) {

          // color by... color
          this.context.fillStyle = GOL.colors.alive[GOL.listLife.getCellColor(i, j) - 1];

        } else {
          if (GOL.trail.current && this.age[i][j] < 0) {
            this.context.fillStyle = GOL.colors.trail[(this.age[i][j] * -1) % GOL.colors.trail.length];
          } else {
            this.context.fillStyle = GOL.colors.dead;
          }
        }

        this.context.fillRect(this.cellSpace + (this.cellSpace * i) + (this.cellSize * i), this.cellSpace + (this.cellSpace * j) + (this.cellSize * j), this.cellSize, this.cellSize);

        // Draw light strokes cutting the canvas through the middle
        if (i===parseInt(GOL.columns/2)) {
          if (GOL.grid.mapOverlay==true) {
            this.context.fillStyle = mapZoneStrokeColor;
            this.context.fillRect(
              (this.cellSpace * i+1) + (this.cellSize * i+1) - 2*this.cellSpace,
              (this.cellSpace * j) + (this.cellSize * j) + this.cellSpace,
              this.cellSpace,
              this.cellSize,
            );
          }
        }

        if (j===parseInt(GOL.rows/2)) {
          if (GOL.grid.mapOverlay==true) {
            this.context.fillStyle = mapZoneStrokeColor;
            this.context.fillRect(
              (this.cellSpace * i+1) + (this.cellSize * i+1) - 2*this.cellSpace,
              (this.cellSpace * j) + (this.cellSize * j) + this.cellSpace,
              this.cellSize,
              this.cellSpace,
            );
          }
        }

      },


      /**
       * switchCell
       * cmr - this is only activated when a user clicks on a cell
       */
      switchCell : function(i, j) {
        if (GOL.sandboxMode===true) {
          if (GOL.listLife.isAlive(i, j)) {
            if (GOL.listLife.getCellColor(i, j) == 1) {
              // Swap colors
              GOL.listLife.removeCell(i, j, GOL.listLife.actualState1);
              GOL.listLife.addCell(i, j, GOL.listLife.actualState2);
              this.keepCellAlive(i, j);
            } else if (GOL.listLife.getCellColor(i, j) == 2) {
              GOL.listLife.removeCell(i, j, GOL.listLife.actualState2);
              GOL.listLife.addCell(i, j, GOL.listLife.actualState3);
              this.keepCellAlive(i, j);
            } else if (GOL.listLife.getCellColor(i, j) == 3) {
              GOL.listLife.removeCell(i, j, GOL.listLife.actualState3);
              GOL.listLife.addCell(i, j, GOL.listLife.actualState4);
              this.keepCellAlive(i, j);
            } else {
              GOL.listLife.removeCell(i, j, GOL.listLife.actualState);
              GOL.listLife.removeCell(i, j, GOL.listLife.actualState4);
              this.changeCelltoDead(i, j);
            }
          } else {
            GOL.listLife.addCell(i, j, GOL.listLife.actualState);
            GOL.listLife.addCell(i, j, GOL.listLife.actualState1);
            this.changeCelltoAlive(i, j);
          }
        }
      },


      /**
       * keepCellAlive
       */
      keepCellAlive : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j]++;
          this.drawCell(i, j, true);
        }
      },


      /**
       * changeCelltoAlive
       */
      changeCelltoAlive : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j] = 1;
          this.drawCell(i, j, true);
        }
      },


      /**
       * changeCelltoDead
       */
      changeCelltoDead : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j] = -this.age[i][j]; // Keep trail
          this.drawCell(i, j, false);
        }
      }

    },


    /** ****************************************************************************************************************************
     *
     */
    listLife : {

      actualState : [],
      actualState1 : [],
      actualState2 : [],
      actualState3 : [],
      actualState4 : [],
      redrawList : [],


      /**
       * Initialize the actual state array (?)
       */
      init : function () {
        this.actualState = [];
      },


      getLiveCounts : function() {
        var i, j;

        var state = GOL.listLife.actualState;
        var liveCells = 0;
        for (i = 0; i < state.length; i++) {
          if ((state[i][0] >= 0) && (state[i][0] < GOL.rows)) {
            for (j = 1; j < state[i].length; j++) {
              if ((state[i][j] >= 0) && (state[i][j] < GOL.columns)) {
                liveCells++;
              }
            }
          }
        }

        var state1 = GOL.listLife.actualState1;
        var liveCells1 = 0;
        for (i = 0; i < state1.length; i++) {
          if ((state1[i][0] >= 0) && (state1[i][0] < GOL.rows)) {
            for (j = 1; j < state1[i].length; j++) {
              if ((state1[i][j] >= 0) && (state1[i][j] < GOL.columns)) {
                liveCells1++;
              }
            }
          }
        }

        var state2 = GOL.listLife.actualState2;
        var liveCells2 = 0;
        for (i = 0; i < state2.length; i++) {
          if ((state2[i][0] >= 0) && (state2[i][0] < GOL.rows)) {
            for (j = 1; j < state2[i].length; j++) {
              if ((state2[i][j] >= 0) && (state2[i][j] < GOL.columns)) {
                liveCells2++;
              }
            }
          }
        }

        var state3 = GOL.listLife.actualState3;
        var liveCells3 = 0;
        for (i = 0; i < state3.length; i++) {
          if ((state3[i][0] >= 0) && (state3[i][0] < GOL.rows)) {
            for (j = 1; j < state3[i].length; j++) {
              if ((state3[i][j] >= 0) && (state3[i][j] < GOL.columns)) {
                liveCells3++;
              }
            }
          }
        }

        var state4 = GOL.listLife.actualState4;
        var liveCells4 = 0;
        for (i = 0; i < state4.length; i++) {
          if ((state4[i][0] >= 0) && (state4[i][0] < GOL.rows)) {
            for (j = 1; j < state4[i].length; j++) {
              if ((state4[i][j] >= 0) && (state4[i][j] < GOL.columns)) {
                liveCells4++;
              }
            }
          }
        }

        var totalArea = GOL.columns * GOL.rows;
        var livePct = ((liveCells1 + liveCells2 + liveCells3 + liveCells4)/(totalArea))*100.0;

        return {
          liveCells: liveCells,
          liveCells1 : liveCells1,
          liveCells2 : liveCells2,
          liveCells3 : liveCells3,
          liveCells4 : liveCells4,
          livePct : livePct,
          // territory1 : territory1,
          // territory2 : territory2,
        };
      },


      nextGeneration : function() {
        var x, xm1, xp1, y, ym1, yp1;
        var i, j, m, n, key, t1, t2;
        var alive = 0, alive1 = 0, alive2 = 0;
        var deadNeighbors;
        var newState = [], newState1 = [], newState2 = [], newState3 = [], newState4 = [];
        var allDeadNeighbors = {};
        var allDeadNeighbors1 = {};
        var allDeadNeighbors2 = {};
        var allDeadNeighbors3 = {};
        var allDeadNeighbors4 = {};
        var neighbors, color, result;
        this.redrawList = [];

        // iterate over each point stored in the actualState list
        for (i = 0; i < this.actualState.length; i++) {
          this.topPointer = 1;
          this.bottomPointer = 1;

          for (j = 1; j < this.actualState[i].length; j++) {
            x = this.actualState[i][j];
            y = this.actualState[i][0];

            x = (x + GOL.columns)%(GOL.columns);
            y = (y + GOL.rows)%(GOL.rows);
            
            xm1 = ((x-1) + GOL.columns)%(GOL.columns);
            ym1 = ((y-1) + GOL.rows)%(GOL.rows);

            xp1 = ((x+1) + GOL.columns)%(GOL.columns);
            yp1 = ((y+1) + GOL.rows)%(GOL.rows);

            // Possible dead neighbors
            deadNeighbors = [[xm1, ym1, 1], [x, ym1, 1], [xp1, ym1, 1], [xm1, y, 1], [xp1, y, 1], [xm1, yp1, 1], [x, yp1, 1], [xp1, yp1, 1]];

            // Get number of live neighbors and remove alive neighbors from deadNeighbors
            result = this.getNeighborsFromAlive(x, y, i, this.actualState, deadNeighbors);
            neighbors = result['neighbors'];
            if (neighbors===2) {
              // Tie, keep current color
              color = this.getCellColor(x, y);
            } else {
              // Majority wins, use color returned by getNeighborsFromAlive
              color = result['color'];
            }

            // Join dead neighbors to check list
            for (m = 0; m < 8; m++) {
              if (deadNeighbors[m] !== undefined) {
                // this cell is dead
                var xx = deadNeighbors[m][0];
                var yy = deadNeighbors[m][1];
                key = xx + ',' + yy; // Create hashtable key

                // count number of dead neighbors
                if (allDeadNeighbors[key] === undefined) {
                  allDeadNeighbors[key] = 1;
                } else {
                  allDeadNeighbors[key]++;
                }
              }
            }

            // survive counts
            //
            // // 34 life (too slow)
            // if ((neighbors == 3) || (neighbors == 4)) {} 
            // // coagulations (blows up)
            // if (!(neighbors === 1)) {} 
            // // gnarl (way too slow/chaotic)
            // if (neighbors === 1) {} 
            // // long life (boring)
            // if (neighbors===5) {} 
            // // stains (too slow)
            // if (!((neighbors===1)||(neighbors===4))) {} 
            // // walled cities
            // if ((neighbors > 1) && (neighbors < 6)) {} 
            //
            // // conway's life
            // if (!(neighbors === 0 || neighbors === 1 || neighbors > 3)) {} 
            // // amoeba life (good)
            // if ((neighbors === 1) || (neighbors === 3) || (neighbors === 5) || (neighbors === 8)) {} 
            // // high life (good, but some oscillators blow up)
            // if ((neighbors===2)||(neighbors===3)) {} 
            // // 2x2 (good, but victory conditions *may* need to change)
            // if ((neighbors===1)||(neighbors===2)||(neighbors===5)){} 
            // // // pseudo life (good)
            // if ((neighbors===2)||(neighbors===3)||(neighbors===8)) {} 

            // conway's life
            if ((neighbors===2)||(neighbors===3)) {

              this.addCell(x, y, newState);
              if (color==1) {
                this.addCell(x, y, newState1);
              } else if (color==2) {
                this.addCell(x, y, newState2);
              } else if (color==3) {
                this.addCell(x, y, newState3);
              } else if (color==4) {
                this.addCell(x, y, newState4);
              }
              this.redrawList.push([x, y, 2]); // Keep alive
            } else {
              this.redrawList.push([x, y, 0]); // Kill cell
            }
          }
        }

        // Process dead neighbors
        for (key in allDeadNeighbors) {

          // birth counts
          //
          // // 34 life (too slow)
          // if ((allDeadNeighbors[key] === 3) || (allDeadNeighbors[key] === 4)) {} 
          // coagulations
          // if ((allDeadNeighbors[key] === 3) || (allDeadNeighbors[key] === 7) || (allDeadNeighbors[key] === 8)) {} 
          // // gnarl (way too slow/chaotic)
          // if (allDeadNeighbors[key] === 1) {} 
          // // long life (boring)
          // if ((allDeadNeighbors[key] === 3) || (allDeadNeighbors[key] === 4) || (allDeadNeighbors[key] === 5)) {} 
          // // stains (too slow)
          // if ((allDeadNeighbors[key]===3)||(allDeadNeighbors[key]>5)) {} 
          // // walled cities (boring)
          // if (allDeadNeighbors[key] > 3) {} 
          //
          // // conway's life
          // if (allDeadNeighbors[key] === 3) {} 
          // // amoeba life (good)
          // if ((allDeadNeighbors[key] === 3) || (allDeadNeighbors[key] === 5) || (allDeadNeighbors[key] === 7)) {}
          // // high life (good, but some oscillators blow up)
          // if ((allDeadNeighbors[key] === 3) || (allDeadNeighbors[key] === 6)) {} 
          // // 2x2 (good, but victory conditions *may* need to change)
          // if ((allDeadNeighbors[key]===3) || (allDeadNeighbors[key]===6)) {} 
          // // // pseudo life (good)
          // if ((allDeadNeighbors[key]==3)||(allDeadNeighbors[key]==5)||(allDeadNeighbors[key]==7)) {} 

          // conway's life
          if (allDeadNeighbors[key] === 3) {

            // This cell is dead, but has enough neighbors
            // that are alive that it will make new life.
            key = key.split(',');
            // Parse the (x, y) values of the cell with 3 neighbors
            t1 = parseInt(key[0], 10);
            t2 = parseInt(key[1], 10);

            // Get color of (x, y) cell
            color = this.getColorFromAlive(t1, t2);

            this.addCell(t1, t2, newState);
            if (color == 1) {
              this.addCell(t1, t2, newState1);
            } else if (color == 2) {
              this.addCell(t1, t2, newState2);
            } else if (color == 3) {
              this.addCell(t1, t2, newState3);
            } else if (color == 4) {
              this.addCell(t1, t2, newState4);
            }

            this.redrawList.push([t1, t2, 1]);
          }
        }

        this.actualState = newState;
        this.actualState1 = newState1;
        this.actualState2 = newState2;
        this.actualState3 = newState3;
        this.actualState4 = newState4;

        return this.getLiveCounts();
      },


      topPointer : 1,
      middlePointer : 1,
      bottomPointer : 1,

      getColorFromAlive : function(x, y) {
        var state1 = this.actualState1;
        var state2 = this.actualState2;
        var state3 = this.actualState3;
        var state4 = this.actualState4;

        var color1 = 0;
        var color2 = 0;
        var color3 = 0;
        var color4 = 0;

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        var xm1 = ((x-1) + GOL.columns)%(GOL.columns);
        var xp1 = ((x+1) + GOL.columns)%(GOL.columns);

        var ym1 = ((y-1) + GOL.rows)%(GOL.rows);
        var yp1 = ((y+1) + GOL.rows)%(GOL.rows);

        // Periodic boundary conditions complicate any checks that end the loops early.
        var xstencilmin = Math.min(xm1, x, xp1);
        var xstencilmax = Math.max(xm1, x, xp1);

        var ystencilmin = Math.min(ym1, y, yp1);
        var ystencilmax = Math.max(ym1, y, yp1);

        // color1
        for (i = 0; i < state1.length; i++) {
          var yy = state1[i][0];

          // Don't do this check for periodic BCs
          //if (yy >= ystencilmin) {

            if (yy === ym1) {
              // Top row
              for (j = 1; j < state1[i].length; j++) {
                var xx = state1[i][j];

                // Don't do this check for periodic BCs
                //if (xx >= xstencilmin) {

                  if (xx === xm1) {
                    // top left
                    color1++;
                  } else if (xx === x) {
                    // top middle
                    color1++;
                  } else if (xx === xp1) {
                    // top right
                    color1++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === y) {
              // Middle row
              for (j = 1; j < state1[i].length; j++) {
                var xx = state1[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // top left
                    color1++;
                  } else if (xx === xp1) {
                    // top right
                    color1++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === yp1) {
              // Bottom row
              for (j = 1; j < state1[i].length; j++) {
                var xx = state1[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // bottom left
                    color1++;
                  } else if (xx === x) {
                    // bottom middle
                    color1++;
                  } else if (xx === xp1) {
                    // bottom right
                    color1++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }
            }

          //}
          //if (yy >= ystencilmax) {
          //  break;
          //}
        }

        // color2
        for (i = 0; i < state2.length; i++) {
          var yy = state2[i][0];

          //if (yy >= ystencilmin) {

            if (yy === ym1) {
              // Top row
              for (j = 1; j < state2[i].length; j++) {
                var xx = state2[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // top left
                    color2++;
                  } else if (xx === x) {
                    // top middle
                    color2++;
                  } else if (xx === xp1) {
                    // top right
                    color2++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === y) {
              // Middle row
              for (j = 1; j < state2[i].length; j++) {
                var xx = state2[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // left
                    color2++;
                  } else if (xx === xp1) {
                    // right
                    color2++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === yp1) {
              // Bottom row
              for (j = 1; j < state2[i].length; j++) {
                var xx = state2[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // bottom left
                    color2++;
                  } else if (xx === x) {
                    // bottom middle
                    color2++;
                  } else if (xx === xp1) {
                    // bottom right
                    color2++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }
            }

          //}
          //if (yy >= ystencilmax) {
          //  break;
          //}
        }


        // color3
        for (i = 0; i < state3.length; i++) {
          var yy = state3[i][0];

          //if (yy >= ystencilmin) {

            if (yy === ym1) {
              // Top row
              for (j = 1; j < state3[i].length; j++) {
                var xx = state3[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // top left
                    color3++;
                  } else if (xx === x) {
                    // top middle
                    color3++;
                  } else if (xx === xp1) {
                    // top right
                    color3++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === y) {
              // Middle row
              for (j = 1; j < state3[i].length; j++) {
                var xx = state3[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // left
                    color3++;
                  } else if (xx === xp1) {
                    // right
                    color3++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === yp1) {
              // Bottom row
              for (j = 1; j < state3[i].length; j++) {
                var xx = state3[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // bottom left
                    color3++;
                  } else if (xx === x) {
                    // bottom middle
                    color3++;
                  } else if (xx === xp1) {
                    // bottom right
                    color3++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }
            }

          //}
          //if (yy >= ystencilmax) {
          //  break;
          //}
        }


        // color4
        for (i = 0; i < state4.length; i++) {
          var yy = state4[i][0];

          //if (yy >= ystencilmin) {

            if (yy === ym1) {
              // Top row
              for (j = 1; j < state4[i].length; j++) {
                var xx = state4[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // top left
                    color4++;
                  } else if (xx === x) {
                    // top middle
                    color4++;
                  } else if (xx === xp1) {
                    // top right
                    color4++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === y) {
              // Middle row
              for (j = 1; j < state4[i].length; j++) {
                var xx = state4[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // left
                    color4++;
                  } else if (xx === xp1) {
                    // right
                    color4++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }

            } else if (yy === yp1) {
              // Bottom row
              for (j = 1; j < state4[i].length; j++) {
                var xx = state4[i][j];
                //if (xx >= xstencilmin) {
                  if (xx === xm1) {
                    // bottom left
                    color4++;
                  } else if (xx === x) {
                    // bottom middle
                    color4++;
                  } else if (xx === xp1) {
                    // bottom right
                    color4++;
                  }
                //}
                //if (xx >= xstencilmax) {
                //  break;
                //}
              }
            }

          //}
          //if (yy >= ystencilmax) {
          //  break;
          //}
        }

        var color = 0;
        var ns = color1+color2+color3+color4;
        if (ns > 0) {
          var maxNeighbor = Math.max(color1, color2, color3, color4);
          if (maxNeighbor==1 && ns==3) {
            // Special case: three-way tie
            // In case of a 3-way tie,
            // the winner is the 4th (missing) color
            if (color1==0) {
              color = 1;
            } else if (color2==0) {
              color = 2;
            } else if (color3==0) {
              color = 3;
            } else if (color4==0) {
              color = 4;
            }
          } else if (color1==maxNeighbor) {
            color = 1;
          } else if (color2==maxNeighbor) {
            color = 2;
          } else if (color3==maxNeighbor) {
            color = 3;
          } else if (color4==maxNeighbor) {
            color = 4;
          }
        }

        return color;
      },

      /**
       *
       */
      getNeighborsFromAlive : function (x, y, i, state, possibleNeighborsList) {

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        var xm1 = ((x-1) + GOL.columns)%(GOL.columns);
        var xp1 = ((x+1) + GOL.columns)%(GOL.columns);

        var ym1 = ((y-1) + GOL.rows)%(GOL.rows);
        var yp1 = ((y+1) + GOL.rows)%(GOL.rows);

        var xstencilmin = Math.min(xm1, x, xp1);
        var xstencilmax = Math.max(xm1, x, xp1);

        var ystencilmin = Math.min(ym1, y, yp1);
        var ystencilmax = Math.max(ym1, y, yp1);

        var neighbors = 0, k;
        var neighbors1 = 0, neighbors2 = 0, neighbors3 = 0, neighbors4 = 0;

        // Top
        var im1 = i-1;
        if (im1 < 0) {
          im1 = state.length-1;
        }
        if (state[im1] !== undefined) {
          if (state[im1][0] === ym1) {
            for (k = 1; k < state[im1].length; k++) {

              //if (state[i-1][k] >= xstencilmin ) {

                // NW
                if (state[im1][k] === xm1) {
                  possibleNeighborsList[0] = undefined;
                  //this.topPointer = k + 1;
                  neighbors++;
                  var xx = state[im1][k];
                  var yy = state[im1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                // N
                if (state[im1][k] === x) {
                  possibleNeighborsList[1] = undefined;
                  //this.topPointer = k;
                  neighbors++;
                  var xx = state[im1][k];
                  var yy = state[im1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                // NE
                if (state[im1][k] === xp1) {
                  possibleNeighborsList[2] = undefined;

                  //if (k == 1) {
                  //  // why 1? why not 0? is this b/c offset-by-1 thing?
                  //  this.topPointer = 1;
                  //} else {
                  //  this.topPointer = k - 1;
                  //}

                  neighbors++;
                  var xx = state[im1][k];
                  var yy = state[im1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                //if (state[i-1][k] > xstencilmax) {
                //  break;
                //}
              //}
            }
          }
        }

        // Middle
        for (k = 1; k < state[i].length; k++) {
          //if (state[i][k] >= xstencilmin) {

            if (state[i][k] === xm1) {
              possibleNeighborsList[3] = undefined;
              neighbors++;
              var xx = state[i][k];
              var yy = state[i][0];
              var cellcol = this.getCellColor(xx, yy);
              if (cellcol === 1) {
                neighbors1++;
              }
              if (cellcol === 2) {
                neighbors2++;
              }
              if (cellcol === 3) {
                neighbors3++;
              }
              if (cellcol === 4) {
                neighbors4++;
              }
            }

            if (state[i][k] === xp1) {
              possibleNeighborsList[4] = undefined;
              neighbors++;
              var xx = state[i][k];
              var yy = state[i][0];
              var cellcol = this.getCellColor(xx, yy);
              if (cellcol === 1) {
                neighbors1++;
              }
              if (cellcol === 2) {
                neighbors2++;
              }
              if (cellcol === 3) {
                neighbors3++;
              }
              if (cellcol === 4) {
                neighbors4++;
              }
            }

            //if (state[i][k] > xstencilmax) {
            //  break;
            //}
          //}
        }

        // Bottom
        var ip1 = i+1;
        if ((ip1) >= state.length) {
          ip1 = 0;
        }
        if (state[ip1] !== undefined) {
          if (state[ip1][0] === yp1) {
            for (k = 1; k < state[ip1].length; k++) {
              //if (state[i+1][k] >= xstencilmin) {

                if (state[ip1][k] === xm1) {
                  possibleNeighborsList[5] = undefined;
                  //this.bottomPointer = k + 1;
                  neighbors++;
                  var xx = state[ip1][k];
                  var yy = state[ip1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                if (state[ip1][k] === x) {
                  possibleNeighborsList[6] = undefined;
                  //this.bottomPointer = k;
                  neighbors++;
                  var xx = state[ip1][k];
                  var yy = state[ip1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                if (state[ip1][k] === xp1) {
                  possibleNeighborsList[7] = undefined;

                  //if (k == 1) {
                  //  this.bottomPointer = 1;
                  //} else {
                  //  this.bottomPointer = k - 1;
                  //}

                  neighbors++;
                  var xx = state[ip1][k];
                  var yy = state[ip1][0];
                  var cellcol = this.getCellColor(xx, yy);
                  if (cellcol === 1) {
                    neighbors1++;
                  }
                  if (cellcol === 2) {
                    neighbors2++;
                  }
                  if (cellcol === 3) {
                    neighbors3++;
                  }
                  if (cellcol === 4) {
                    neighbors4++;
                  }
                }

                //if (state[i+1][k] > xstencilmax) {
                //  break;
                //}
              //}
            }
          }
        }

        // This was where we found the first Rainbow Cup bug -
        // we weren't checking colors exactly like the Python simulator.
        // We were setting color to -1 before deciding the color,
        // but some cells ended up with a color of -1 (ghost alive cells).
        //
        // We also weren't checking for ties.

        var color = 0;
        var ns = neighbors1+neighbors2+neighbors3+neighbors4;
        if (ns > 0) {
          var maxNeighbor = Math.max(neighbors1, neighbors2, neighbors3, neighbors4);
          if (maxNeighbor==1 && ns==3) {
            // Three-way tie
            // In case of a 3-way tie,
            // the winner is the 4th (missing) color
            if (neighbors1==0) {
              color = 1;
            } else if (neighbors2==0) {
              color = 2;
            } else if (neighbors3==0) {
              color = 3;
            } else if (neighbors4==0) {
              color = 4;
            }
          } else if (neighbors1==maxNeighbor) {
            color = 1;
          } else if (neighbors2==maxNeighbor) {
            color = 2;
          } else if (neighbors3==maxNeighbor) {
            color = 3;
          } else if (neighbors4==maxNeighbor) {
            color = 4;
          }
        }

        return {
          neighbors: neighbors,
          color: color
        }
      },


      /**
       * Check if the cell at location (x, y) is alive
       */
      isAlive : function(x, y) {

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        var i, j;

        for (i = 0; i < this.actualState.length; i++) {
          // check that first coordinate in actualState matches
          if (this.actualState[i][0] === y) {
            for (j = 1; j < this.actualState[i].length; j++) {
              // check that second coordinate in actualState matches
              if (this.actualState[i][j] === x) {
                return true;
              }
            }
          }
        }
        return false;
      },

      /**
       * Get the color of the cell at location (x, y)
       */
      getCellColor : function(x, y) {

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        for (i = 0; i < this.actualState1.length; i++) {
          if (this.actualState1[i][0] === y) {
            for (j = 1; j < this.actualState1[i].length; j++) {
              if (this.actualState1[i][j] === x) {
                return 1;
              }
            }
          }
        }
        for (i = 0; i < this.actualState2.length; i++) {
          if (this.actualState2[i][0] === y) {
            for (j = 1; j < this.actualState2[i].length; j++) {
              if (this.actualState2[i][j] === x) {
                return 2;
              }
            }
          }
        }
        for (i = 0; i < this.actualState3.length; i++) {
          if (this.actualState3[i][0] === y) {
            for (j = 1; j < this.actualState3[i].length; j++) {
              if (this.actualState3[i][j] === x) {
                return 3;
              }
            }
          }
        }
        for (i = 0; i < this.actualState4.length; i++) {
          if (this.actualState4[i][0] === y) {
            for (j = 1; j < this.actualState4[i].length; j++) {
              if (this.actualState4[i][j] === x) {
                return 4;
              }
            }
          }
        }
        return 0;
      },

      /**
       *
       */
      removeCell : function(x, y, state) {

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        var i, j;

        for (i = 0; i < state.length; i++) {
          if (state[i][0] === y) {
            if (state[i].length === 2) { // Remove all Row
              state.splice(i, 1);
            } else { // Remove Element
              for (j = 1; j < state[i].length; j++) {
                if (state[i][j] === x) {
                  state[i].splice(j, 1);
                  return;
                }
              }
            }
          }
        }
      },


      /**
       *
       */
      addCell : function(x, y, state) {

        // Loop points back around
        x = (x + GOL.columns)%(GOL.columns);
        y = (y + GOL.rows)%(GOL.rows);

        if (state.length === 0) {
          state.push([y, x]);
          return;
        }

        var k, n, m, tempRow, newState = [], added;

        // figure out where in the list to insert the new cell
        if (y < state[0][0]) {
          // handle case of y < any other y, so add to beginning of list

          // set first element of newState and bump everybody else by 1
          newState = [[y,x]];
          for (k = 0; k < state.length; k++) {
            newState[k+1] = state[k];
          }

          // copy newState to state
          for (k = 0; k < newState.length; k++) {
            state[k] = newState[k];
          }

          return;

        } else if (y > state[state.length - 1][0]) {
          // handle case of y > any other y, so add to end
          state[state.length] = [y, x];
          return;

        } else { // Add to Middle

          for (n = 0; n < state.length; n++) {
            if (state[n][0] === y) { // Level Exists
              tempRow = [];
              added = false;
              for (m = 1; m < state[n].length; m++) {
                if ((!added) && (x < state[n][m])) {
                  tempRow.push(x);
                  added = !added;
                }
                tempRow.push(state[n][m]);
              }
              tempRow.unshift(y);
              if (!added) {
                tempRow.push(x);
              }
              state[n] = tempRow;
              return;
            }

            if (y < state[n][0]) { // Create Level
              newState = [];
              for (k = 0; k < state.length; k++) {
                if (k === n) {
                  newState[k] = [y,x];
                  newState[k+1] = state[k];
                } else if (k < n) {
                  newState[k] = state[k];
                } else if (k > n) {
                  newState[k+1] = state[k];
                }
              }

              for (k = 0; k < newState.length; k++) {
                state[k] = newState[k];
              }

              return;
            }
          }
        }
      }

    },


    /** ****************************************************************************************************************************
     *
     */
    helpers : {
      urlParameters : null, // Cache


      /**
       * Return a random integer from [min, max]
       */
      random : function(min, max) {
        return min <= max ? min + Math.round(Math.random() * (max - min)) : null;
      },


      /**
       * Get URL Parameters
       */
      getUrlParameter : function(name) {
        if (this.urlParameters === null) { // Cache miss
          var hash, hashes, i;

          this.urlParameters = [];
          hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

          for (i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            this.urlParameters.push(hash[0]);
            this.urlParameters[hash[0]] = hash[1];
          }
        }

        return this.urlParameters[name];
      },


      /**
       * Register Event
       */
      registerEvent : function (element, event, handler, capture) {
        if (/msie/i.test(navigator.userAgent)) {
          element.attachEvent('on' + event, handler);
        } else {
          element.addEventListener(event, handler, capture);
        }
      },


      /**
       *
       */
      mousePosition : function (e) {
        // http://www.malleus.de/FAQ/getImgMousePos.html
        // http://www.quirksmode.org/js/events_properties.html#position
        var event, x, y, domObject, posx = 0, posy = 0, top = 0, left = 0, cellSize = GOL.cellSize + 1;

        event = e;
        if (!event) {
          event = window.event;
        }

        if (event.pageX || event.pageY)     {
          posx = event.pageX;
          posy = event.pageY;
        } else if (event.clientX || event.clientY)  {
          posx = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          posy = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        domObject = event.target || event.srcElement;

        while ( domObject.offsetParent ) {
          left += domObject.offsetLeft;
          top += domObject.offsetTop;
          domObject = domObject.offsetParent;
        }

        domObject.pageTop = top;
        domObject.pageLeft = left;

        x = Math.ceil(((posx - domObject.pageLeft)/cellSize) - 1);
        y = Math.ceil(((posy - domObject.pageTop)/cellSize) - 1);

        return [x, y];
      },

      getWaitTimeMs : function () {
        var j = 0;
        try {
          j = GOL.element.speedSlider.value;
        } catch {
          console.log("Could not read speed-slider value, using default value of 25 ms");
          return 250;
        }
        if (j<=0) {
          return 0;
        } else if (j==1) {
          return 8;
        } else if (j==2) {
          return 24;
        } else if (j==3) {
          return 60;
        } else if (j==4) {
          return 250;
        } else if (j==5) {
          return 1000;
        } else {
          return 1000;
        }
      }
    }

  };


  /**
   * Init on 'load' event
   */
  GOL.helpers.registerEvent(window, 'load', function () {
    GOL.init();
  }, false);

}());