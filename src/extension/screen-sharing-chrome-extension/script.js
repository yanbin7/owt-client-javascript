// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// Listens for external messages coming from pages that match url pattern defined in manifest.json
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    console.log("Got request", request, sender);
    if (request.getVersion) {
      sendResponse({
        version: chrome.runtime.getManifest().version
      });
      return false; // Dispose of sendResponse
    } else if (request.getStream) {
      // Gets chrome media stream token and returns it in the response.
      var sources = ["screen", "window", "tab", "audio"];
      if (Array.isArray(request.getStream)) {
        sources = request.getStream;
      }
      chrome.desktopCapture.chooseDesktopMedia(sources, sender.tab,
        function(streamId, options) {
          sendResponse({
            streamId: streamId,
            options: options
          });
        });
      return true; // Preserve sendResponse for future use
    } else {
      console.error("Unknown request");
      sendResponse({
        error: "Unknown request"
      });
      return false;
    }
  }
);
