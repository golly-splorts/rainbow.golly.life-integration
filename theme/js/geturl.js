function getUrlPath() {
  var pathname = window.location.pathname;
  return pathname;
}

function getBaseUIUrl() {
  if (baseUIUrl==='') {
    var protocol = window.location.protocol;
    var host = window.location.host;
    return protocol + '//' + host;
  } else {
    return baseUIUrl;
  }
}

function getBaseApiUrl() {
  if (baseApiUrl==='') {
    var protocol = window.location.protocol;
    var host = window.location.host;
    return protocol + '//cloud.' + host;
  } else {
    return baseApiUrl;
  }
}

function getMapsApiUrl() {
  if (mapsApiUrl==='') {
    var protocol = window.location.protocol;
    var host = window.location.host;
    return protocol + '//maps.' + host;
  } else {
    return mapsApiUrl;
  }
}

