(function () {

  var LeaguePage = {

    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),

    loadingElem : null,
    season : null,

    containers : [
      'league-standings-header-container',
      'league-standings-container'
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
      this.loadingElem.classList.add('invisible');
      for (var c in this.containers) {
        var elem = document.getElementById(this.containers[c]);
        elem.classList.add('invisible');
      }

      // Show error elements
      var container = document.getElementById('container-error');
      container.classList.remove("invisible");

    },

    /**
     * Show the loading message while loading API data.
     */
    loading : function() {
      this.loadingElem = document.getElementById('container-loading');
      this.loadingElem.classList.remove('invisible');
    },

    /**
     * Load parameters from the URL (if any are specified)
     * and pass them along to the API-calling functions.
     */
    loadConfig : function() {

      // // Get season url parameter
      // this.season = this.helpers.getUrlParameter('season');

      // Check current season and day
      let url = this.baseApiUrl + '/today';
      fetch(url)
      .then(res => res.json())
      .then((todayApiResult) => {

        this.currentSeason = todayApiResult[0];
        this.currentDay = todayApiResult[1];

        if (this.season==null) {
          this.season = this.currentSeason;
        }

        if (this.season <= this.currentSeason) {
          this.updateSeasonHeader(this.season);
          this.processStandingsData(this.season);
        }
      })
      .catch(err => {
        console.log(err);
        this.error(-1);
      });
    },

    updateSeasonHeader : function(season0) {

      var seasonHeaderContainer = document.getElementById('league-standings-header-container');

      // get element by id "landing-header-season" and change innerHTML to current season
      var seasonHead = document.getElementById('standings-header-season-number');
      if (seasonHead != null) {
        var sp1 = parseInt(season0) + 1;
        seasonHead.innerHTML = sp1;
      }

      seasonHeaderContainer.classList.remove('invisible');

    },

    processStandingsData : function(season0) {

      // TODO: stopped here.

      // Load the league standings
      let recordsUrl = this.baseApiUrl + '/standings';
      fetch(recordsUrl)
      .then(res => res.json())
      .then((standingsApiResult) => {

        // Hide loading message and make league standings container visible
        this.loadingElem.classList.add('invisible');
        var leagueStandingsElem = document.getElementById('league-standings-container');
        leagueStandingsElem.classList.remove('invisible');

        // Use league/division info to figure out where to update league/division names
        for (var iL in standingsApiResult.leagues) {
          var iLp1 = parseInt(iL) + 1;
          var league = standingsApiResult.leagues[iL];

          // Set the league name on the page
          var leagueNameId = 'league-' + iLp1 + '-name';
          var leagueNameElem = document.getElementById(leagueNameId);
          leagueNameElem.innerHTML = league;

          var iDreal = 0;
          for (var iD in standingsApiResult.divisions) {

            var division = standingsApiResult.divisions[iD];
            var iDp1 = parseInt(iDreal) + 1;

            if ((standingsApiResult.rankings[league][division].length) > 0) {

              // Set the division name on the page
              var divisionNameId = 'league-' + iLp1 + '-division-' + iDp1 + '-name';
              var divisionNameElem = document.getElementById(divisionNameId);
              divisionNameElem.innerHTML = division;

              var divisionTableId = "league-" + iLp1 + "-division-" + iDp1 + "-table";
              var divisionTableElem = document.getElementById(divisionTableId);

              /////////////////////////////////
              // Add a table header 
              // (append to divisionTableElem)
              //
              // <thead>
              //   <th>
              //     <span> name
              //
              //   <th>
              //     <span>W-2-3-L record
              //
              //   <th>
              //     <span>n rainbows

              var theadElem = document.createElement('thead');
              var thElem1 = document.createElement('th');
              var thElem2 = document.createElement('th');
              var thElem3 = document.createElement('th');

              thElem1.innerHTML = 'Name';
              thElem2.innerHTML = 'Record';
              thElem3.innerHTML = 'Rainbows';
              theadElem.appendChild(thElem1);
              theadElem.appendChild(thElem2);
              theadElem.appendChild(thElem3);
              divisionTableElem.appendChild(theadElem);

              // Now use the structured league/division nested dictionary
              teamStandingsItems = standingsApiResult.rankings[league][division];

              var iS;
              for (iS = 0; iS < teamStandingsItems.length; iS++) {

                var teamStandings = teamStandingsItems[iS];

                /////////////////////////////////
                // Add a table row for each team 
                // (append to divisionTableElem)
                //
                // <tr>
                //   <td>
                //     <span> icon
                //     <span> team name
                //
                //   <td>
                //     <span>W-2-3-L record
                //
                //   <td>
                //     <span>n rainbows

                // Add a tr element for this team
                var trElem = document.createElement('tr');

                // ----------------
                // Name column: name + icon in a single span

                var tdElem = document.createElement('td');

                var nameiconId = 'league-name-icon-holder';
                var nameicon = document.createElement('span');
                nameicon.setAttribute('id', nameiconId);

                // Icon first (far left)
                if (teamStandings.hasOwnProperty('teamAbbr')) {
                  var icontainerId = "team-icon-container-" + teamStandings.teamAbbr.toLowerCase();
                  var container = document.createElement('span');
                  container.setAttribute('id', icontainerId);
                  container.classList.add('icon-container');
                  container.classList.add('league-icon-container');
                  container.classList.add('text-center');

                  var iconSize = "25";
                  var iconId = "team-icon-" + teamStandings.teamAbbr.toLowerCase();
                  var svg = document.createElement('object');
                  svg.setAttribute('type', 'image/svg+xml');
                  svg.setAttribute('data', '../img/' + teamStandings.teamAbbr.toLowerCase() + '.svg');
                  svg.setAttribute('height', iconSize);
                  svg.setAttribute('width', iconSize);
                  svg.setAttribute('id', iconId);
                  svg.classList.add('icon');
                  svg.classList.add('team-icon');
                  svg.classList.add('invisible');

                  // Attach icon to container, and container to nameicon
                  container.appendChild(svg);
                  nameicon.appendChild(container);

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
                  setTimeout(paint, 100,  teamStandings.teamColor, iconId);
                  setTimeout(paint, 250,  teamStandings.teamColor, iconId);
                  setTimeout(paint, 500,  teamStandings.teamColor, iconId);
                  setTimeout(paint, 1000, teamStandings.teamColor, iconId);
                  setTimeout(paint, 1500, teamStandings.teamColor, iconId);
                }

                // Name next
                var nameSpanElem = document.createElement('span');
                nameSpanElem.innerHTML = teamStandings.teamName;
                nameSpanElem.style.color = teamStandings.teamColor;
                nameicon.appendChild(nameSpanElem);

                // Finish column 1 of table row
                tdElem.appendChild(nameicon);
                trElem.appendChild(tdElem);

                // ----------------
                // W23L column: W-2-3-L

                var tdElem2 = document.createElement('td');
                tdElem2.classList.add('align-items-center');
                tdElem2.classList.add('text-center');

                var w23lElem = document.createElement('span');
                w23lElem.classList.add('standings-w23lrecord');

                var w23lStr = teamStandings.teamW23L[0] + "-" + teamStandings.teamW23L[1] + "-" + teamStandings.teamW23L[2] + "-" + teamStandings.teamW23L[3];
                w23lElem.innerHTML = w23lStr;

                tdElem2.appendChild(w23lElem);
                trElem.appendChild(tdElem2);

                // ----------------
                // Rainbows column

                var tdElem3 = document.createElement('td');
                tdElem3.classList.add('align-items-center');
                tdElem3.classList.add('text-center');

                var rainElem = document.createElement('span');
                rainElem.classList.add('standings-rainbows');

                var rainbows = (11*teamStandings.teamW23L[0] + 7*teamStandings.teamW23L[1] + 3*teamStandings.teamW23L[2]) + " 🌈";
                rainElem.innerHTML = rainbows;

                tdElem3.appendChild(rainElem);
                trElem.appendChild(tdElem3);

                // Now add the row to the table
                divisionTableElem.appendChild(trElem);

              }

              iDreal++;

            } // finish for each team in the standings

          } // end each division loop

          iL++;
        } // end each league loop

      })
      .catch(err => {
        console.log(err);
        this.error(-1);
      }); // end API /standings

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

  LeaguePage.registerEvent(window, 'load', function () {
    LeaguePage.init();
  }, false);

}());