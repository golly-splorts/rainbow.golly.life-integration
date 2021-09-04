(function () {

  var CustomFixes = {
    baseUIUrl : getBaseUIUrl(),

    init : function() {

      ///////////////////////////
      // Customized JS for pages

      //// If we are on the articles.html page, make the tables look nice
      //if (getUrlPath().endsWith("articles.html")) {

      if (getUrlPath().includes("/article")) {

        // Make the tables fancy
        var tableTags = document.getElementsByTagName('table');
        var i;
        for (i = 0; i < tableTags.length; i++) {
          tableTags[i].classList.add('table');
        }

        // center the headers and p tags
        var container = document.getElementById('article-div-container');
        container.classList.add('text-center');

      }

    },

    registerEvent : function (element, event, handler, capture) {
      if (/msie/i.test(navigator.userAgent)) {
        element.attachEvent('on' + event, handler);
      } else {
        element.addEventListener(event, handler, capture);
      }
    }

  };

  CustomFixes.registerEvent(window, 'load', function () {
    CustomFixes.init();
  }, false);

}());
