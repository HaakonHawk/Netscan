var os = require("os");
var oui = require('./oui.json');

function ouilookup(mac) {
  mac = mac.replace(/[.:-]/g, "").substring(0, 6);
  mac = mac.toUpperCase();
  mac = oui[mac];
  if (mac == undefined) {
    return "Unknown";
  } else {
    mac = mac.split("\n");
    return mac[0];
  }
}
