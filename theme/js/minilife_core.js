/**
 * Golly Minilife App - Core
 * Ch4zm of Hellmouth
 * 16 November 2020
 *
 * minilife_core.js defines the MiniGOL structure,
 * but does not initialize it or do anything.
 * See minilife.js for the auto-loading version.
 */
var Colors = {
  realBackgroundColor : "#272b30",
  gridStrokeColor1    : "#3a3a3a",
  lightTileColor      : "#eee",
  grays               : ["#3a3a3a", "#404040"]
};

var MiniGOL = {

  initialState: '[{"15":[16]},{"16":[16,17,18,26,27]},{"17":[19,26]},{"18":[18,24,26]},{"19":[18,21,24,25]},{"20":[21]},{"21":[19,22]},{"22":[21]},{"23":[17]},{"24":[16,18,19,23,24]},{"25":[16,23]},{"26":[15,16,24,25,26]},{"27":[26]}]',

  // DOM elements
  element : {
    generation : null,
    livecells : null,
  },

  waitTime: 0,
  generation : 0,

  running : false,
  autoplay : false,

  // Cell colors
  //
  // dead/trail colors always the same
  colors : {
    current : 0,
    schedule : false,
    dead: Colors.realBackgroundColor,
    trail: Colors.grays,
    alive: Colors.lightTileColor,
  },

  // Zoom level
  //
  // columns/rows/cellSize are set here
  zoom : {
    current : 0,
    schedule : false,

    schemes : [
      {
        columns : 40,
        rows : 40,
        cellSize : 6
      },
    ],
  },

  // Grid style
  grid : {
    current : 0,
    mapOverlay : false,

    schemes : [
      {
        color : Colors.gridStrokeColor1,
      },
      {
        color : '', // Special case: 0px grid
      },
    ],
  },

  // Clear state
  clear : {
    schedule : false
  },

  // Average execution times
  times : {
    algorithm : 0,
    gui : 0
  },

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
      this.listLife.init();   // Reset/init algorithm
      this.loadConfig();      // Load config from URL
      this.keepDOMElements(); // Keep DOM references (getElementsById)
      this.loadState();       // Load state from config
      this.canvas.init();     // Init canvas GUI
      this.registerEvents();  // Register event handlers
      this.prepare();
    } catch (e) {
      console.log(e);
      //alert("Error: "+e);
    }
  },


  /**
   * Load config from URL
   *
   */
  loadConfig : function() {
    var colors, grid, zoom;

    colors = 1;
    grid = 1;
    zoom = 1;

    this.colors.current = colors - 1;
    this.grid.current = grid - 1;
    this.zoom.current = zoom - 1;

    this.rows = this.zoom.schemes[this.zoom.current].rows;
    this.columns = this.zoom.schemes[this.zoom.current].columns;

    this.autoplay = false;
    this.trail.current = false;
  },

  /**
   * Load world state from config
   *
   * This method is complicated because it loads the data,
   * and a lot of other actions have to wait for the data
   * to be loaded before they can be completed.
   */
  loadState : function() {
    var state, s;

    s = this.initialState;

    state = jsonParse(decodeURI(s));

    // state is a 3-element array
    // state[0] is a dictionary:
    //    39: [60]
    // state[1] is a dictionary:
    //    40: [62]
    // state[2] is a dictionary:
    //    41: [59, 60, 63, 64, 65]

    var irow, icol, y;
    for (irow = 0; irow < state.length; irow++) {
      for (y in state[irow]) {
        for (icol = 0 ; icol < state[irow][y].length ; icol++) {
          var yy = parseInt(y, 10);
          var xx = state[irow][yy][icol];
          this.listLife.addCell(xx, yy, this.listLife.actualState);
        }
      }
    }
  },


  /**
   * Create a random pattern for the given color.
   *
   */
  randomState : function() {
    // original pct was 12%, for binary we split 5%
    var i, liveCells = (this.rows * this.columns) * 0.05;

    for (i = 0; i < liveCells; i++) {
      var xx = this.helpers.random(0, this.columns - 1);
      var yy = this.helpers.random(0, this.rows - 1);
      while (this.listLife.isAlive(xx, yy)) {
          xx = this.helpers.random(0, this.columns - 1);
          yy = this.helpers.random(0, this.rows - 1);
      }
      this.listLife.addCell(xx, yy, this.listLife.actualState);
    }

    //this.listLife.nextGeneration();
  },


  /**
   * Clean up actual state and prepare a new run
   */
  cleanUp : function() {
    this.listLife.init(); // Reset/init algorithm
    this.prepare();
  },

  /**
   * Prepare DOM elements and Canvas for a new run
   */
  prepare : function() {
    this.generation = this.times.algorithm = this.times.gui = 0;
    this.mouseDown = this.clear.schedule = false;

    this.element.generation.innerHTML = '0';
    this.element.livecells.innerHTML = '0';

    this.canvas.clearWorld(); // Reset GUI
    this.canvas.drawWorld(); // Draw State

    if (this.autoplay) { // Next Flow
      this.autoplay = false;
      this.handlers.buttons.run();
    }
  },

  /**
   * keepDOMElements
   * Save DOM references for this session (one time execution)
   */
  keepDOMElements : function() {

    this.element.generation = document.getElementById('generation');
    this.element.livecells  = document.getElementById('livecells');

    this.element.clearButton = document.getElementById('buttonClear');
    this.element.colorButton = document.getElementById('buttonColors');
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
    this.helpers.registerEvent(document.getElementById('buttonClear'), 'click', this.handlers.buttons.clear, false);

  },

  /**
   * Run Next Step
   */
  nextStep : function() {
    var i, x, y, r;
    var liveCounts;
    var algorithmTime, guiTime;

    // Algorithm run

    algorithmTime = (new Date());

    liveCounts = MiniGOL.listLife.nextGeneration();

    algorithmTime = (new Date()) - algorithmTime;


    // Canvas run

    guiTime = (new Date());

    for (i = 0; i < MiniGOL.listLife.redrawList.length; i++) {
      x = MiniGOL.listLife.redrawList[i][0];
      y = MiniGOL.listLife.redrawList[i][1];

      if (MiniGOL.listLife.redrawList[i][2] === 1) {
        MiniGOL.canvas.changeCelltoAlive(x, y);
      } else if (MiniGOL.listLife.redrawList[i][2] === 2) {
        MiniGOL.canvas.keepCellAlive(x, y);
      } else {
        MiniGOL.canvas.changeCelltoDead(x, y);
      }
    }

    guiTime = (new Date()) - guiTime;

    // Post-run updates

    // Clear Trail
    if (MiniGOL.trail.schedule) {
      MiniGOL.trail.schedule = false;
      MiniGOL.canvas.drawWorld();
    }

    // Change Grid
    if (MiniGOL.grid.schedule) {
      MiniGOL.grid.schedule = false;
      MiniGOL.canvas.drawWorld();
    }

    // Change Colors
    if (MiniGOL.colors.schedule) {
      MiniGOL.colors.schedule = false;
      MiniGOL.canvas.drawWorld();
    }

    // Running Information
    MiniGOL.generation++;
    MiniGOL.element.generation.innerHTML = MiniGOL.generation;
    MiniGOL.element.livecells.innerHTML = liveCounts;

    r = 1.0/MiniGOL.generation;
    MiniGOL.times.algorithm = (MiniGOL.times.algorithm * (1 - r)) + (algorithmTime * r);
    MiniGOL.times.gui = (MiniGOL.times.gui * (1 - r)) + (guiTime * r);

    // Flow Control
    if (MiniGOL.running) {
      window.requestAnimationFrame(MiniGOL.nextStep);
    } else {
      if (MiniGOL.clear.schedule) {
        MiniGOL.cleanUp();
      }
    }
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
     */
    canvasMouseDown : function(event) {
      var position = MiniGOL.helpers.mousePosition(event);
      MiniGOL.canvas.switchCell(position[0], position[1]);
      MiniGOL.handlers.lastX = position[0];
      MiniGOL.handlers.lastY = position[1];
      MiniGOL.handlers.mouseDown = true;
    },


    /**
     * Handle user mouse up instance.
     */
    canvasMouseUp : function() {
      MiniGOL.handlers.mouseDown = false;
    },


    /**
     * If we have captured a mouse down event,
     * track where the mouse is going and change
     * cell alive/dead state at mouse location.
     */
    canvasMouseMove : function(event) {
      if (MiniGOL.handlers.mouseDown) {
        var position = MiniGOL.helpers.mousePosition(event);
        if ((position[0] !== MiniGOL.handlers.lastX) || (position[1] !== MiniGOL.handlers.lastY)) {
          MiniGOL.canvas.switchCell(position[0], position[1]);
          MiniGOL.handlers.lastX = position[0];
          MiniGOL.handlers.lastY = position[1];
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
        MiniGOL.handlers.buttons.clear();
      } else if (event.keyCode === 82 ) { // Key: R
        MiniGOL.handlers.buttons.run();
      } else if (event.keyCode === 83 ) { // Key: S
        MiniGOL.handlers.buttons.step();
      }
    },


    buttons : {

      /**
       * Button Handler - Run
       */
      run : function() {

        MiniGOL.running = !MiniGOL.running;
        // Update run/stop button state
        if (MiniGOL.running) {
          MiniGOL.nextStep();
          document.getElementById('buttonRun').textContent = 'Stop';
          document.getElementById('buttonRun').classList.remove("btn-success");
          document.getElementById('buttonRun').classList.add("btn-danger");
        } else {
          document.getElementById('buttonRun').textContent = 'Run';
          document.getElementById('buttonRun').classList.remove("btn-danger");
          document.getElementById('buttonRun').classList.add("btn-success");
        }
      },


      /**
       * Button Handler - Next Step - One Step only
       */
      step : function() {
        if (!MiniGOL.running) {
          MiniGOL.nextStep();
        }
      },


      /**
       * Button Handler - Clear World
       */
      clear : function() {
        if (MiniGOL.running) {
          MiniGOL.clear.schedule = true;
          MiniGOL.running = false;
          $("#buttonRun").text("Run");
          document.getElementById('buttonRun').classList.remove("btn-danger");
          document.getElementById('buttonRun').classList.add("btn-success");
        } else {
          MiniGOL.cleanUp();
        }
      },


      /**
       * Button Handler - Remove/Add Trail
       */
      trail : function() {
        MiniGOL.trail.current = !MiniGOL.trail.current;
        if (MiniGOL.running) {
          MiniGOL.trail.schedule = true;
        } else {
          MiniGOL.canvas.drawWorld();
        }
      },

      /**
       * Draw the colors
       */
      colors : function() {
        if (MiniGOL.running) {
          MiniGOL.colors.schedule = true; // Delay redraw
        } else {
          MiniGOL.canvas.drawWorld(); // Force complete redraw
        }
      },

      /**
       * Show/hide the grid
       */
      grid : function() {
        MiniGOL.grid.current = (MiniGOL.grid.current + 1) % MiniGOL.grid.schemes.length;
        if (MiniGOL.running) {
          MiniGOL.grid.schedule = true; // Delay redraw
        } else {
          MiniGOL.canvas.drawWorld(); // Force complete redraw
        }
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

      this.cellSize = MiniGOL.zoom.schemes[MiniGOL.zoom.current].cellSize;
      this.cellSpace = 1;

      // register the mousedown/mouseup/mousemove events with function callbacks
      MiniGOL.helpers.registerEvent(this.canvas, 'mousedown', MiniGOL.handlers.canvasMouseDown, false);
      MiniGOL.helpers.registerEvent(document, 'mouseup', MiniGOL.handlers.canvasMouseUp, false);
      MiniGOL.helpers.registerEvent(this.canvas, 'mousemove', MiniGOL.handlers.canvasMouseMove, false);

      this.clearWorld();
    },


    /**
     * clearWorld
     */
    clearWorld : function () {
      var i, j;

      // Init ages (Canvas reference)
      this.age = [];
      for (i = 0; i < MiniGOL.columns; i++) {
        this.age[i] = [];
        for (j = 0; j < MiniGOL.rows; j++) {
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
      if (MiniGOL.grid.schemes[MiniGOL.grid.current].color === '') {
        this.setNoGridOn();
        this.width = this.height = 0;
      } else {
        this.setNoGridOff();
        this.width = this.height = 1;
      }

      // Dynamic canvas size
      this.width = this.width + (this.cellSpace * MiniGOL.columns) + (this.cellSize * MiniGOL.columns);
      this.canvas.setAttribute('width', this.width);

      this.height = this.height + (this.cellSpace * MiniGOL.rows) + (this.cellSize * MiniGOL.rows);
      this.canvas.setAttribute('height', this.height);

      // Fill background
      this.context.fillStyle = MiniGOL.grid.schemes[MiniGOL.grid.current].color;
      this.context.fillRect(0, 0, this.width, this.height);


      for (i = 0 ; i < MiniGOL.columns; i++) {
        for (j = 0 ; j < MiniGOL.rows; j++) {
          if (MiniGOL.listLife.isAlive(i, j)) {
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
      this.cellSize = MiniGOL.zoom.schemes[MiniGOL.zoom.current].cellSize + 1;
      this.cellSpace = 0;
    },


    /**
     * setNoGridOff
     */
    setNoGridOff : function() {
      this.cellSize = MiniGOL.zoom.schemes[MiniGOL.zoom.current].cellSize;
      this.cellSpace = 1;
    },


    /**
     * drawCell
     */
    drawCell : function (i, j, alive) {
      if (alive) {
        this.context.fillStyle = MiniGOL.colors.alive;
      } else {
        this.context.fillStyle = MiniGOL.colors.dead;
      }
      this.context.fillRect(this.cellSpace + (this.cellSpace * i) + (this.cellSize * i), this.cellSpace + (this.cellSpace * j) + (this.cellSize * j), this.cellSize, this.cellSize);

    },


    /**
     * switchCell
     * cmr - this is only activated when a user clicks on a cell
     */
    switchCell : function(i, j) {
      if(MiniGOL.listLife.isAlive(i, j)) {
        this.changeCelltoDead(i, j);
        MiniGOL.listLife.removeCell(i, j, MiniGOL.listLife.actualState);
      } else {
        this.changeCelltoAlive(i, j);
        MiniGOL.listLife.addCell(i, j, MiniGOL.listLife.actualState);
      }
    },


    /**
     * keepCellAlive
     */
    keepCellAlive : function(i, j) {
      if (i >= 0 && i < MiniGOL.columns && j >=0 && j < MiniGOL.rows) {
        this.age[i][j]++;
        this.drawCell(i, j, true);
      }
    },


    /**
     * changeCelltoAlive
     */
    changeCelltoAlive : function(i, j) {
      if (i >= 0 && i < MiniGOL.columns && j >=0 && j < MiniGOL.rows) {
        this.age[i][j] = 1;
        this.drawCell(i, j, true);
      }
    },


    /**
     * changeCelltoDead
     */
    changeCelltoDead : function(i, j) {
      if (i >= 0 && i < MiniGOL.columns && j >=0 && j < MiniGOL.rows) {
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
    redrawList : [],


    /**
     * Initialize the actual state array (?)
     */
    init : function () {
      this.actualState = [];
    },


    nextGeneration : function() {
      var x, y, i, j, m, n, key, t1, t2;
      var alive = 0;
      var deadNeighbors;
      var newState = [];
      var allDeadNeighbors = {};
      var neighbors;
      this.redrawList = [];

      // iterate over each point stored in the actualState list
      for (i = 0; i < this.actualState.length; i++) {
        this.topPointer = 1;
        this.bottomPointer = 1;

        for (j = 1; j < this.actualState[i].length; j++) {
          x = this.actualState[i][j];
          y = this.actualState[i][0];

          // Possible dead neighbors
          deadNeighbors = [[x-1, y-1, 1], [x, y-1, 1], [x+1, y-1, 1], [x-1, y, 1], [x+1, y, 1], [x-1, y+1, 1], [x, y+1, 1], [x+1, y+1, 1]];

          // Get number of live neighbors and remove alive neighbors from deadNeighbors
          neighbors = this.getNeighborsFromAlive(x, y, i, this.actualState, deadNeighbors);

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

          if (!(neighbors === 0 || neighbors === 1 || neighbors > 3)) {
            this.addCell(x, y, newState);
            alive++;
            this.redrawList.push([x, y, 2]); // Keep alive
          } else {
            this.redrawList.push([x, y, 0]); // Kill cell
          }
        }
      }

      // Process dead neighbors
      for (key in allDeadNeighbors) {
        if (allDeadNeighbors[key] === 3) {
          // This cell is dead, but has enough neighbors
          // that are alive that it will make new life.
          key = key.split(',');
          t1 = parseInt(key[0], 10);
          t2 = parseInt(key[1], 10);

          this.addCell(t1, t2, newState);
          alive++;
          this.redrawList.push([t1, t2, 1]);
        }
      }

      this.actualState = newState;

      return alive;
    },


    topPointer : 1,
    middlePointer : 1,
    bottomPointer : 1,

    /**
     * Eliminate live neighbors from dead neighbors list
     */
    getNeighborsFromAlive : function (x, y, i, state, possibleNeighborsList) {
      var neighbors = 0, k;

      // Top
      if (state[i-1] !== undefined) {
        if (state[i-1][0] === (y - 1)) {
          for (k = this.topPointer; k < state[i-1].length; k++) {

            if (state[i-1][k] >= (x-1) ) {

              // NW
              if (state[i-1][k] === (x - 1)) {
                possibleNeighborsList[0] = undefined;
                this.topPointer = k + 1;
                neighbors++;
              }

              // N
              if (state[i-1][k] === x) {
                possibleNeighborsList[1] = undefined;
                this.topPointer = k;
                neighbors++;
              }

              // NE
              if (state[i-1][k] === (x + 1)) {
                possibleNeighborsList[2] = undefined;

                if (k == 1) {
                  // why 1? why not 0? is this b/c offset-by-1 thing?
                  this.topPointer = 1;
                } else {
                  this.topPointer = k - 1;
                }

                neighbors++;
              }

              if (state[i-1][k] > (x + 1)) {
                break;
              }
            }
          }
        }
      }

      // Middle
      for (k = 1; k < state[i].length; k++) {
        if (state[i][k] >= (x - 1)) {

          if (state[i][k] === (x - 1)) {
            possibleNeighborsList[3] = undefined;
            neighbors++;
          }

          if (state[i][k] === (x + 1)) {
            possibleNeighborsList[4] = undefined;
            neighbors++;
          }

          if (state[i][k] > (x + 1)) {
            break;
          }
        }
      }

      // Bottom
      if (state[i+1] !== undefined) {
        if (state[i+1][0] === (y + 1)) {
          for (k = this.bottomPointer; k < state[i+1].length; k++) {
            if (state[i+1][k] >= (x - 1)) {

              if (state[i+1][k] === (x - 1)) {
                possibleNeighborsList[5] = undefined;
                this.bottomPointer = k + 1;
                neighbors++;
              }

              if (state[i+1][k] === x) {
                possibleNeighborsList[6] = undefined;
                this.bottomPointer = k;
                neighbors++;
              }

              if (state[i+1][k] === (x + 1)) {
                possibleNeighborsList[7] = undefined;

                if (k == 1) {
                  this.bottomPointer = 1;
                } else {
                  this.bottomPointer = k - 1;
                }

                neighbors++;
              }

              if (state[i+1][k] > (x + 1)) {
                break;
              }
            }
          }
        }
      }

      return neighbors;
    },


    /**
     * Check if the cell at location (x, y) is alive
     */
    isAlive : function(x, y) {
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
     *
     */
    removeCell : function(x, y, state) {
      var i, j;

      for (i = 0; i < state.length; i++) {
        if (state[i][0] === y) {

          if (state[i].length === 2) { // Remove all Row
            state.splice(i, 1);
          } else { // Remove Element
            for (j = 1; j < state[i].length; j++) {
              if (state[i][j] === x) {
                state[i].splice(j, 1);
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
      var event, x, y, domObject, posx = 0, posy = 0, top = 0, left = 0, cellSize = MiniGOL.zoom.schemes[MiniGOL.zoom.current].cellSize + 1;

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
    }
  }

};


