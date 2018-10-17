// Require all dependencies
var os = require('os');
var ping = require('ping');
var arp = require('node-arp');
var tcpp = require('tcp-ping');

// Define default variable values
var range = "192.168.0.1-255";
var offlineresults = true;
var ownips = [];
var ownmacs = [];

// Run code once app has finished loading the markup
$(function() {
  // Attempt to create a range based on client's network configuration
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      // Skip if interface is a local interface (e.g 127.0.0.1)
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      // Skip if interface doesn't match the two most common configurations (192.168.*.* or 10.0.*.*)
      var checkaddress = iface.address.split('.');
      if (!(checkaddress[0] == 192 || checkaddress[0] == 10)) {
        return;
      }
      // Redefine range if successful
      range = iface.address;
      // Push client's MAC addresses and IP addresses to global array for later use.
      ownmacs.push(iface.mac);
      ownips.push(iface.address);
    });
  });

  // Prefill range field value
  setTimeout(function(){
    var arr = range.split('.');
    arr.splice(-1,1);
    arr.push('1-255');
    range = arr.join('.');
    $('.ip').val(range);
  }, 500);

  // Hide or show offline results
  $(".toggle").click(function() {
    if (offlineresults) {
      $(".toggle").text("Show Offline Results");
      $(".sort-offline").css("display", "none");
      offlineresults = false;
    } else {
      $(".toggle").text("Hide Offline Results");
      $(".sort-offline").css("display", "");
      offlineresults = true;
    }
  })

  // Prepare network scan
  $("form").submit(function( event ) {
    console.log("Network scan initialized...");
    $(".scan-status").html('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i> Scanning network...');
    $(".welcome-text").css('display', 'none');

    // Empty result table incase a previous scan was already done
    $(".sort-header").empty();
    $(".sort-online").empty();
    $(".sort-offline").empty();

    event.preventDefault();
    var ips = $('.ip').val();
    var arr = ips.split('.');
    var iprange = arr[arr.length - 1];
    arr.splice(-1,1);
    var ipbase = arr.join('.');
    var fullrange = iprange.split('-');
    var i = parseInt(fullrange[0]);
    var max = parseInt(fullrange[1]) - 1;
    var completerange = [];
    var createrange = setInterval(function(){
      var createdip = ipbase +'.'+ i;
      completerange.push(createdip);
      if (i >= max) {
        clearInterval(createrange);

        // Start scanning
        var secondary = false;
        $('.sort-header').append('<tr class="host third"><td class="status">IP Address</td><td class="mac">MAC Address</td><td class="hardware">Manufacturer</td><td class="services">Known services</td></tr>');

        // Start scan process for each IP address in range
        var iz = 0;
        completerange.forEach(function(host) {
          ping.sys.probe(host, function(up) {
            // Ping IP address to see if it's online. Return offline if ping is unsuccessful.
            if (up) {
              // Attempt to get MAC address from machine and return "Unknown" if unsuccessful.
              arp.getMAC(host, function(err, mac) {
                if (!err) {
                  if (mac === undefined) {
                    mac = "Unknown";
                  }
                  // Different style for every second element - Currently not active as of right now, but may be used in the future.
                  if (secondary) {
                    var bgcolor = "second";
                    secondary = false;
                  } else {
                    var bgcolor = "first";
                    secondary = true;
                  }

                  // Check for known service ports on machine and add to list if successful.
                  // Currently checks for: Hypertext Transfer Protocol server (80), Secure Shell (22), File Transfer Protocol (21),
                  // MySQL Server (3306), Remote Desktop (3389), Secondary HTTP server (8080) - More protocols may be added in the future.
                  var openservices = "";
                  tcpp.probe(host, 80, function(err, available) {
                    if (available) {
                      openservices += '<span class="service online">HTTP</span>&nbsp;&nbsp;&nbsp;';
                    }
                    tcpp.probe(host, 22, function(err, available) {
                      if (available) {
                        openservices += '<span class="service online">SSH</span>&nbsp;&nbsp;&nbsp;';
                      }
                      tcpp.probe(host, 21, function(err, available) {
                        if (available) {
                          openservices += '<span class="service online">FTP</span>&nbsp;&nbsp;&nbsp;';
                        }
                        tcpp.probe(host, 3306, function(err, available) {
                          if (available) {
                            openservices += '<span class="service online">MySQL</span>&nbsp;&nbsp;&nbsp;';
                          }
                          tcpp.probe(host, 3389, function(err, available) {
                            if (available) {
                              openservices += '<span class="service online">RDP</span>&nbsp;&nbsp;&nbsp;';
                            }
                            tcpp.probe(host, 8080, function(err, available) {
                              if (available) {
                                openservices += '<span class="service online">8080</span>&nbsp;&nbsp;&nbsp;';
                              }

                              // Return "None" if no known services were discovered.
                              if (openservices == "") {
                                openservices = '<span class="greyed">None</span>';
                              }

                              // Retrieve MAC address locally if scanned IP address matches one of client's IP addresses.
                              if (ownips.includes(host)) {
                                mac = ownmacs[0];
                              }

                              // Lookup MAC address in manufacturer database. Will return "Unknown" if unsuccessful.
                              var manufacturer = ouilookup(mac);

                              // If scanned IP address matches one of client's IP addresses, mark MAC address field as "This machine".
                              if (ownips.includes(host)) {
                                $('.sort-online').append('<tr class="host online '+ bgcolor +'"><td class="status">'+ host +' is <span>ONLINE</span></td><td class="mac"><span class="yours">This machine</span></td><td class="hardware">'+ manufacturer +'</td><td class="services">'+ openservices +'</td></tr>');
                              } else {
                                $('.sort-online').append('<tr class="host online '+ bgcolor +'"><td class="status">'+ host +' is <span>ONLINE</span></td><td class="mac">'+ mac +'</td><td class="hardware">'+ manufacturer +'</td><td class="services">'+ openservices +'</tr>');
                              }

                              iz++; // Confirm completion
                              if (iz >= completerange.length) {
                                console.log("Network scan completed!");
                                $(".scan-status").html('Scan completed <i class="fa fa-check" aria-hidden="true"></i>');
                              }
                            });
                          });
                        });
                      });
                    });
                  });
                }
              }); // RXZlcnkgbGlnaHQgbXVzdCBmYWRlLCBldmVyeSBoZWFydCByZXR1cm4gdG8gZGFya25lc3Mh
            } else {
              if (secondary) {
                var bgcolor = "second";
                secondary = false;
              } else {
                var bgcolor = "first";
                secondary = true;
              }
              $('.sort-offline').append('<tr class="host offline '+ bgcolor +'"><td class="status">'+ host +' is <span>OFFLINE</span></td><td class="mac"><span class="greyed">None</span><td class="hardware"><span class="greyed">None</span></td><td class="services"><span class="greyed">None</span></td></tr>');

              iz++; // Confirm completion
              if (iz >= completerange.length) {
                console.log("Network scan completed!");
                $(".scan-status").html('Scan completed <i class="fa fa-check" aria-hidden="true"></i>');
              }
            }
          });
        });
      }
      i++;
    }, 10);
  });
});
