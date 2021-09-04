(function () {

  var SeasonPage = {

    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),

    loadingElem: null,

    containers : [
      'season-header-container',
      'day-buttons-container',
      'season-days-container'
    ],

    init : function() {
      this.loading();
      this.loadConfig();
    },

    /**
     * Handle the case of an error, tell the user something is wrong
     */
    error : function(mode) {

      // Hide elements
      this.loading(false);

      for (var c in this.containers) {
        try {
          var elem = document.getElementById(this.containers[c]);
          elem.classList.add('invisible');
        } catch (e) {
          // do nothing
        }
      }

      // Show error 
      var container = document.getElementById('container-error');
      container.classList.remove("invisible");
    },

    /**
     * Show/hide the site loading message while waiting for the API response
     */
    loading : function(show = true) {
      var loadingMessages = document.getElementsByClassName("loading-message");
      var m;
      for (m = 0; m < loadingMessages.length; m++) {
        var elem = loadingMessages[m];
        if (show) {
          // Reveal the loading message
          elem.classList.remove('invisible');
        } else {
          // Remove the loading message
          elem.remove();
        }
      }
      var loadingContainer = document.getElementById('loading-container');
      if (show) {
        // Make loading message container uninvisible
        if (loadingContainer != null) {
          loadingContainer.classList.remove('invisible');
        }
      } else {
        // Remove the loading message container
        if (loadingContainer != null) {
          loadingContainer.remove();
        }
      }
    },

    /**
     * Load parameters from the URL (if any are specified)
     * and pass them along to the API-calling functions.
     */
    loadConfig : function() {

      // season parameter is zero-indexed
      var url_season = this.helpers.getUrlParameter('season');
      // which_season parameter is one-indexed
      var url_which_season = this.helpers.getUrlParameter('which_season');

      // Check current season and day
      let url = this.baseApiUrl + '/mode';
      fetch(url)
      .then(res => res.json())
      .then((modeApiResult) => {

        if (!modeApiResult.hasOwnProperty('season') || !modeApiResult.hasOwnProperty('mode')) {
          throw "Did not find required keys (mode, season) in API /mode response"
        }
        this.currentSeason = modeApiResult.season;
        this.mode = mode = modeApiResult.mode;

        if (url_which_season != null) {
          this.season = url_which_season - 1;
        } else if (url_season != null) {
          this.season = url_season;
        } else {
          this.season = this.currentSeason;
        }

        if (this.season < this.currentSeason) {
          this.updateSeasonHeader(this.season);
          this.processSeasonData(this.season);

        } else if (this.season == this.currentSeason) {
          this.updateSeasonHeader(this.season);
          if (mode < 0) {
            throw "Invalid mode " + mode;
          } else if (mode < 10) {
            // Season has not started
            this.seasonWaitingMessage();
          } else if (mode < 20 && modeApiResult.elapsed < 3600) {
            // For the first 1 day, there is no data to show
            this.seasonWaitingMessage();
          } else {
            // Show all the data
            this.processSeasonData(this.season);
          }

        } else {
          throw "Invalid season number requested: " + this.season;
        }

      })
      .catch(err => {
        console.log("Encountered error while calling /mode API endpoint");
        console.log(err);
        this.error(-1);
      });

    },

    seasonWaitingMessage : function() {
      // Hide loading message
      this.loading(false);
      // Show waiting for postseason message
      var waitingElem = document.getElementById('container-season-waiting');
      waitingElem.classList.remove('invisible');
    },

    /**
     * Update the "Season X" or "Season X Day Y" header with information
     * from the API /today endpoint.
     */
    updateSeasonHeader : function(season0) {

      var seasonHeaderContainer = document.getElementById('season-header-container');

      // get element by id "landing-header-season" and change innerHTML to current season
      var seasonHead = document.getElementById('season-header-season-number');
      if (seasonHead != null) {
        var sp1 = parseInt(season0) + 1;
        seasonHead.innerHTML = sp1;
      }

      seasonHeaderContainer.classList.remove('invisible');

    },

    /**
     * Get season data from the API and process it.
     */
    processSeasonData : function(season) {

      // Get all games for this season
      let url = this.baseApiUrl + '/season/' + season;
      fetch(url)
      .then(res => res.json())
      .then((seasonApiResult) => {

        this.loading(false);

        var seasonDaysContainer = document.getElementById('season-days-container');
        seasonDaysContainer.classList.remove('invisible');
    
        this.setDayButtons(seasonApiResult);
        this.populateSeasonDays(season, seasonApiResult);
    
      })
      .catch(err => {
        console.log("Encountered error while calling /season API endpoint");
        console.log(err);
        this.error(-1);
      });
    
    },

    /**
     * Use the number of days in the season returned
     * to create a button for each day in the season.
     */
    setDayButtons : function(seasonApiResult) {
      var dayContainer = document.getElementById('day-buttons-container');
      dayContainer.classList.remove('invisible');

      // Get total number of days
      var nDays = seasonApiResult.length;
      var nRows = Math.ceil((nDays + 1)/10);
      var nCols = 10;

      var dayButtonsDivRow, rowButtonUlList, buttonPlaceholderElement, buttonLiElement;
      var iRow, iCol;
      var iDay = 0;

      for (iRow = 0; iRow < nRows; iRow++) {

        dayButtonsDivRow = document.createElement('div');
        dayButtonsDivRow.classList.add('row');
        dayButtonsDivRow.classList.add('justify-content-md-center');

        for (iCol = 0; iCol < nCols; iCol++) {
          if(iRow==0 && iCol==0) {

            // Add a no-button placeholder at day 0 position
            buttonPlaceholderElement = document.createElement('div');
            buttonPlaceholderElement.classList.add('season-number-button');
            dayButtonsDivRow.appendChild(buttonPlaceholderElement);

            // Initialize the ul list
            rowButtonUlList = document.createElement('ul');
            rowButtonUlList.classList.add('pagination');
            rowButtonUlList.classList.add('pagination-sm');

          } else {

            if (iDay >= nDays) {

              if (iDay==nDays) {

                // End the ul and create a new one
                dayButtonsDivRow.appendChild(rowButtonUlList);
                rowButtonUlList = document.createElement('ul');
                rowButtonUlList.classList.add('pagination');
                rowButtonUlList.classList.add('pagination-sm');

              }

              // Add a no-button placeholder instead of a day button
              buttonPlaceholderElement = document.createElement('div');
              buttonPlaceholderElement.classList.add('season-number-button');
              dayButtonsDivRow.appendChild(buttonPlaceholderElement);

            } else {

              // Create a button for this day
              var day = iDay + 1;
              buttonLiElement = document.createElement('li');
              buttonLiElement.classList.add('page-item');
              buttonLiElement.classList.add('text-center');
              buttonLiElement.classList.add('season-number-button');

              var a = document.createElement('a');
              a.classList.add('page-link');
              a.setAttribute('href', '#' + day);
              a.innerHTML = day;

              buttonLiElement.appendChild(a);
              rowButtonUlList.appendChild(buttonLiElement);

            }

            if (iCol == 9) {

              // end ul here because it's either maximum number of days, or end of row
              dayButtonsDivRow.appendChild(rowButtonUlList);

              // End the ul and create a new one
              dayButtonsDivRow.appendChild(rowButtonUlList);
              rowButtonUlList = document.createElement('ul');
              rowButtonUlList.classList.add('pagination');
              rowButtonUlList.classList.add('pagination-sm');

            }
            iDay++;
          }
          dayContainer.appendChild(dayButtonsDivRow);
        }
      }
    },

    /**
     * The core function.
     * Create day containers for each day, and add each game to each day container.
     */
    populateSeasonDays : function(season, seasonApiResult) {

      var seasonDaysContainer, seasonDayContainerTemplate;
      var i, leaguesSet, day0;

      seasonDaysContainer = document.getElementById('season-days-container');
      seasonDayContainerTemplate = document.getElementById('season-day-container-template');

      seasonDaysContainer.classList.remove('invisible');

      // Assemble a sorted list of leagues
      leaguesSet = new Set();
      day0 = seasonApiResult[0];
      for (i = 0; i < day0.length; i++) {
        leaguesSet.add(day0[i].league);
      }
      var leagues = Array.from(leaguesSet);
      leagues.sort();

      // Loop over each day of the season, and add a season day container
      var iDay;
      //for (iDay = 0; iDay < seasonApiResult.length; iDay++) {
      for (iDay = seasonApiResult.length - 1; iDay >= 0; iDay--) {
        var todaysGames = seasonApiResult[iDay];

        // Create copy of season day template
        var dayCloneFragment = seasonDayContainerTemplate.content.cloneNode(true);

        // Add season-X-day-Y id attribute
        var todayId = "season-" + season + "-day-" + (iDay + 1);
        dayCloneFragment.querySelector(".season-day-container").setAttribute("id", todayId);

        // Add to season days container
        seasonDaysContainer.appendChild(dayCloneFragment);

        // Get that div
        var todayDiv = document.getElementById(todayId);

        // Set the anchor
        var aElems = todayDiv.getElementsByClassName('season-day-anchor');
        var kk;
        for (kk = 0; kk < aElems.length; kk++) {
          var aElem = aElems[kk];
          aElem.setAttribute('name', (iDay + 1));
        }

        // Update the day
        var dayElems = todayDiv.getElementsByClassName('season-day');
        var jj;
        for (jj = 0; jj < dayElems.length; jj++) {
          var dayElem = dayElems[jj];
          dayElem.innerHTML = (iDay + 1);
        }

        // Loop over each league and get the league divs
        var iL;
        for (iL = 0; iL < leagues.length; iL++) {
          var iC;

          var leagueName = leagues[iL];

          // Set this league's name header in today's games div
          var leagueNameClass = "league-" + (iL + 1) + "-name";
          var leagueNameElems = todayDiv.getElementsByClassName(leagueNameClass);
          for (iC = 0; iC < leagueNameElems.length; iC++) {
            var leagueNameElem = leagueNameElems[iC];
            leagueNameElem.innerHTML = leagueName;
          }

          // Populate the league containers for this league
          var leagueContainerClass = 'league-' + (iL + 1) + '-container';
          var leagueContainers = todayDiv.getElementsByClassName(leagueContainerClass);
          for (iC = 0; iC < leagueContainers.length; iC++) {
            var leagueContainerElem = leagueContainers[iC];
            this.fillLeagueContainer(leagueContainerElem, leagueName, todaysGames);
          }
        } // end loop over each league
      } // end reverse days loop
    },

    /**
     * Populate the league containers for the given league with games from the /season API endpoint.
     */
    fillLeagueContainer : function(leagueContainerElem, leagueName, todaysGames) {
      var finishedGameTemplate = document.getElementById('finished-game-template');

      var iG;
      for (iG = 0; iG < todaysGames.length; iG++) {
        var game = todaysGames[iG];
        if (game.league == leagueName) {
          // Create a copy of the finished game template and attach it
          var gameCloneFragment = finishedGameTemplate.content.cloneNode(true);
          var gameId = game.gameid;
          gameCloneFragment.querySelector(".card").setAttribute("id", gameId);
          leagueContainerElem.appendChild(gameCloneFragment);

          // Now populate this game card div with details of this game
          var elem = document.getElementById(gameId);

          // Team name labels
          if (
            game.hasOwnProperty('team1Name') && 
            game.hasOwnProperty('team2Name') && 
            game.hasOwnProperty('team3Name') && 
            game.hasOwnProperty('team4Name')
          ) {
            var t1tags = elem.getElementsByClassName('team1name');
            var t2tags = elem.getElementsByClassName('team2name');
            var t3tags = elem.getElementsByClassName('team3name');
            var t4tags = elem.getElementsByClassName('team4name');
            var t;
            for (t = 0; t < t1tags.length; t++) {
              teamNameElem = t1tags[t];
              teamNameElem.innerHTML = game.team1Name;
            }
            for (t = 0; t < t2tags.length; t++) {
              teamNameElem = t2tags[t];
              teamNameElem.innerHTML = game.team2Name;
            }
            for (t = 0; t < t3tags.length; t++) {
              teamNameElem = t3tags[t];
              teamNameElem.innerHTML = game.team3Name;
            }
            for (t = 0; t < t4tags.length; t++) {
              teamNameElem = t4tags[t];
              teamNameElem.innerHTML = game.team4Name;
            }
          }

          // Team colors
          if (
            game.hasOwnProperty('team1Color') && 
            game.hasOwnProperty('team2Color') && 
            game.hasOwnProperty('team3Color') && 
            game.hasOwnProperty('team4Color')
          ) {
            var t1tags = elem.getElementsByClassName('team1color');
            var t2tags = elem.getElementsByClassName('team2color');
            var t3tags = elem.getElementsByClassName('team3color');
            var t4tags = elem.getElementsByClassName('team4color');
            var t;
            for (t = 0; t < t1tags.length; t++) {
              teamColorElem = t1tags[t];
              teamColorElem.style.color = game.team1Color;
            }
            for (t = 0; t < t2tags.length; t++) {
              teamColorElem = t2tags[t];
              teamColorElem.style.color = game.team2Color;
            }
            for (t = 0; t < t3tags.length; t++) {
              teamColorElem = t3tags[t];
              teamColorElem.style.color = game.team3Color;
            }
            for (t = 0; t < t4tags.length; t++) {
              teamColorElem = t4tags[t];
              teamColorElem.style.color = game.team4Color;
            }
          }

          // Assemble team W-L records
          if (
            game.hasOwnProperty('team1W23L') && 
            game.hasOwnProperty('team2W23L') && 
            game.hasOwnProperty('team3W23L') && 
            game.hasOwnProperty('team4W23L')
          ) {
            var t1_wlstr = "(" + game.team1W23L[0] + "-" + game.team1W23L[1] + "-" + game.team1W23L[2] + "-" + game.team1W23L[3] + ", " + (11*game.team1W23L[0] + 7*game.team1W23L[1] + 3*game.team1W23L[2]) + "🌈)";
            var t2_wlstr = "(" + game.team2W23L[0] + "-" + game.team2W23L[1] + "-" + game.team2W23L[2] + "-" + game.team2W23L[3] + ", " + (11*game.team2W23L[0] + 7*game.team2W23L[1] + 3*game.team2W23L[2]) + "🌈)";
            var t3_wlstr = "(" + game.team3W23L[0] + "-" + game.team3W23L[1] + "-" + game.team3W23L[2] + "-" + game.team3W23L[3] + ", " + (11*game.team3W23L[0] + 7*game.team3W23L[1] + 3*game.team3W23L[2]) + "🌈)";
            var t4_wlstr = "(" + game.team4W23L[0] + "-" + game.team4W23L[1] + "-" + game.team4W23L[2] + "-" + game.team4W23L[3] + ", " + (11*game.team4W23L[0] + 7*game.team4W23L[1] + 3*game.team4W23L[2]) + "🌈)";

            var t1tags = elem.getElementsByClassName('team1record');
            var t2tags = elem.getElementsByClassName('team2record');
            var t3tags = elem.getElementsByClassName('team3record');
            var t4tags = elem.getElementsByClassName('team4record');

            var t;
            for (t = 0; t < t1tags.length; t++) {
              teamW23LElem = t1tags[t];
              teamW23LElem.innerHTML = t1_wlstr;
            }
            for (t = 0; t < t2tags.length; t++) {
              teamW23LElem = t2tags[t];
              teamW23LElem.innerHTML = t2_wlstr;
            }
            for (t = 0; t < t3tags.length; t++) {
              teamW23LElem = t3tags[t];
              teamW23LElem.innerHTML = t3_wlstr;
            }
            for (t = 0; t < t4tags.length; t++) {
              teamW23LElem = t4tags[t];
              teamW23LElem.innerHTML = t4_wlstr;
            }
          }

          // Update team scores
          if (
            game.hasOwnProperty('team1Score') && 
            game.hasOwnProperty('team2Score') && 
            game.hasOwnProperty('team3Score') && 
            game.hasOwnProperty('team4Score')
          ) {
            var t1s = game.team1Score;
            var t2s = game.team2Score;
            var t3s = game.team3Score;
            var t4s = game.team4Score;

            var iE;
            var t1ScoreElems = elem.getElementsByClassName('livecells1');
            for (iE = 0; iE < t1ScoreElems.length; iE++) {
              t1ScoreElems[iE].innerHTML = t1s;
            }
            var t2ScoreElems = elem.getElementsByClassName('livecells2');
            for (iE = 0; iE < t2ScoreElems.length; iE++) {
              t2ScoreElems[iE].innerHTML = t2s;
            }
            var t3ScoreElems = elem.getElementsByClassName('livecells3');
            for (iE = 0; iE < t3ScoreElems.length; iE++) {
              t3ScoreElems[iE].innerHTML = t3s;
            }
            var t4ScoreElems = elem.getElementsByClassName('livecells4');
            for (iE = 0; iE < t4ScoreElems.length; iE++) {
              t4ScoreElems[iE].innerHTML = t4s;
            }
          }

          // Update number of generations
          if (game.hasOwnProperty('generations')) {
            var genTags = elem.getElementsByClassName('generations-number');
            var gt;
            for (gt = 0; gt < genTags.length; gt++) {
              genNumberElem = genTags[gt];
              genNumberElem.innerHTML = game.generations;
            }
          }

          // Update map pattern name
          if (game.hasOwnProperty('mapName')) {
            var mapName = game.mapName;
            var mapTags = elem.getElementsByClassName('map-name');
            var mt;
            for (mt = 0; mt < mapTags.length; mt++) {
              mapNameElem = mapTags[mt];
              mapNameElem.innerHTML = mapName;
            }
          }

          // Update simulate game button link
          if (game.hasOwnProperty('gameid')) {
            var btnUrl = this.baseUIUrl + '/simulator/index.html?gameId=' + game.gameid;
            var btnTags = elem.getElementsByClassName('simulate');
            var bt;
            for (bt = 0; bt < btnTags.length; bt++) {
              btnNameElem = btnTags[bt];
              btnNameElem.setAttribute('href', btnUrl);
            }
          }
        } // End if game in correct league
      } // End new divs for each game

    },

    helpers : {
      urlParameters : null, // Cache

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
      }

    },

  };

  SeasonPage.helpers.registerEvent(window, 'load', function () {
    SeasonPage.init();
  }, false);

}());