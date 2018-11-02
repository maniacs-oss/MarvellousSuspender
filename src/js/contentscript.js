/*global chrome */
/*
 * The Great Suspender
 * Copyright (C) 2017 Dean Oemcke
 * Available under GNU GENERAL PUBLIC LICENSE v2
 * http://github.com/deanoemcke/thegreatsuspender
 * ლ(ಠ益ಠლ)
*/
(function() {
  'use strict';

  let isFormListenerInitialised = false;
  let isReceivingFormInput = false;
  let isIgnoreForms = false;
  let tempWhitelist = false;

  function suspendTab(suspendedUrl) {
    window.location.replace(suspendedUrl);
  }

  function formInputListener(e) {
    if (!isReceivingFormInput && !tempWhitelist) {
      if (
        event.keyCode >= 48 &&
        event.keyCode <= 90 &&
        event.target.tagName
      ) {
        if (
          event.target.tagName.toUpperCase() === 'INPUT' ||
          event.target.tagName.toUpperCase() === 'TEXTAREA' ||
          event.target.tagName.toUpperCase() === 'FORM' ||
          event.target.isContentEditable === true
        ) {
          isReceivingFormInput = true;
          if (!isBackgroundConnectable()) {
            return false;
          }
          chrome.runtime.sendMessage(buildReportTabStatePayload());
        }
      }
    }
  }

  function initFormInputListener() {
    if (isFormListenerInitialised) {
      return;
    }
    window.addEventListener('keydown', formInputListener);
    isFormListenerInitialised = true;
  }

  //listen for background events
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.hasOwnProperty('action')) {
      if (request.action === 'confirmTabSuspend' &&
        request.suspendedUrl
      ) {
        sendResponse();
        suspendTab(request.suspendedUrl);
        return false;
      }
      if (request.action === 'requestInfo') {
        sendResponse(buildReportTabStatePayload());
        return false;
      }
    }

    if (request.hasOwnProperty('scrollPos')) {
      if (request.scrollPos !== '' && request.scrollPos !== '0') {
        document.body.scrollTop = request.scrollPos;
        document.documentElement.scrollTop = request.scrollPos;
      }
    }
    if (request.hasOwnProperty('ignoreForms')) {
      isIgnoreForms = request.ignoreForms;
      if (isIgnoreForms) {
        initFormInputListener();
      }
      isReceivingFormInput = isReceivingFormInput && isIgnoreForms;
    }
    if (request.hasOwnProperty('tempWhitelist')) {
      if (isReceivingFormInput && !request.tempWhitelist) {
        isReceivingFormInput = false;
      }
      tempWhitelist = request.tempWhitelist;
    }
    sendResponse(buildReportTabStatePayload());
    return false;
  });

  function isBackgroundConnectable() {
    var port = chrome.runtime.connect();
    if (port) {
      port.disconnect();
      return true;
    }
    return false;
  }

  function buildReportTabStatePayload() {
    return {
      action: 'reportTabState',
      status:
        isIgnoreForms && isReceivingFormInput
          ? 'formInput'
          : tempWhitelist
            ? 'tempWhitelist'
            : 'normal',
      scrollPos:
        document.body.scrollTop || document.documentElement.scrollTop || 0,
    };
  }
})();
