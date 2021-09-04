(function () {

  var Navbar = {

    baseApiUrl : getBaseApiUrl(),
    baseUIUrl : getBaseUIUrl(),

    init : function() {

      ///////////////////////////
      // Navbar

      // get current day/season info from API /today
      var modeUrl = this.baseApiUrl + '/mode';
      fetch(modeUrl)
      .then(res => res.json())
      .then((modeApiResult) => {

        var navbarSeasonDropdown = document.getElementById('navbar-season-dropdown-menu');
        var navbarPostseasonDropdown = document.getElementById('navbar-postseason-dropdown-menu');

        if (!modeApiResult.hasOwnProperty('season')) {
          throw "Could not find required property (season) in response from /mode API";
        }

        var season0;
        for (season0 = 0; season0 <= modeApiResult.season; season0++) {

          var sp1 = parseInt(season0) + 1;

          // Populate season drop-down
          var sdropElem = document.createElement('a');
          sdropElem.classList.add('dropdown-item');
          //sdropElem.setAttribute('href', baseUIUrl + '/season.html?season=' + season0);
          sdropElem.setAttribute('href', baseUIUrl + '/season.html?which_season=' + sp1);
          sdropElem.innerHTML = 'Season ' + sp1;
          navbarSeasonDropdown.appendChild(sdropElem);

          // Populate postseason drop-down
          var pdropElem = document.createElement('a');
          pdropElem.classList.add('dropdown-item');
          //pdropElem.setAttribute('href', baseUIUrl + '/postseason.html?season=' + season0);
          pdropElem.setAttribute('href', baseUIUrl + '/postseason.html?which_season=' + sp1);
          pdropElem.innerHTML = 'Season ' + sp1;
          navbarPostseasonDropdown.appendChild(pdropElem);

        }

      })
      .catch(err => {
        console.log('Encountered an error while calling /mode');
        console.log(err);
        //this.error(-1);
      }); // end /seeds api call
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

  Navbar.registerEvent(window, 'load', function () {
    Navbar.init();
  }, false);

}());
