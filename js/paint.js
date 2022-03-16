/*
paint.js - functionality of main paint method

Version: 0.1
History:
0.1, Christof Schwarz, alpha version

*/

define(["qlik", "jquery", "./license", "./tooltip"], function
    (qlik, $, license, tooltip) {

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


    return {

        paint: async function (layout, tourJson, gtourGlobal) {

            const ownId = layout.qInfo.qId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel;
            const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            const mode = qlik.navigation.getMode();
            const parentSelector = `[${gtourGlobal.isSingleMode ? 'data-qid' : 'tid'}="${ownId}"] .qv-object-content .ng-scope`;

            if (layout.pConsoleLog) console.log(ownId, 'paint.paint', layout, tourJson);
            if (mode != 'edit') $('.gtour-picker').remove();
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
                        if (res == -1) {
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

                tooltip.play(mimikGlobal, ownId, layout, 0, false, enigma, currSheet);

                // ---------------------------------------------------
            } else if (tourJson.mode == 'click') {
                //---------------------------------------------------
                // Standard-Mode ... plays entire tour on click, no auto-launch nor mouse-over

                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        gtourGlobal.visitedTours[ownId] = true;
                        tooltip.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                    }
                })
                //---------------------------------------------------
            } /* else if (tourJson.mode == 'hover') {
                //---------------------------------------------------
                
                $(`#${ownId}_hovermode`).click(function () {
                    if (!licensed) {
                        $(`#${ownId}_hovermode`).prop('checked', false);
                        leonardo.msg(ownId, 'Guided-Tour Extension', noLicenseMsg('Mouse-over'), null, 'OK');
                    } else {
                        const hoverModeSwitch = $(`#${ownId}_hovermode`).is(':checked');
                        if (hoverModeSwitch == true) {
                            // switch to "on"
                            tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal)
                                .then(function (hcube) {
                                    gtourGlobal.tooltipsCache[ownId] = hcube;
                                    gtourGlobal.tooltipsCache[ownId].forEach((tooltipDef, tooltipNo) => {
                                        const divId = tooltipDef[0].qText;
                                        $('[tid="' + divId + '"]').on('mouseover', function (elem) {
                                            // console.log(tooltipNo, tooltipDef[1].qText);
                                            if ($('#' + ownId + '_tooltip').length == 0) {  // tooltip is not yet open
                                                tooltip.play2(ownId, layout, tooltipNo, false, enigma, gtourGlobal, currSheet);
                                            }
                                        });
                                        $('[tid="' + divId + '"]').on('mouseout', function (elem) {
                                            // console.log(tooltipNo, 'Closing');
                                            $('#' + ownId + '_tooltip').remove();
                                        });
                                    });
                                    gtourGlobal.activeTooltip[currSheet][ownId] = -1; // set tour to "armed" 
                                })
                                .catch(function () { });

                        } else {
                            // switch to "off", unbind the events;
                            gtourGlobal.tooltipsCache[ownId].forEach((tooltipDef, tooltipNo) => {
                                const divId = tooltipDef[0].qText;
                                $('[tid="' + divId + '"]').unbind('mouseover');
                                $('[tid="' + divId + '"]').unbind('mouseout');
                            });
                            gtourGlobal.activeTooltip[currSheet][ownId] = -2;
                        }
                    }
                })
                
                //---------------------------------------------------
            } */
            else if (tourJson.mode == 'auto-always') {
                //---------------------------------------------------
                // Auto-lauch always ... plays entire tour automatically once per session

                if (mode == 'analysis' && !gtourGlobal.visitedTours[ownId] && !getActiveTour(ownId, currSheet, layout)) {
                    gtourGlobal.visitedTours[ownId] = true;  // remember for this session, that the tour has been started once
                    tooltip.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                }

                // on click, tour will be restarted.
                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        gtourGlobal.visitedTours[ownId] = true;
                        tooltip.play(gtourGlobal, ownId, layout, 0, false, enigma, currSheet);
                    }
                })
                //---------------------------------------------------
            } /*
            else if (tourJson.mode == 'auto-once') {
                //---------------------------------------------------
                // Auto-lauch once ... plays entire tour automatically and remember per user
                // find out if it is the time to auto-start the tour
                if (mode == 'analysis' && !getActiveTour(ownId, currSheet, layout)) {
                    enigma.evaluate("=TimeStamp(Now(),'YYYYMMDDhhmmss')").then(function (serverTime) {
                        var lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                        if (serverTime >= layout.pRelaunchAfter
                            && layout.pRelaunchAfter > lStorageValue.openedAt) {
                            if (licensed) {
                                tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal)
                                    .then(function (hcube) {
                                        gtourGlobal.tooltipsCache[ownId] = hcube;
                                        tooltip.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet);
                                        lStorageValue.openedAt = serverTime + ''; // save as string
                                        window.localStorage.setItem(lStorageKey, JSON.stringify(lStorageValue));
                                        if (layout.pConsoleLog) console.log(ownId, 'Stored locally: ', JSON.stringify(lStorageValue));
                                    });

                            } else {
                                if (layout.pConsoleLog) console.log(ownId, 'auto-once suppressed because no license');
                                if (!gtourGlobal.noLicenseWarning[ownId]) {
                                    leonardo.msg(ownId, 'Guided-Tour Extension', noLicenseMsg('Auto-launch Once'), null, 'OK');
                                }
                                gtourGlobal.noLicenseWarning[ownId] = true;
                            }
                            //gtourGlobal.visitedTours[ownId] = true;
                        } else {
                            if (layout.pConsoleLog) console.log(ownId, 'user already launched this tour.');
                        }
                    })
                } else {
                    if (layout.pConsoleLog) console.log(ownId, 'auto-once suppressed because ' + (mode != 'analysis' ? (mode + '-mode') : 'other tour active'));
                }
                // on click, tour will be restarted.
                $(`#${ownId}_start`).click(function () {
                    if (!getActiveTour(ownId, currSheet, layout)) {
                        tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal)
                            .then(function (hcube) {
                                gtourGlobal.tooltipsCache[ownId] = hcube;
                                tooltip.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet);
                                enigma.evaluate("=TimeStamp(Now(),'YYYYMMDDhhmmss')").then(function (serverTime) {
                                    const lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                                    lStorageValue.openedAt = serverTime + ''; // save as string
                                    window.localStorage.setItem(lStorageKey, JSON.stringify(lStorageValue));
                                    if (layout.pConsoleLog) console.log(ownId, 'Stored locally: ', JSON.stringify(lStorageValue));
                                })
                                //gtourGlobal.visitedTours[ownId] = true;
                            })
                            .catch(function () { });
                    }
                })
                //---------------------------------------------------
            } else if (tourJson.mode == 'auto-once-p-obj') {
                //---------------------------------------------------
                // find out if auto-start of a tooltip is needed
                if (mode == 'analysis' && !getActiveTour(ownId, currSheet, layout)) {
                    if (licensed) {
                        const lStorageValue = JSON.parse(window.localStorage.getItem(lStorageKey) || lStorageDefault);
                        // function (ownId, enigma, backendApi, objFieldName, tourFieldName, tourFieldVal, timestampFieldName, lStorageVal)
                        // console.log(ownId, 'starting in mode auto-once-p-obj', layout.pTimestampFromDim, lStorageValue)
                        tooltip.cacheHypercube(ownId, enigma, objFieldName, layout.pTourField, layout.pTourSelectVal
                            , layout.pTimestampFromDim, lStorageValue)
                            .then(function (hcube) {
                                gtourGlobal.tooltipsCache[ownId] = hcube;
                                if (gtourGlobal.tooltipsCache[ownId].length > 0) {
                                    tooltip.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet, lStorageKey, lStorageValue);
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
                            gtourGlobal.tooltipsCache[ownId] = hcube;
                            tooltip.play2(ownId, layout, 0, false, enigma, gtourGlobal, currSheet);
                        })
                        .catch(function () { });
                }
            })
            */
        }

    }

})