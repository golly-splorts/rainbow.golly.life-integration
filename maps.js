(function () {

  var MapsPage = {

    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),
    mapsApiUrl : getMapsApiUrl(),

    loadingElem : null,

    containers : [
      'container-maps-header',
      'container-maps'
    ],

    season0 : 0,

    init : function() {
      this.loading();
      this.populateMapCards();
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

      // Show error elements
      var container = document.getElementById('container-error');
      container.classList.remove("invisible");
    },

    /**
     * Show the loading message while loading API data.
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
     * Load map data from /maps endpoint, and use it to populate map cards.
     */
    populateMapCards : function() {

      // get current day/season info from API /today
      let url = this.baseApiUrl + '/mode';
      fetch(url)
      .then(res => res.json())
      .then((modeApiResult) => {

        if (!modeApiResult.hasOwnProperty('season')) {
          throw "Could not find required property (season) in API /mode response";
        } else {
          this.season0 = modeApiResult.season;
        }

        this.loading(false);

        var mapRowElem = document.getElementById('row-maps');

        let mapsUrl = this.mapsApiUrl + '/maps/rainbow/' + this.season0;
        fetch(mapsUrl)
        .then(res => res.json())
        .then((mapsApiResult) => {

          this.loading(false);

          var mapsContainer = document.getElementById('container-maps');
          mapsContainer.classList.remove('invisible');

          var iM;
          for (iM = 0; iM < mapsApiResult.length; iM++) {
            thisMap = mapsApiResult[iM];

            // Create a clone of the map card template
            var mapCardTemplate = document.getElementById('map-card-template');
            var cloneFragment = mapCardTemplate.content.cloneNode(true);

            // Add the map pattern name as the id
            if (thisMap.hasOwnProperty('patternName')) {
              cloneFragment.querySelector(".card").setAttribute("id", thisMap.patternName);
            }

            // Add the template map card to the page
            mapRowElem.appendChild(cloneFragment);

            // Get a reference to the card we just added
            var mapCard = document.getElementById(thisMap.patternName);

            // Set the title of the map card to the map name
            var mapCardTitleElems = mapCard.getElementsByClassName('map-card-map-name');
            var iE;
            for (iE = 0; iE < mapCardTitleElems.length; iE++) {
              var elem = mapCardTitleElems[iE];
              elem.innerHTML = thisMap.mapName;
            }

            // Set img src
            var imgElems = mapCard.getElementsByClassName('map-card-image');
            var ii;
            for (ii = 0; ii < imgElems.length; ii++) {
              var imgElem = imgElems[ii];
              imgElem.setAttribute('src', this.baseUIUrl + '/img/' + thisMap.patternName + '.png');
            }

            // Set map description
            var descElems = mapCard.getElementsByClassName('map-card-description');
            var iD;
            for (iD = 0; iD < descElems.length; iD++) {
              var descElem = descElems[iD];
              if (thisMap.hasOwnProperty('mapDescription')) {
                descElem.innerHTML = thisMap.mapDescription;
              } else {
                descElem.innerHTML = "(No description found)";
              }
            }

            // Make new label visible if map start date within 2 seasons
            var newBadgeElems = mapCard.getElementsByClassName('map-badge-new');
            var iNew;
            for (iNew = 0; iNew < newBadgeElems.length; iNew++) {
              var newBadgeElem = newBadgeElems[iNew];
              var show = false;
              if (thisMap.hasOwnProperty('mapStartSeason')) {
                if (thisMap.mapStartSeason <= this.season0) {
                  if ((this.season0 - thisMap.mapStartSeason) <= 2) {
                    show = true;
                    newBadgeElem.classList.remove('invisible');
                  }
                }
              }
              if (!show) {
                newBadgeElem.remove();
              }
            }

            // Add the season label to all maps
            var seaBadgeElems = mapCard.getElementsByClassName('map-badge-season');
            var iSea;
            for (iSea = 0; iSea < seaBadgeElems.length; iSea++) {
              var seaBadgeElem = seaBadgeElems[iSea];
              if (thisMap.hasOwnProperty('mapStartSeason')) {
                seaBadgeElem.innerHTML = "Season " + (thisMap.mapStartSeason+1);
                seaBadgeElem.classList.remove('invisible');
              }
            }

            // set inner html of map season badge, and make it visible
            var mapsContainer = document.getElementById('container-maps');
            mapsContainer.classList.remove('invisible');

            // Set simulate button
            var simElems = mapCard.getElementsByClassName('simulate');
            var iS;
            for (iS = 0; iS < simElems.length; iS++) {
              var simElem = simElems[iS];
              if (thisMap.hasOwnProperty('patternName')) {
                simElem.setAttribute('href', this.baseUIUrl + '/simulator/index.html?patternName=' + thisMap.patternName);
              }
            }
          }
        })
        .catch(err => {
          console.log("Encountered an error calling the /maps API endpoint");
          console.log(err);
          this.error(-1);
        }); // end API /maps

      })
      .catch(err => {
        console.log("Encountered an error calling the /mode API endpoint");
        console.log(err);
        this.error(-1);
      });

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

  MapsPage.registerEvent(window, 'load', function () {
    MapsPage.init();
  }, false);

}());