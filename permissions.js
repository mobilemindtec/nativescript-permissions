/**********************************************************************************
 * (c) 2016, Master Technology
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 1.0.0                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

/* jshint camelcase: false */
/* global UIDevice, UIDeviceOrientation, getElementsByTagName, android */


// If this isn't a Android platform we will exit and do nothing.

var application = require('application');

if (!application.android) {
    return;
}

if (typeof application.AndroidApplication.activityRequestPermissionsEvent === 'undefined') {
    throw new Error("You must be using at least version 2.0 of the TNS runtime and core-modules!");
}

// Variables to track any pending promises
var pendingPromises = {}, promiseId = 3000;


/**
 * This handles the results of getting the permissions!
 */
application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, function(args) {

    // get current promise set
    var promises = pendingPromises[args.requestCode];

    // Delete it
    delete pendingPromises[args.requestCode];

    // Check the status of the permission
    if (args.grantResults.length > 0) {
        for(var i = 0; i < args.grantResults.length; i++){
            if (args.grantResults[i] != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                promises.failed();     
                return;
            }
        }        
    }else{
        promises.failed();
        return
    }
    
    promises.granted();
});



/**
 * Checks to see if v4 is installed and has the proper calls with it
 * @returns {boolean}
 */
function hasSupportVersion4() {
    if (!android.support || !android.support.v4 || !android.support.v4.content
        || !android.support.v4.content.ContextCompat
        || !android.support.v4.content.ContextCompat.checkSelfPermission) {
        console.log("No v4 support");
        return false;
    }
    return true;
}


/**
 *
 * @param perm
 * @returns {boolean}
 */
function hasPermission(perm) {
    // If we don't have support v4 loaded; then we can't run any checks and have to assume
    // that they have put the permission in the manifest and everything is good to go
    if (!hasSupportVersion4()) return true;

    // Check for permission
    // Interesting, this actually works on API less than 23 and will return false if the manifest permission was forgotten...
    var hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ==
        android.support.v4.content.ContextCompat.checkSelfPermission(application.android.foregroundActivity, perm);

    return (hasPermission);
}


function request(perm, explanation) {

    return new Promise(function(granted, failed) {

        var needs = []
        var permissions = Object.prototype.toString.call( perm ) === '[object Array]' ? perm : [perm]

        for(var i in permissions){            
            // Check if we already have permissions, then we can grant automatically
            if (!hasPermission(permissions[i])) {                
                needs.push(permissions[i])
            } else if (android.os.Build.VERSION.SDK_INT < 23) {
                // If we are on API < 23 and we get a false back, then this means they forgot to put a manifest permission in...
                failed("not required");
                return;
            }
        }

        if(needs.length == 0){
            granted()
            return
        }


        // Check if we need to show a explanation , if so show it.
        for(var i in permissions){     
            if (android.support.v4.app.ActivityCompat.shouldShowRequestPermissionRationale(application.android.foregroundActivity, permissions[i])) {
                if (typeof explanation === "function") {
                    explanation();
                    break
                } else if (explanation && explanation.length) {
                    var toast = android.widget.Toast.makeText(application.android.context, explanation, android.widget.Toast.LENGTH_LONG);
                    toast.setGravity((48 | 1), 0, 0);
                    toast.show();
                    break
                }
            }
        }

        // Ask for permissions
        promiseId++;
        pendingPromises[promiseId] = {granted: granted, failed: failed};

        android.support.v4.app.ActivityCompat.requestPermissions(application.android.foregroundActivity, needs, promiseId);
    });
}

exports.hasPermission = hasPermission;
exports.requestPermission = request;