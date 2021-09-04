(function () {

  var LandingPage = {

    // http://localhost:8989/endpoint
    // ^^^^^^^^^^^^^^^^^^^^^
    //      baseApiUrl
    // http://localhost:8000/landing.html
    // ^^^^^^^^^^^^^^^^^^^^^
    //      baseUIUrl
    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),

    landingDivIds : [
      'container-loading',
      'container-mode0009',
      'container-mode1019',
      'container-mode21',
      'container-mode22',
      'container-mode23',
      'container-mode31',
      'container-mode32',
      'container-mode33',
      'container-mode40plus'
    ],

    init : function() {

      this.loading();

      // Load a game from the /game API endpoint
      let url = this.baseApiUrl + '/mode';
      fetch(url)
      .then(res => res.json())
      .then((modeApiResult) => {

        if (!modeApiResult.hasOwnProperty('mode') || !modeApiResult.hasOwnProperty('season')) {
          console.log(modeApiResult);
          throw "Error with required keys (mode, season) in /mode response";
        }

        var mode;
        mode = this.mode = modeApiResult.mode;

        var season;
        season = this.season = modeApiResult.season;

        var start;
        if (modeApiResult.hasOwnProperty('start')) {
          start = modeApiResult.start;
        } else {
          start = 0;
        }

        try {

          if (mode < 0) {
            this.error(mode);
          } else if (mode < 10) {
            this.mode0009(mode, start);
          } else if (mode < 20) {
            this.mode1019(mode);
          } else if (mode < 30) {
            this.mode2029(mode, start);
          } else if (mode < 40) {
            this.mode3039(mode);
          } else {
            this.mode40plus(mode);
          }

        } catch(err) {

          console.log('Encountered an error setting up page for specified mode ' + mode);
          console.log(err);
          this.error(-1);

        }

      })
      .catch(err => {
        console.log('Encountered an error while calling /mode');
        console.log(err);
        this.error(-1);
      });
      // Done loading game from /game API endpoint
    },

    /**
     * Handle the case of an error, tell the user something is wrong
     */
    error : function(mode) {

      // Hide elements
      this.loading(false);

      for (var c in this.landingDivIds) {
        try {
          var elem = document.getElementById(this.landingDivIds[c]);
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
      var loadingContainer = document.getElementById('container-loading');
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
     * Given a container div id, remove all other container divs
     */
    filterContainers : function(saveid) {
      var ix = this.landingDivIds.indexOf(saveid);
      if (ix<0) {
        console.log("Could not find container with ID " + saveid);
        this.error(-1);
      }
      var i;
      for (i=0; i<this.landingDivIds.length; i++) {
        if (i!=ix) {
          // Remove every div except the one with specified id
          try {
            var elem = document.getElementById(this.landingDivIds[i]);
            elem.parentNode.removeChild(elem);
          } catch (e) {
          }
        }
      }
      var container = document.getElementById(saveid);
      container.classList.remove("invisible");
      return container
    },

    /**
     * Function called if site is in mode 0-9 (pre-season)
     */
    mode0009 : function(mode, countdownStart) {
      var container = this.filterContainers('container-mode0009');
      this.updateSeasonHeader();
      this.updateCountdownClock(countdownStart);
      this.loading(false);
      this.minilife();
    },

    /**
     * Function called if site is in mode 10-19 (season underway)
     */
    mode1019 : function(mode) {
      var container = this.filterContainers('container-mode1019');
      this.updateSeasonHeader();
      this.populateSeasonGames(mode, container);
    },

    /**
     * Function called if site is in mode 20-29 (waiting for postseason)
     */
    mode2029 : function(mode, countdownStart) {

      // Handle special cases
      var container;
      if (mode==21) {
        container = this.filterContainers('container-mode21');
      } else if (mode==22) {
        container = this.filterContainers('container-mode22');
      } else if (mode==23) {
        container = this.filterContainers('container-mode23');
      } else {
        this.error(-1);
      }
      this.updateSeasonHeader();
      this.updateCountdownClock(countdownStart);
      this.updateSeedTable();
      this.populatePostseasonWaiting(mode, container);
    },

    /**
     * Function called if site is in mode 30-39 (postseason underway)
     */
    mode3039 : function(mode) {

      // Handle special cases
      var container;
      if (mode==31) {
        container = this.filterContainers('container-mode31');
      } else if (mode==32) {
        container = this.filterContainers('container-mode32');
      } else if (mode==33) {
        container = this.filterContainers('container-mode33');
      } else {
        this.error(-1);
      }
      this.updateSeasonHeader();
      this.updateSeedTable();
      this.populatePostseasonOngoing(mode, container);
    },

    /**
     * Function called if site is in mode 40+ (season and postseason over)
     */
    mode40plus : function(mode) {
      container = this.filterContainers('container-mode40plus');
      this.updateSeasonHeader();
      this.updateChampions();
      this.minilife();
    },

    /**
     * Use the stored site mode and current season to update the Season X header.
     * If we need to add Day Y information, call the /today endpoint.
     */
    updateSeasonHeader : function() {

      // Update the season number
      var elemId = 'landing-header-season-number';
      var seasonNumber = document.getElementById(elemId);
      if (seasonNumber == null) {
        throw "Error using season from /mode endpoint: could not find element " + elemId;
      } else if (this.season < 0) {
        throw "Error using season from /mode endpoint: invalid season " + this.season;
      } else {
        seasonNumber.innerHTML = this.season + 1;
      }

      // handle case where there is a Day to handle
      if ((this.mode >= 10) && (this.mode < 20)) {
        // Regular season days require us to look up the current day with the /today endpoint
        // #landing-header-day contains the Day Y text
        // #landing-header-day-number contains just Y

        // Hide Day Y while we're looking it up (if present...)
        dayTextId = 'landing-header-day';
        var dayText = document.getElementById(dayTextId);
        if (dayText != null) {

          dayText.classList.add('invisible');
      
          // Get current day info from API /today
          let url = this.baseApiUrl + '/today';
          fetch(url)
          .then(res => res.json())
          .then((todayApiResult) => {
            var day = todayApiResult[1] + 1;
            var dayNumber = document.getElementById('landing-header-day-number');
            dayNumber.innerHTML = day;
            dayText.classList.remove('invisible');
            dayText.style="display: inline";
          })
          .catch(err => {
            console.log('Encountered an error while calling /today:');
            console.log(err);
            this.error(-1);
          });
        } else {
          console.log("Could not find element with id " + dayTextId + ", continuing");
        }
      }

    },

    updateCountdownClock : function(countdownSeconds) {
      var unixStart = Math.floor(Date.now() / 1000) + countdownSeconds;
      var flipdown = new FlipDown(unixStart, {
        headings: ["D", "H", "M", "S"],
      }).start();
    },

    /**
     * Use the seed table template to add a postseason seed table to the
     * container elem, and populate it with information from the API /seed endpoint.
     */
    updateSeedTable : function() {

      // Load the leagues and seeds from the API /seeds endpoint
      let url = this.baseApiUrl + '/seeds';
      fetch(url)
      .then(res => res.json())
      .then((seedsApiResult) => {

        var seedtables = document.getElementsByClassName("seed-table");
        var template = document.getElementById('seed-table-template');
        var clone = template.content.cloneNode(true);

        // Create each div on the page
        var s;
        for (s = 0; s < seedtables.length; s++) {
          seedTableElem = seedtables[s];
          seedTableElem.appendChild(clone);
        }

        // Assemble a sorted list of leagues
        var leaguesSet = new Set();
        Object.keys(seedsApiResult).forEach(function(key) {
          leaguesSet.add(key);
        });
        var leagues = Array.from(leaguesSet);
        leagues.sort();

        // Loop over each seed table tag set (should just be one)
        for (s = 0; s < seedtables.length; s++) {
          // Loop over each league, populate league headers and seeds
          seedTableElem = seedtables[s];
          var iL;
          for (iL = 0; iL < leagues.length; iL++) {
            var iLp1 = iL+1;

            // Populate league headers
            var leagueHead = document.getElementById('seed-table-league-'+iLp1+'-name');
            var leagueName = leagues[iL];
            leagueHead.innerHTML = leagueName;
            var leagueSeedList = seedsApiResult[leagueName];

            // Populate seeds with the team name and win-loss record
            var iSeed;
            for (iSeed = 0; iSeed < leagueSeedList.length; iSeed++) {
              var iSp1 = iSeed + 1;

              var seedTeamObject = leagueSeedList[iSeed];
              var seedTeamName = seedTeamObject['teamName'];
              var seedTeamRecord = seedTeamObject['teamWinLoss'];
              var seedTeamRecordStr = "(" + seedTeamRecord[0] + "-" + seedTeamRecord[1] + ")";

              var nameElemId = 'league-'+iLp1+'-seed-'+iSp1;
              var nameElem = document.getElementById(nameElemId);

              var recordElemId = nameElemId + '-record';
              var recordElem = document.getElementById(recordElemId);

              nameElem.innerHTML = seedTeamName;
              recordElem.innerHTML = seedTeamRecordStr;
            }
          }
        }
      })
      .catch(err => {
        console.log("Error while calling /seeds API")
        console.log(err);
        this.error(-1);
      }); // end /seeds api call

    },

    /**
     * Populate the champion information on the season-is-over page
     * using information from the API /champion endpoint.
     */
    updateChampions : function() {

      var champs = document.getElementById('champion-team');
      var champsIcon = document.getElementById('champion-icon');
      var champsName = document.getElementById('champion-name-header');

      // get current champion from API
      let url = this.baseApiUrl + '/champion';
      fetch(url)
      .then(res => res.json())
      .then((apiResult) => {

        if (apiResult.hasOwnProperty('teamName') && apiResult.hasOwnProperty('teamAbbr')) {

          this.loading(false);

          champs.innerHTML = apiResult.teamName;
          champs.style.color = apiResult.teamColor;

          // Make champion name header visible
          champsName.classList.remove('invisible');

          var iconSize = "200";
          var iconId = "champion-icon";
          var icontainerId = "champion-icon-container";
          var icontainer = document.getElementById(icontainerId);
          var svg = document.createElement("object");

          svg.setAttribute('type', 'image/svg+xml');
          svg.setAttribute('data', '../img/' + apiResult.teamAbbr.toLowerCase() + '.svg');
          svg.setAttribute('height', iconSize);
          svg.setAttribute('width', iconSize);
          svg.setAttribute('id', iconId);
          svg.classList.add('icon');
          svg.classList.add('team-icon');
          svg.classList.add('invisible');

          icontainer.appendChild(svg);

          // Wait a little bit for the data to load,
          // then modify the color and make it visible
          var paint = function(color, elemId) {
            var mysvg = $('#' + elemId).getSVG();
            var child = mysvg.find("g path:first-child()");
            if (child.length > 0) {
              child.attr('fill', apiResult.teamColor);
              $('#' + elemId).removeClass('invisible');
            }
          }
          // This fails pretty often, so try a few times.
          setTimeout(paint, 100,  apiResult.teamColor, iconId);
          setTimeout(paint, 250,  apiResult.teamColor, iconId);
          setTimeout(paint, 500,  apiResult.teamColor, iconId);
          setTimeout(paint, 1000, apiResult.teamColor, iconId);
          setTimeout(paint, 1500, apiResult.teamColor, iconId);

        } else {
          throw "Missing required keys (teamName, teamAbbr) from /champion API response";
        }

      })
      .catch(err => {
        console.log("Encountered an error calling /champion API endpoint");
        console.log(err);
        this.error(-1);
      }); // end /champion api call

    },

    /**
     * Add the minilife player to the appropriate <div> element
     */
    minilife : function() {
      var minilife = document.getElementById('minilife-player');
      var template = document.getElementById('minilife-template');
      var clone = template.content.cloneNode(true);
      minilife.appendChild(clone);

      var bod = document.getElementsByTagName('body')[0];
      var jsfiles = ['json-sans-eval.js', 'minilife.js'];
      for (let j in jsfiles) {
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', this.baseUIUrl + '/theme/js/' + jsfiles[j]);
        bod.append(script);
        if (j==1) {
          script.onload = () => {
            MiniGOL.init();
          }
        }
      }
    },

    /**
     * Utility method to populate a league div with results from the /currentGames API
     */
    fillLeagueContainer : function(leagueContainerElem, leagueNameElem, leagueName, currGamesApiResult) {

      leagueNameElem.innerHTML = leagueName;

      // Create divs for all of the games in this league
      for (let g in currGamesApiResult) {
        var game = currGamesApiResult[g];
        if (game.league==leagueName) {

          // Create a clone of the template
          var gametemplate = document.getElementById('inprogress-game-template');
          var cloneFragment = gametemplate.content.cloneNode(true);

          // Add the game id to the template game id
          if (game.hasOwnProperty('gameid')) {
            cloneFragment.querySelector(".card").setAttribute("id", game.gameid);
          } else {
            console.log("Malformed season game data");
            this.error(-1);
          }

          // Add the template game div to the page
          leagueContainerElem.appendChild(cloneFragment);
        }
      }

      // Now populate each div
      for (let g in currGamesApiResult) {
        var game = currGamesApiResult[g];
        if (game.league==leagueName) {

          var elem = document.getElementById(game.gameid);
          if (elem!=null) {

            // Mode 10:

            // Team name labels
            if (
              game.hasOwnProperty('team1Name') && 
              game.hasOwnProperty('team2Name') &&
              game.hasOwnProperty('team3Name') &&
              game.hasOwnProperty('team4Name')
            ) {
              var t1_tags = elem.getElementsByClassName('team1name');
              var t2_tags = elem.getElementsByClassName('team2name');
              var t3_tags = elem.getElementsByClassName('team3name');
              var t4_tags = elem.getElementsByClassName('team4name');

              var t;
              for (t = 0; t < t1_tags.length; t++) {
                teamNameElem = t1_tags[t];
                teamNameElem.innerHTML = game.team1Name;
              }
              for (t = 0; t < t2_tags.length; t++) {
                teamNameElem = t2_tags[t];
                teamNameElem.innerHTML = game.team2Name;
              }
              for (t = 0; t < t3_tags.length; t++) {
                teamNameElem = t3_tags[t];
                teamNameElem.innerHTML = game.team3Name;
              }
              for (t = 0; t < t4_tags.length; t++) {
                teamNameElem = t4_tags[t];
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
              var t1_tags = elem.getElementsByClassName('team1color');
              var t2_tags = elem.getElementsByClassName('team2color');
              var t3_tags = elem.getElementsByClassName('team3color');
              var t4_tags = elem.getElementsByClassName('team4color');
              var t;
              for (t = 0; t < t1_tags.length; t++) {
                teamColorElem = t1_tags[t];
                teamColorElem.style.color = game.team1Color;
              }
              for (t = 0; t < t2_tags.length; t++) {
                teamColorElem = t2_tags[t];
                teamColorElem.style.color = game.team2Color;
              }
              for (t = 0; t < t3_tags.length; t++) {
                teamColorElem = t3_tags[t];
                teamColorElem.style.color = game.team3Color;
              }
              for (t = 0; t < t4_tags.length; t++) {
                teamColorElem = t4_tags[t];
                teamColorElem.style.color = game.team4Color;
              }
            }

            // Assemble team W-L records
            if (
              game.hasOwnProperty('team1WinLoss') && 
              game.hasOwnProperty('team2WinLoss') &&
              game.hasOwnProperty('team3WinLoss') &&
              game.hasOwnProperty('team4WinLoss')
            ) {
              var t1_wlstr = "(" + game.team1WinLoss[0] + "-" + game.team1WinLoss[1] + game.team1WinLoss[2] + "-" + game.team1WinLoss[3] + ", " + (11*game.team1WinLoss[0] + 7*game.team1WinLoss[1] + 3*game.team1WinLoss[2]) + "🌈)";
              var t2_wlstr = "(" + game.team2WinLoss[0] + "-" + game.team2WinLoss[1] + game.team2WinLoss[2] + "-" + game.team2WinLoss[3] + ", " + (11*game.team2WinLoss[0] + 7*game.team2WinLoss[1] + 3*game.team2WinLoss[2]) + "🌈)";
              var t3_wlstr = "(" + game.team3WinLoss[0] + "-" + game.team3WinLoss[1] + game.team3WinLoss[2] + "-" + game.team3WinLoss[3] + ", " + (11*game.team3WinLoss[0] + 7*game.team3WinLoss[1] + 3*game.team3WinLoss[2]) + "🌈)";
              var t4_wlstr = "(" + game.team4WinLoss[0] + "-" + game.team4WinLoss[1] + game.team4WinLoss[2] + "-" + game.team4WinLoss[3] + ", " + (11*game.team4WinLoss[0] + 7*game.team4WinLoss[1] + 3*game.team4WinLoss[2]) + "🌈)";

              var t1_tags = elem.getElementsByClassName('team1record');
              var t2_tags = elem.getElementsByClassName('team2record');
              var t3_tags = elem.getElementsByClassName('team3record');
              var t4_tags = elem.getElementsByClassName('team4record');

              var t;
              for (t = 0; t < t1_tags.length; t++) {
                teamWinLossElem = t1_tags[t];
                teamWinLossElem.innerHTML = t1_wlstr;
              }
              for (t = 0; t < t2_tags.length; t++) {
                teamWinLossElem = t2_tags[t];
                teamWinLossElem.innerHTML = t2_wlstr;
              }
              for (t = 0; t < t3_tags.length; t++) {
                teamWinLossElem = t3_tags[t];
                teamWinLossElem.innerHTML = t3_wlstr;
              }
              for (t = 0; t < t4_tags.length; t++) {
                teamWinLossElem = t4_tags[t];
                teamWinLossElem.innerHTML = t4_wlstr;
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
          } else {
            console.log('Could not find element for game ' + game.gameid);
          }
        } // End if game in correct league
      } // End populate each div
    },


    /**
     * Use the golly API to get the current games for this regular season day,
     * and populate the league divs with games.
     */
    populateSeasonGames : function(mode, container) {
      // get the league names from the games
      let url = this.baseApiUrl + '/currentGames';
      fetch(url)
      .then(res => res.json())
      .then((currGamesApiResult) => {

        this.loading(false);

        // Assemble a sorted list of leagues
        var leaguesSet = new Set();
        for (let g in currGamesApiResult) {
          leaguesSet.add(currGamesApiResult[g].league);
        }
        var leagues = Array.from(leaguesSet);
        leagues.sort();

        // Get references to league containers and name labels
        var leagueContainers = Array();
        var leagueNames = Array();
        var iL;
        for (iL = 0; iL < leagues.length; iL++) {
          var iLp1 = iL + 1;

          var containerId = "league-" + iLp1 + "-container";
          var c = document.getElementById(containerId);
          if (c == null) {
            throw "Could not find " + containerId + " for current games";
          }
          leagueContainers.push(c);

          var nameId = "league-" + iLp1 + "-name";
          var n = document.getElementById(nameId);
          if (n == null) {
            throw "Could not find " + nameId + " for current games";
          }
          leagueNames.push(n);
        }

        // Loop over each league and populate its coresponding div with games
        for (let i in leagues) {

          // This is the container we will add each game to
          var leagueContainerElem = leagueContainers[i];
          var leagueNameElem = leagueNames[i];
          var leagueName = leagues[i];

          this.fillLeagueContainer(leagueContainerElem, leagueNameElem, leagueName, currGamesApiResult);

        } // end for each league

      })
      .catch(err => {
        console.log(err);
        this.error(-1);
      }); // end /currentGames api call
    },

    /**
     * Populate the list of upcoming postseason games.
     */
    populatePostseasonWaiting : function(mode, container) {

      // get the league names from the games
      let url = this.baseApiUrl + '/currentGames';
      fetch(url)
      .then(res => res.json())
      .then((currGamesApiResult) => {

        this.loading(false);

        // Assemble a sorted list of leagues
        var leaguesSet = new Set();
        for (let iG in currGamesApiResult) {
          var game = currGamesApiResult[iG];
          if (game.hasOwnProperty('league')) {
            var league = game.league;
            leaguesSet.add(league);
          }
        }
        var leagues = Array.from(leaguesSet);
        leagues.sort();

        if (mode==22) {

          /////////////////////////////////////////////
          // Championship Series
          // Scheduled

          // Get references to league containers and name labels
          var leagueContainers = Array();
          var leagueNames = Array();
          var iL;
          for (iL = 0; iL < leagues.length; iL++) {
            var iLp1 = iL + 1;

            var containerId = "league-" + iLp1 + "-container";
            var c = document.getElementById(containerId);
            if (c == null) {
              throw "Could not find " + containerId + " for current games";
            }
            leagueContainers.push(c);

            var nameId = "league-" + iLp1 + "-name";
            var n = document.getElementById(nameId);
            if (n == null) {
              throw "Could not find " + nameId + " for current games";
            }
            leagueNames.push(n);
          }

          // Loop over each league and populate its coresponding div with games
          for (let i in leagues) {

            var leagueContainerElem = leagueContainers[i];
            var leagueNameElem = leagueNames[i];

            leagueNameElem.innerHTML = leagues[i];

            // Create divs for all of the games in this league
            for (let g in currGamesApiResult) {
              var game = currGamesApiResult[g];
              if (!game.hasOwnProperty('league') || !game.hasOwnProperty('gameid')) {
                throw "Missing required keys (league, gameid) from result from /currentGames API";
              }
              if (game.league==leagues[i]) {
                // Create a clone of the postgame template
                var postTemplate = document.getElementById('scheduled-postgame-template');
                var cloneFragment = postTemplate.content.cloneNode(true);

                // Add the game id to the template game id
                cloneFragment.querySelector(".card").setAttribute("id", game.gameid);

                // Add the template game div to the league container
                leagueContainerElem.appendChild(cloneFragment);
              }
            } // end loop creating divs for each game in league

            // Now populate each div
            for (let g in currGamesApiResult) {
              var game = currGamesApiResult[g];
              if (game.league==leagues[i]) {
                var elem = document.getElementById(game.gameid);
                if (elem!=null) {

                  // Mode 22:

                  // --------------
                  // Team name labels:

                  if (
                    game.hasOwnProperty('team1Name') && 
                    game.hasOwnProperty('team2Name') && 
                    game.hasOwnProperty('team3Name') && 
                    game.hasOwnProperty('team4Name')
                  ) {
                    var t1_tags = elem.getElementsByClassName('team1name');
                    var t2_tags = elem.getElementsByClassName('team2name');
                    var t3_tags = elem.getElementsByClassName('team3name');
                    var t4_tags = elem.getElementsByClassName('team4name');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamNameElem = t1_tags[t];
                      teamNameElem.innerHTML = game.team1Name;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamNameElem = t2_tags[t];
                      teamNameElem.innerHTML = game.team2Name;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamNameElem = t3_tags[t];
                      teamNameElem.innerHTML = game.team3Name;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamNameElem = t4_tags[t];
                      teamNameElem.innerHTML = game.team4Name;
                    }
                  }

                  // --------------
                  // Team colors
                  if (
                    game.hasOwnProperty('team1Color') && 
                    game.hasOwnProperty('team2Color') && 
                    game.hasOwnProperty('team3Color') && 
                    game.hasOwnProperty('team4Color')
                  ) {
                    var t1_tags = elem.getElementsByClassName('team1color');
                    var t2_tags = elem.getElementsByClassName('team2color');
                    var t3_tags = elem.getElementsByClassName('team3color');
                    var t4_tags = elem.getElementsByClassName('team4color');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamColorElem = t1_tags[t];
                      teamColorElem.style.color = game.team1Color;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamColorElem = t2_tags[t];
                      teamColorElem.style.color = game.team2Color;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamColorElem = t3_tags[t];
                      teamColorElem.style.color = game.team3Color;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamColorElem = t4_tags[t];
                      teamColorElem.style.color = game.team4Color;
                    }
                  }

                  // Mode 22 - season is over, postseason has not started.
                  // Don't show any W-2-3-L records or rainbows, too confusing.
                  if (true) {
                    // empty strings all around
                    var t1_wlstr = "";
                    var t2_wlstr = "";
                    var t3_wlstr = "";
                    var t4_wlstr = "";

                    var t1_tags = elem.getElementsByClassName('team1seriesrecord');
                    var t2_tags = elem.getElementsByClassName('team2seriesrecord');
                    var t3_tags = elem.getElementsByClassName('team3seriesrecord');
                    var t4_tags = elem.getElementsByClassName('team4seriesrecord');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamWinLossElem = t1_tags[t];
                      teamWinLossElem.innerHTML = t1_wlstr;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamWinLossElem = t2_tags[t];
                      teamWinLossElem.innerHTML = t2_wlstr;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamWinLossElem = t3_tags[t];
                      teamWinLossElem.innerHTML = t3_wlstr;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamWinLossElem = t4_tags[t];
                      teamWinLossElem.innerHTML = t4_wlstr;
                    }
                  }

                  // Game description
                  if (game.hasOwnProperty('description')) {
                    descrElems = elem.getElementsByClassName('postseason-game-description');
                    for (let d in descrElems) {
                      descrElems[d].innerHTML = game.description;
                    }
                  }

                  // Update map pattern name
                  if (game.hasOwnProperty('mapName')) {
                    var mapName = game.mapName;
                    var mapTags = elem.getElementsByClassName('map-name');
                    for (let mt in mapTags) {
                      mapTags[mt].innerHTML = mapName;
                    }
                  }

                } else {
                  throw "Could not find page element for game id " + game.gameid;
                } // end if found game id elem
              } // end if correct league
            } // end loops updating divs for each game in the league
          } // end for each league

        } else if(mode==23) {

          ////////////////////////////
          // Rainbow Cup Series
          // Scheduled

          // Rainbow Cup has no league, single-column
          var leagueContainerElem = document.getElementById('rcs-league-waiting-container');
          for (let g in currGamesApiResult) {
            var game = currGamesApiResult[g];
            if (!game.hasOwnProperty('gameid')) {
              throw "Missing required key (gameid) from result frmo /currentGames API";
            }


            // Create a clone of the template
            var postTemplate = document.getElementById('scheduled-postgame-template');
            var cloneFragment = postTemplate.content.cloneNode(true);

            // Add the game id to the template game id
            if (game.hasOwnProperty('gameid')) {
              cloneFragment.querySelector(".card").setAttribute("id", game.gameid);
            }

            // Add the template game div to the page
            leagueContainerElem.appendChild(cloneFragment);

          } // end loop creating divs for each game in league

          // Now populate the div
          for (let g in currGamesApiResult) {
            var game = currGamesApiResult[g];
            var elem = document.getElementById(game.gameid);
            if (elem != null) { 

              // Mode 23:

              // --------------
              // Team name labels:

              if (
                game.hasOwnProperty('team1Name') && 
                game.hasOwnProperty('team2Name') && 
                game.hasOwnProperty('team3Name') && 
                game.hasOwnProperty('team4Name')
              ) {
                var t1_tags = elem.getElementsByClassName('team1name');
                var t2_tags = elem.getElementsByClassName('team2name');
                var t3_tags = elem.getElementsByClassName('team3name');
                var t4_tags = elem.getElementsByClassName('team4name');

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamNameElem = t1_tags[t];
                  teamNameElem.innerHTML = game.team1Name;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamNameElem = t2_tags[t];
                  teamNameElem.innerHTML = game.team2Name;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamNameElem = t3_tags[t];
                  teamNameElem.innerHTML = game.team3Name;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamNameElem = t4_tags[t];
                  teamNameElem.innerHTML = game.team4Name;
                }
              }

              // --------------
              // Team colors
              if (
                game.hasOwnProperty('team1Color') && 
                game.hasOwnProperty('team2Color') && 
                game.hasOwnProperty('team3Color') && 
                game.hasOwnProperty('team4Color')
              ) {
                var t1_tags = elem.getElementsByClassName('team1color');
                var t2_tags = elem.getElementsByClassName('team2color');
                var t3_tags = elem.getElementsByClassName('team3color');
                var t4_tags = elem.getElementsByClassName('team4color');

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamColorElem = t1_tags[t];
                  teamColorElem.style.color = game.team1Color;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamColorElem = t2_tags[t];
                  teamColorElem.style.color = game.team2Color;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamColorElem = t3_tags[t];
                  teamColorElem.style.color = game.team3Color;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamColorElem = t4_tags[t];
                  teamColorElem.style.color = game.team4Color;
                }
              }

              // Mode 23 - one series is over, other has not started.
              // Don't show any W-2-3-L records or rainbows, too confusing.
              if (true) {
                // empty strings all around
                var t1_wlstr = "";
                var t2_wlstr = "";
                var t3_wlstr = "";
                var t4_wlstr = "";

                var t1_tags = elem.getElementsByClassName('team1seriesrecord');
                var t2_tags = elem.getElementsByClassName('team2seriesrecord');
                var t3_tags = elem.getElementsByClassName('team3seriesrecord');
                var t4_tags = elem.getElementsByClassName('team4seriesrecord');

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamWinLossElem = t1_tags[t];
                  teamWinLossElem.innerHTML = t1_wlstr;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamWinLossElem = t2_tags[t];
                  teamWinLossElem.innerHTML = t2_wlstr;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamWinLossElem = t3_tags[t];
                  teamWinLossElem.innerHTML = t3_wlstr;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamWinLossElem = t4_tags[t];
                  teamWinLossElem.innerHTML = t4_wlstr;
                }
              }

              // Game description
              if (game.hasOwnProperty('description')) {
                descrElems = elem.getElementsByClassName('postseason-game-description');
                for (let d in descrElems) {
                  descrElems[d].innerHTML = game.description;
                }
              }

              // Update map pattern name
              if (game.hasOwnProperty('mapName')) {
                var mapName = game.mapName;
                var mapTags = elem.getElementsByClassName('map-name');
                for (let mt in mapTags) {
                  mapTags[mt].innerHTML = mapName;
                }
              }

            } else {
              throw "Could not find page element for game id " + game.gameid;
            } // end if found game id elem
          } // end loops updating divs for each game
        } // end if mode 21/22/23
      })
      .catch(err => {
        console.log(err);
        this.error(-1);
      }); // end API /currentGames
    },

    /**
     * Populate the list of ongoing postseason games.
     */
    populatePostseasonOngoing : function(mode, container) {

      // get the league names from the games
      let url = this.baseApiUrl + '/currentGames';

      fetch(url)
      .then(res => res.json())
      .then((currGamesApiResult) => {

        this.loading(false);

        // Assemble a sorted list of leagues
        var leaguesSet = new Set();
        for (let iG in currGamesApiResult) {
          var game = currGamesApiResult[iG];
          if (game.hasOwnProperty('league')) {
            var league = game.league;
            leaguesSet.add(league);
          }
        }
        var leagues = Array.from(leaguesSet);
        leagues.sort();

        if (mode==32) {

          /////////////////////////////////////////////
          // Championship Series
          // In progress

          // Get references to league containers and name labels
          var leagueContainers = Array();
          var leagueNames = Array();
          var iL;
          for (iL = 0; iL < leagues.length; iL++) {
            var iLp1 = iL + 1;

            var containerId = "league-" + iLp1 + "-container";
            var c = document.getElementById(containerId);
            if (c == null) {
              throw "Could not find " + containerId + " for current games";
            }
            leagueContainers.push(c);

            var nameId = "league-" + iLp1 + "-name";
            var n = document.getElementById(nameId);
            if (n == null) {
              throw "Could not find " + nameId + " for current games";
            }
            leagueNames.push(n);
          }

          // Loop over each league and populate its coresponding div with games
          for (let i in leagues) {

            var leagueContainerElem = leagueContainers[i];
            var leagueNameElem = leagueNames[i];

            leagueNameElem.innerHTML = leagues[i];

            // Create divs for all of the games in this league
            for (let g in currGamesApiResult) {
              var game = currGamesApiResult[g];
              if (!game.hasOwnProperty('league') || !game.hasOwnProperty('gameid')) {
                throw "Missing required keys (league, gameid) from result from /currentGames API";
              }
              if (game.league==leagues[i]) {
                // Create a clone of the postgame template
                var postTemplate = document.getElementById('inprogress-postgame-template');
                var cloneFragment = postTemplate.content.cloneNode(true);

                // Add the game id to the template game id
                cloneFragment.querySelector(".card").setAttribute("id", game.gameid);

                // Add the template game div to the league container
                leagueContainerElem.appendChild(cloneFragment);
              }
            } // end loop creating divs for each game in league

            // Now populate each div
            for (let g in currGamesApiResult) {
              var game = currGamesApiResult[g];
              if (game.league==leagues[i]) {
                var t1_tags, t2_tags, t3_tags, t4_tags;
                var t, elem;
                elem = document.getElementById(game.gameid);
                if (elem!=null) {

                  // Mode 32:

                  // --------------
                  // Team name labels:

                  if (
                    game.hasOwnProperty('team1Name') && 
                    game.hasOwnProperty('team2Name') && 
                    game.hasOwnProperty('team3Name') && 
                    game.hasOwnProperty('team4Name')
                  ) {
                    var t1_tags = elem.getElementsByClassName('team1name');
                    var t2_tags = elem.getElementsByClassName('team2name');
                    var t3_tags = elem.getElementsByClassName('team3name');
                    var t4_tags = elem.getElementsByClassName('team4name');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamNameElem = t1_tags[t];
                      teamNameElem.innerHTML = game.team1Name;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamNameElem = t2_tags[t];
                      teamNameElem.innerHTML = game.team2Name;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamNameElem = t3_tags[t];
                      teamNameElem.innerHTML = game.team3Name;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamNameElem = t4_tags[t];
                      teamNameElem.innerHTML = game.team4Name;
                    }
                  }

                  // --------------
                  // Team colors
                  if (
                    game.hasOwnProperty('team1Color') && 
                    game.hasOwnProperty('team2Color') && 
                    game.hasOwnProperty('team3Color') && 
                    game.hasOwnProperty('team4Color')
                  ) {
                    var t1_tags = elem.getElementsByClassName('team1color');
                    var t2_tags = elem.getElementsByClassName('team2color');
                    var t3_tags = elem.getElementsByClassName('team3color');
                    var t4_tags = elem.getElementsByClassName('team4color');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamColorElem = t1_tags[t];
                      teamColorElem.style.color = game.team1Color;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamColorElem = t2_tags[t];
                      teamColorElem.style.color = game.team2Color;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamColorElem = t3_tags[t];
                      teamColorElem.style.color = game.team3Color;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamColorElem = t4_tags[t];
                      teamColorElem.style.color = game.team4Color;
                    }
                  }

                  // Assemble series W-L records
                  if (
                    game.hasOwnProperty('team1SeriesW23L') && 
                    game.hasOwnProperty('team2SeriesW23L') &&
                    game.hasOwnProperty('team3SeriesW23L') &&
                    game.hasOwnProperty('team4SeriesW23L')
                  ) {
                    var t1_wlstr = "(" + game.team1SeriesW23L[0] + "-" + game.team1SeriesW23L[1] + "-" + game.team1SeriesW23L[2] + "-" + game.team1SeriesW23L[3] + ", " + (11*game.team1SeriesW23L[0] + 7*game.team1SeriesW23L[1] + 3*game.team1SeriesW23L[2]) + "🌈)";
                    var t2_wlstr = "(" + game.team2SeriesW23L[0] + "-" + game.team2SeriesW23L[1] + "-" + game.team2SeriesW23L[2] + "-" + game.team2SeriesW23L[3] + ", " + (11*game.team2SeriesW23L[0] + 7*game.team2SeriesW23L[1] + 3*game.team2SeriesW23L[2]) + "🌈)";
                    var t3_wlstr = "(" + game.team3SeriesW23L[0] + "-" + game.team3SeriesW23L[1] + "-" + game.team3SeriesW23L[2] + "-" + game.team3SeriesW23L[3] + ", " + (11*game.team3SeriesW23L[0] + 7*game.team3SeriesW23L[1] + 3*game.team3SeriesW23L[2]) + "🌈)";
                    var t4_wlstr = "(" + game.team4SeriesW23L[0] + "-" + game.team4SeriesW23L[1] + "-" + game.team4SeriesW23L[2] + "-" + game.team4SeriesW23L[3] + ", " + (11*game.team4SeriesW23L[0] + 7*game.team4SeriesW23L[1] + 3*game.team4SeriesW23L[2]) + "🌈)";

                    var t1_tags = elem.getElementsByClassName('team1seriesrecord');
                    var t2_tags = elem.getElementsByClassName('team2seriesrecord');
                    var t3_tags = elem.getElementsByClassName('team3seriesrecord');
                    var t4_tags = elem.getElementsByClassName('team4seriesrecord');

                    var t;
                    for (t = 0; t < t1_tags.length; t++) {
                      teamWinLossElem = t1_tags[t];
                      teamWinLossElem.innerHTML = t1_wlstr;
                    }
                    for (t = 0; t < t2_tags.length; t++) {
                      teamWinLossElem = t2_tags[t];
                      teamWinLossElem.innerHTML = t2_wlstr;
                    }
                    for (t = 0; t < t3_tags.length; t++) {
                      teamWinLossElem = t3_tags[t];
                      teamWinLossElem.innerHTML = t3_wlstr;
                    }
                    for (t = 0; t < t4_tags.length; t++) {
                      teamWinLossElem = t4_tags[t];
                      teamWinLossElem.innerHTML = t4_wlstr;
                    }
                  }

                  // Game description
                  if (game.hasOwnProperty('description')) {
                    descrElems = elem.getElementsByClassName('postseason-game-description');
                    var d;
                    for (d = 0; d < descrElems.length; d++) {
                      descrElems[d].innerHTML = game.description;
                    }
                  }

                  // Update map name
                  if (game.hasOwnProperty('mapName')) {
                    var mapName = game.mapName;
                    var mapTags = elem.getElementsByClassName('map-name');
                    var mt;
                    for (mt = 0; mt < mapTags.length; mt++) {
                      mapTags[mt].innerHTML = mapName;
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

                } else {
                  throw "Could not find page element for game id " + game.gameid;
                } // end if found game id elem
              } // end if correct league
            } // end loops updating divs for each game in the league
          } // end for each league

        } else if (mode==33) {

          ////////////////////////////
          // Rainbow Cup Series
          // In progress

          // RCS has no league, single-column
          var leagueContainerElem = document.getElementById('rcs-league-ongoing-container');
          var g;
          for (g = 0; g < currGamesApiResult.length; g++) {
            var game = currGamesApiResult[g];

            // Create a clone of the template
            var postTemplate = document.getElementById('inprogress-postgame-template');
            var cloneFragment = postTemplate.content.cloneNode(true);

            // Add the game id to the template game id
            if (game.hasOwnProperty('gameid')) {
              cloneFragment.querySelector(".card").setAttribute("id", game.gameid);
            }

            // Add the template game div to the league container
            leagueContainerElem.appendChild(cloneFragment);
          }

          // Now populate the div
          for (g = 0; g < currGamesApiResult.length; g++) {
            var game = currGamesApiResult[g];
            var elem = document.getElementById(game.gameid);
            if (elem != null) { 

              // Mode 33:

              // --------------
              // Team name labels:

              if (
                game.hasOwnProperty('team1Name') && 
                game.hasOwnProperty('team2Name') && 
                game.hasOwnProperty('team3Name') && 
                game.hasOwnProperty('team4Name')
              ) {
                var t1_tags = elem.getElementsByClassName('team1name');
                var t2_tags = elem.getElementsByClassName('team2name');
                var t3_tags = elem.getElementsByClassName('team3name');
                var t4_tags = elem.getElementsByClassName('team4name');

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamNameElem = t1_tags[t];
                  teamNameElem.innerHTML = game.team1Name;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamNameElem = t2_tags[t];
                  teamNameElem.innerHTML = game.team2Name;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamNameElem = t3_tags[t];
                  teamNameElem.innerHTML = game.team3Name;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamNameElem = t4_tags[t];
                  teamNameElem.innerHTML = game.team4Name;
                }
              }

              // --------------
              // Team colors
              if (
                game.hasOwnProperty('team1Color') && 
                game.hasOwnProperty('team2Color') && 
                game.hasOwnProperty('team3Color') && 
                game.hasOwnProperty('team4Color')
              ) {
                var t1_tags = elem.getElementsByClassName('team1color');
                var t2_tags = elem.getElementsByClassName('team2color');
                var t3_tags = elem.getElementsByClassName('team3color');
                var t4_tags = elem.getElementsByClassName('team4color');

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamColorElem = t1_tags[t];
                  teamColorElem.style.color = game.team1Color;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamColorElem = t2_tags[t];
                  teamColorElem.style.color = game.team2Color;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamColorElem = t3_tags[t];
                  teamColorElem.style.color = game.team3Color;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamColorElem = t4_tags[t];
                  teamColorElem.style.color = game.team4Color;
                }
              }

              // Assemble series W-L records
              if (
                game.hasOwnProperty('team1SeriesW23L') && 
                game.hasOwnProperty('team2SeriesW23L') &&
                game.hasOwnProperty('team3SeriesW23L') &&
                game.hasOwnProperty('team4SeriesW23L')
              ) {
                var t1_wlstr = "(" + game.team1SeriesW23L[0] + "-" + game.team1SeriesW23L[1] + "-" + game.team1SeriesW23L[2] + "-" + game.team1SeriesW23L[3] + ", " + (11*game.team1SeriesW23L[0] + 7*game.team1SeriesW23L[1] + 3*game.team1SeriesW23L[2]) + "🌈)";
                var t2_wlstr = "(" + game.team2SeriesW23L[0] + "-" + game.team2SeriesW23L[1] + "-" + game.team2SeriesW23L[2] + "-" + game.team2SeriesW23L[3] + ", " + (11*game.team2SeriesW23L[0] + 7*game.team2SeriesW23L[1] + 3*game.team2SeriesW23L[2]) + "🌈)";
                var t3_wlstr = "(" + game.team3SeriesW23L[0] + "-" + game.team3SeriesW23L[1] + "-" + game.team3SeriesW23L[2] + "-" + game.team3SeriesW23L[3] + ", " + (11*game.team3SeriesW23L[0] + 7*game.team3SeriesW23L[1] + 3*game.team3SeriesW23L[2]) + "🌈)";
                var t4_wlstr = "(" + game.team4SeriesW23L[0] + "-" + game.team4SeriesW23L[1] + "-" + game.team4SeriesW23L[2] + "-" + game.team4SeriesW23L[3] + ", " + (11*game.team4SeriesW23L[0] + 7*game.team4SeriesW23L[1] + 3*game.team4SeriesW23L[2]) + "🌈)";

                var t1_tags = elem.getElementsByClassName('team1seriesrecord');
                var t2_tags = elem.getElementsByClassName('team2seriesrecord');
                var t3_tags = elem.getElementsByClassName('team3seriesrecord');
                var t4_tags = elem.getElementsByClassName('team4seriesrecord');
                console.log(t1_tags);

                var t;
                for (t = 0; t < t1_tags.length; t++) {
                  teamWinLossElem = t1_tags[t];
                  teamWinLossElem.innerHTML = t1_wlstr;
                }
                for (t = 0; t < t2_tags.length; t++) {
                  teamWinLossElem = t2_tags[t];
                  teamWinLossElem.innerHTML = t2_wlstr;
                }
                for (t = 0; t < t3_tags.length; t++) {
                  teamWinLossElem = t3_tags[t];
                  teamWinLossElem.innerHTML = t3_wlstr;
                }
                for (t = 0; t < t4_tags.length; t++) {
                  teamWinLossElem = t4_tags[t];
                  teamWinLossElem.innerHTML = t4_wlstr;
                }
              }

              // Game description
              if (game.hasOwnProperty('description')) {
                descTags = elem.getElementsByClassName('postseason-game-description');
                var j;
                for (j = 0; j < descTags.length; j++) {
                  descElem = descTags[j];
                  descElem.innerHTML = game.description;
                }
              }

              // Update map name
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

            } else {
              throw "Could not find page element for game id " + game.gameid;
            } // end if found game id elem
          } // end loop populating divs for each game
        } // end if mode 33

      })
      .catch(err => {
        console.log("Encountered an error in the /currentGames API call");
        console.log(err);
        this.error(-1);
      }); // end /currentGames api call

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

  };

  LandingPage.registerEvent(window, 'load', function () {
    LandingPage.init();
  }, false);

}());