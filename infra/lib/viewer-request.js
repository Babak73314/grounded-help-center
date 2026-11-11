// CloudFront Function (runtime cloudfront-js-2.0), viewer-request event.
//
// It does for the static site what a web server would:
//   1. sends every other host name (www, the distribution's own address) to
//      the one canonical domain, when the site has one;
//   2. sends `/` to `/en/` or `/tr/` — a remembered choice first, then the
//      browser's Accept-Language, then English;
//   3. serves `/path/` from `/path/index.html`;
//   4. adds the trailing slash to `/path`, the form every page is published at.
//
// The value of CANONICAL_HOST below is filled in at synthesis time with the
// site's domain (from the CDK context), or left empty when it has none.

var CANONICAL_HOST = '__CANONICAL_HOST__';
var LOCALES = ['en', 'tr'];
var DEFAULT_LOCALE = 'en';
var LOCALE_COOKIE = 'preferred-locale';

function queryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var entry = querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var i = 0; i < values.length; i++) {
      parts.push(values[i].value === '' ? key : key + '=' + values[i].value);
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function redirect(statusCode, location) {
  return {
    statusCode: statusCode,
    statusDescription: statusCode === 301 ? 'Moved Permanently' : 'Found',
    headers: {
      location: { value: location },
      'cache-control': { value: statusCode === 301 ? 'public, max-age=3600' : 'private, no-store' },
    },
  };
}

function preferredLocale(request) {
  var cookie = request.cookies ? request.cookies[LOCALE_COOKIE] : undefined;
  if (cookie && LOCALES.indexOf(cookie.value) !== -1) {
    return cookie.value;
  }
  var header = request.headers['accept-language'];
  if (!header) {
    return DEFAULT_LOCALE;
  }
  var best = null;
  var bestQuality = -1;
  var ranges = header.value.split(',');
  for (var i = 0; i < ranges.length; i++) {
    var parts = ranges[i].split(';');
    var primary = parts[0].trim().toLowerCase().split('-')[0];
    var quality = 1;
    for (var j = 1; j < parts.length; j++) {
      var parameter = parts[j].trim();
      if (parameter.indexOf('q=') === 0) {
        quality = parseFloat(parameter.substring(2));
        if (isNaN(quality)) {
          quality = 0;
        }
      }
    }
    if (LOCALES.indexOf(primary) !== -1 && quality > bestQuality) {
      best = primary;
      bestQuality = quality;
    }
  }
  return best && bestQuality > 0 ? best : DEFAULT_LOCALE;
}

// CloudFront calls the function by this name; nothing in this file does.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value.toLowerCase() : '';
  var uri = request.uri;

  if (CANONICAL_HOST !== '' && host !== '' && host !== CANONICAL_HOST) {
    return redirect(301, 'https://' + CANONICAL_HOST + uri + queryString(request.querystring));
  }

  // A path that starts with "//" (a host name, to a browser) must never become a redirect to another host.
  var collapsed = uri.replace(/\/{2,}/g, '/');
  if (collapsed !== uri) {
    return redirect(301, collapsed + queryString(request.querystring));
  }

  if (uri === '/') {
    return redirect(302, '/' + preferredLocale(request) + '/');
  }

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    return redirect(301, uri + '/' + queryString(request.querystring));
  }

  return request;
}
