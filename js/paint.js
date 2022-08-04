/*
paint.js - functionality of main paint method
*/

define(["qlik", "jquery", "./license", "./tooltip", "../editor/scripts/leonardo-msg"], function
    (qlik, $, license, tooltipJs, leonardo) {

    const lStorageDefault = '{"openedAt":"18991231000000", "objectsOpened": {}}';

    function noLicenseMsg(mode) {
        return `The ${mode} mode would start now, if you had a license for the guided-tour extension.
            <br/><br/>Get in touch with <a href="mailto:insight-sales@databridge.ch">insight-sales@databridge.ch</a> '
            or choose a license-free mode of operation.`
    };

    function getActiveTour(ownId, currSheet, gtourGlobal, layout) {
        // returns the tour id which is currently active, or false if no tour is active
        var activeTour = false;
        for (const sheetId in gtourGlobal.activeTooltip) {
            for (const tourId in gtourGlobal.activeTooltip[sheetId]) {
                if (gtourGlobal.activeTooltip[sheetId][tourId] > -2) {
                    if (tourId == ownId) {
                        // console.log(ownId, `This tour is already active.`);
                    } else {
                        if (layout.pConsoleLog) console.log(ownId, `other tour ${tourId} is already active.`);
                    }
                    activeTour = tourId;
                }
            }
        }
        return activeTour;
    }


    function closeOtherTourObj(ownId, currSheet, gtourGlobal) {
        for (const sheetId in gtourGlobal.activeTooltip) {
            for (const tourId in gtourGlobal.activeTooltip[sheetId]) {
                if (sheetId != currSheet && tourId != ownId) {
                    $(`#${tourId}_tooltip`).remove(); // close tooltips from other sheets found open
                    gtourGlobal.activeTooltip[sheetId][tourId] = -2;
                } else {

                }
            }
        }
    }

    function log(layout, text) {
        if (layout.pConsoleLog) {
            console.log(layout.qInfo.qId, text);
        }
    }


    return {

        paint: async function (layout, tourJson, gtourGlobal) {

            const ownId = layout.qInfo.qId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel;
            const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            const analysisMode = qlik.navigation.getMode() == 'analysis';
            const parentSelector = `[${gtourGlobal.isSingleMode ? 'data-qid' : 'tid'}="${ownId}"] .qv-object-content .ng-scope`;

            if (analysisMode) $('.gtour-picker').remove();
            const lStorageKey = app.id + '|' + ownId;

            // add sheet to activeTooltip object
            if (!Object(gtourGlobal.activeTooltip).hasOwnProperty(currSheet)) {
                gtourGlobal.activeTooltip[currSheet] = {};
            }
            // add this extension id to activeTooltip object
            if (!Object(gtourGlobal.activeTooltip[currSheet]).hasOwnProperty(ownId)) {
                gtourGlobal.activeTooltip[currSheet][ownId] = -2;  // initialize in the global gtourGlobal.activeTooltip array this tour. -2 is: not started
            }

            closeOtherTourObj(ownId, currSheet, gtourGlobal);
            const activeTooltip = gtourGlobal.activeTooltip[currSheet][ownId];

            // Check for auto-click on Next button due to condition
            if (activeTooltip >= 0 && gtourGlobal.cache[ownId].tooltips[activeTooltip].autonextcondi) {
                enigma.evaluate(gtourGlobal.cache[ownId].tooltips[activeTooltip].autonextcondi)
                    .then(function (res) {
                        if (res == -1 || res == 1) {
                            console.log('tooltip #' + (activeTooltip + 1) + ' auto-next-condition ('
                                + gtourGlobal.cache[ownId].tooltips[activeTooltip].autonextcondi + ') was true.');
                            $(`#${ownId}_next`).trigger('click');
                        } else if (res == 0) {
                        } else {
                            console.warn('auto-next condition ' + gtourGlobal.cache[ownId].tooltips[activeTooltip].autonextcondi
                                + ' in tooltip #' + (activeTooltip + 1) + ' results in a value other than true (-1) or false (0), namely ', res);
                        }
                    })
            }

            // console.log(gtourGlobal.activeTooltip);
            const switchPosition = $('#' + ownId + '_hovermode').is(':checked') ? 'checked' : '';

            //$element.html(`
            $(parentSelector).html(`
                <div id="${ownId}_parent" 
                    style="height:100%;display:flex;justify-content:center;align-items:center;color:${layout.pExtensionFontColor};`
                + (layout.pBgImage ? '' : `background-color:${layout.pExtensionBgColor}`) + '">'
                + (tourJson.mode == 'hover' ? `
                    <div class="lui-switch" style="margin-right:9px;">
                        <label class="lui-switch__label">
                        <input type="checkbox" class="lui-switch__checkbox" aria-label="Label" id="${ownId}_hovermode" ${switchPosition} />
                        <span class="lui-switch__wrap">
                            <span class="lui-switch__inner"></span>
                            <span class="lui-switch__switch"></span>
                        </span>
                        </label>
                    </div>
                    `: '') + `
                    <div id="${ownId}_start" style="${tourJson.mode == 'hover' ? '' : 'cursor:pointer;'} text-align:center;${layout.pMoreStyles}">
                        <span class="lui-icon  lui-icon--large  ${getActiveTour(ownId, currSheet, gtourGlobal, layout) == ownId ? 'lui-icon--reload  gtour-rotate' : 'lui-icon--play'}" style="${!layout.pShowIcon || tourJson.mode == 'hover' ? 'display:none;' : ''}" id="${ownId}_play"></span> 
                        ${layout.pTextStart}
                    </div>                    
                </div>
            `);

            // set bg-color or bg image in Sense Client
            if (layout.pBgImage) {
                //$(`[tid="${ownId}"] .qv-inner-object`)
                const bgImage = gtourGlobal.imageBaseUrl[0] + app.id + gtourGlobal.imageBaseUrl[1] + layout.pBgImage.split('/').reverse()[0];
                $(`#${ownId}_parent`).css({
                    "background-image": 'url("' + bgImage + '")',
                    "background-size": layout.pBackgroundSize,
                    "background-repeat": 'no-repeat',
                    "background-position": '50% 50%'
                })
            } else {
                $(`[tid="${ownId}"] .qv-inner-object`)
                    .css('background-color', layout.pExtensionBgColor);
            }
            gtourGlobal.licensedObjs[ownId] = license.chkLicenseJson(layout.pLicenseJSON, 'db_ext_guided_tour');
            // const licensed = gtourGlobal.licensedObjs[ownId] || gtourGlobal.isOEMed != 0;

            if (layout.pConsoleLog) console.log(ownId, 'tourJson', tourJson);

            if (!tourJson.tooltips) {
                const tmpTour = {
                    btnLabelDone: 'OK',
                    tooltips: [
                        { selector: ownId, html: 'Tour is empty. Edit it in the properties panel.' }
                    ]
                };
                var mimikGlobal = {
                    cache: JSON.parse(`{"${ownId}":${JSON.stringify(tmpTour)}}`),
                    isSingleMode: false,
                    licensedObjs: JSON.parse(`{"${ownId}":true}`),
                    activeTooltip: JSON.parse(`{"${currSheet}":{"${ownId}":-2}}`)
                };

                tooltipJs.play(mimikGlobal, ownId, layout, 0, false, enigma, currSheet);

                // ---------------------------------------------------
            } else if (tourJson.mode == 'click') {
                //---------------------------------------------------
                // Standard-Mode ... plays entire tour on click, no auto-launch nor mouse-over

                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        gtourGlobal.visitedTours[ownId] = true;
                        tooltipJs.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                    }
                })
                //---------------------------------------------------
            } else if (tourJson.mode == 'auto-always') {
                //---------------------------------------------------
                // Auto-lauch always ... plays entire tour automatically once per session

                if (!analysisMode) {
                    log(layout, 'auto-always mode suppressed in Edit Mode.');
                } else if (gtourGlobal.visitedTours[ownId]) {
                    log(layout, 'auto-always mode tour was already launched in this session.');
                } else if (!getActiveTour(ownId, currSheet, layout)) {
                    var launch = true
                    // if there is an autoLaunchCondition, calculate if it is true
                    if (gtourGlobal.cache[ownId].autoLaunchCond) {
                        const autoLaunchCond = await enigma.evaluate(gtourGlobal.cache[ownId].autoLaunchCond);
                        launch = ['0', 0, 'false', 'False'].indexOf(autoLaunchCond) == -1;
                        log(layout, `auto-always launch condition is ${autoLaunchCond} (${launch})`);
                    }
                    if (launch) {
                        gtourGlobal.visitedTours[ownId] = true;  // remember for this session, that the tour has been started once
                        tooltipJs.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                    }
                }

                // on click, tour will be restarted.
                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        gtourGlobal.visitedTours[ownId] = true;
                        tooltipJs.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                    }
                })
                //---------------------------------------------------
            } else if (tourJson.mode == 'auto-once') {
                //---------------------------------------------------
                // Auto-lauch once ... plays entire tour automatically and remember per user
                // find out if it is the time to auto-start the tour
                if (!analysisMode) {
                    log(layout, 'auto-once mode suppressed in Edit Mode.');
                } else if (!getActiveTour(ownId, currSheet, layout)) {
                    serverTime = await enigma.evaluate("=TimeStamp(Now(),'YYYYMMDDhhmmss')");
                    var lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                    var launch = true;
                    if (gtourGlobal.cache[ownId].autoLaunchCond) {
                        const autoLaunchCond = await enigma.evaluate(gtourGlobal.cache[ownId].autoLaunchCond);
                        launch = ['0', 0, 'false', 'False'].indexOf(autoLaunchCond) == -1;
                        log(layout, `auto-once launch condition is ${autoLaunch} (${launch})`);
                    }
                    if (launch) {
                        var launchedBefore = !(serverTime >= gtourGlobal.cache[ownId].relaunchAfter
                            && gtourGlobal.cache[ownId].relaunchAfter > lStorageValue.openedAt);
                        // if there is an autoLaunchCondition, calculate if it is true
                        if (launchedBefore) {
                            log(layout, 'user already launched this tour ' + lStorageValue.openedAt + '. Servertime: ' + serverTime);
                        } else {
                            if (gtourGlobal.licensedObjs[ownId] || gtourGlobal.isOEMed != 0) {
                                tooltipJs.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                                lStorageValue.openedAt = serverTime + ''; // save as string
                                window.localStorage.setItem(lStorageKey, JSON.stringify(lStorageValue));
                                log(layout, 'Stored locally: ' + JSON.stringify(lStorageValue));
                                gtourGlobal.visitedTours[ownId] = true;

                            } else {
                                log(layout, 'auto-once would start now but it has no license.');
                                if (!gtourGlobal.noLicenseWarning[ownId]) {
                                    leonardo.msg(ownId, 'Guided-Tour Extension', noLicenseMsg('Auto-launch Once'), null, 'OK');
                                }
                                gtourGlobal.noLicenseWarning[ownId] = true;
                            }
                        }
                    }
                }
                //  if (layout.pConsoleLog) console.log(ownId, 'auto-once suppressed because ' + (analysisMode ? 'analysis-mode' : 'other tour active'));

                // on click, tour will be restarted.
                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        tooltipJs.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                        enigma.evaluate("=TimeStamp(Now(),'YYYYMMDDhhmmss')").then(function (serverTime) {
                            const lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                            lStorageValue.openedAt = serverTime + ''; // save as string
                            window.localStorage.setItem(lStorageKey, JSON.stringify(lStorageValue));
                            log(layout, 'Stored locally: ' + JSON.stringify(lStorageValue));
                        })
                        gtourGlobal.visitedTours[ownId] = true;
                    }
                })
                //---------------------------------------------------
            } else if (tourJson.mode == 'hover') {
                //---------------------------------------------------

                $(`#${ownId}_hovermode`).click(function () {
                    // check if licensed or OEMed                    
                    if (gtourGlobal.licensedObjs[ownId] || gtourGlobal.isOEMed != 0) {

                        const hoverModeSwitch = $(`#${ownId}_hovermode`).is(':checked');
                        if (hoverModeSwitch == true) {
                            gtourGlobal.cache[ownId].tooltips.forEach((tooltip, tooltipNo) => {
                                const tooltipDOMid = `${ownId}_tooltip${tooltipNo + 1}`;
                                tooltipJs.play(gtourGlobal, ownId, layout, tooltipNo, false, enigma,
                                    currSheet, undefined, undefined, undefined, true);
                                $('[tid="' + tooltip.selector + '"]').on('mouseover', function (elem) {
                                    //console.log(tooltip.selector, 'mouseover');
                                    $(`#${tooltipDOMid}`).show();
                                    tooltipJs.repositionCurrToolip(`#${tooltipDOMid}`, gtourGlobal);
                                });
                                $('[tid="' + tooltip.selector + '"]').on('mouseout', function (elem) {
                                    //console.log(tooltip.selector, 'mouseout');
                                    $(`#${tooltipDOMid}`).hide();
                                });
                            });
                            gtourGlobal.activeTooltip[currSheet][ownId] = -1; // set tour to "armed" 

                        } else {
                            // switch to "off", unbind the events;
                            gtourGlobal.cache[ownId].tooltips.forEach((tooltip, tooltipNo) => {
                                // const divId = tooltipDef[0].qText;
                                $('[tid="' + tooltip.selector + '"]').unbind('mouseover');
                                $('[tid="' + tooltip.selector + '"]').unbind('mouseout');
                            });
                            $('.gtour-tooltip-parent').remove();
                            gtourGlobal.activeTooltip[currSheet][ownId] = -2;  // set tour to "off"
                        }

                    } else {
                        // unlicensed
                        $(`#${ownId}_hovermode`).prop('checked', false);
                        leonardo.msg(ownId, 'Guided-Tour Extension', noLicenseMsg('Mouse-over'), null, 'OK');
                    }
                })

                //---------------------------------------------------
            } /*
             else if (tourJson.mode == 'auto-once-p-obj') {
                //---------------------------------------------------
                // find out if auto-start of a tooltip is needed
                if (analysisMode && !getActiveTour(ownId, currSheet, layout)) {
                    if (licensed) {
                        const lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                        // function (ownId, enigma, backendApi, objFieldName, tourFieldName, tourFieldVal, timestampFieldName, lStorageVal)
                        // console.log(ownId, 'starting in mode auto-once-p-obj', layout.pTimestampFromDim, lStorageValue)
                        tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal
                            , layout.pTimestampFromDim, lStorageValue)
                            .then(function (hcube) {
                                gtourGlobal.cache[ownId] = hcube;
                                if (gtourGlobal.cache[ownId].length > 0) {
                                    tooltipJs.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet, lStorageKey, lStorageValue);
                                }
                            })
                            .catch(function () { });
                    } else {
                        if (layout.pConsoleLog) console.log(ownId, 'auto-once-p-obj suppressed because no license');
                        if (!gtourGlobal.noLicenseWarning[ownId]) {
                            leonardo.msg(ownId, 'Guided-Tour Extension', noLicenseMsg("Auto-launch Once Per Tooltip"), null, 'OK');
                        }
                        gtourGlobal.noLicenseWarning[ownId] = true;
                    }

                }
                */
            else {
                if (layout.pConsoleLog) console.warn(ownId, 'mode ' + tourJson.mode + ' is not handled.');
            }
            // on click, tour will be restarted.
            /*
            $(`#${ownId}_start`).click(function () {
                if (!getActiveTour(ownId, currSheet, layout)) {
                    tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal)
                        .then(function (hcube) {
                            gtourGlobal.cache[ownId] = hcube;
                            tooltipJs.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet);
                        })
                        .catch(function () { });
                }
            })
            */
        }

    }

})