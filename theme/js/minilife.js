/**
 * Golly Minilife App - Autoloader
 * Ch4zm of Hellmouth
 * 16 November 2020
 *
 * minilife.js is the auto-loading version
 * of the minilife game of life. This just
 * creates a wrapper that loads the minilife
 * player on window load.
 */

(function () {

  /**
   * Init on 'load' event
   */
  MiniGOL.helpers.registerEvent(window, 'load', function () {
    MiniGOL.init();
  }, false);

}());

