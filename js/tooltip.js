// tooltip.js: function play externalized 

define(["qlik", "jquery" /*, "./license"*/], function (qlik, $ /*, license*/) {

    /*
    // below fields are calculated as qlik formula, if their content starts with an "="
    // from tour object
    const resolveTourFields = [
        'btnLabelNext', 'btnLabelDone', 'fieldWithText'
    ];
    // from tooltip subobject within tour
    const resolveTooltipFields = [
        'action1_value', 'action2_value', 'action3_value',
        'action1_field', 'action2_field', 'action3_field'
    ];
    */

    return {

        // ---------------------------------------------------------------------------------------------------
        play: function (gtourGlobal, ownId, layout, tooltipNo, reset, enigma,
            currSheet, lStorageKey, lStorageVal, previewMode, multiTooltips) {
            play(gtourGlobal, ownId, layout, tooltipNo, reset, enigma,
                currSheet, lStorageKey, lStorageVal, previewMode, multiTooltips)
        },

        // ---------------------------------------------------------------------------------------------------
        resolveQlikFormulas2: async function (formulas) {
            const ret = await resolveQlikFormulas2(formulas);
            return ret;
        },

        getKeysWithFormulas: function (tourJson) {

            // returns an object that has the same structure as tourJson but puts anything 
            // that contains a qlik formula into a {qStringExpression: '...'} subobject, so
            // that qlik can evaluate it later

            var copyJson = JSON.parse(JSON.stringify(tourJson));

            for (const tourField in copyJson) {
                if (tourField != 'tooltips') {
                    if ((`${copyJson[tourField]}`).substr(0, 1) == '=') {
                        copyJson[tourField] = { qStringExpression: copyJson[tourField] };
                    }
                } else {
                    // crawl tooltips array
                    for (const tooltip of copyJson.tooltips) {
                        for (const tooltipField in tooltip) {
                            if (tooltipField == 'html') {
                                if (tooltip.html.indexOf('$(') > -1) {
                                    tooltip.html = {
                                        qStringExpression: "='" + tooltip.html
                                            .replace(/\'/g, "'&Chr(39)&'")
                                            .replace(/&lt;/g, '<')
                                            .replace(/&gt;/g, '>')
                                            + "'"
                                    }
                                }
                            } else {
                                if ((`${tooltip[tooltipField]}`).substr(0, 1) == '=') {
                                    tooltip[tooltipField] = { qStringExpression: tooltip[tooltipField] };
                                }
                            }
                        }
                    }
                }
            }

            // console.log('getKeysWithFormulas result');
            // console.log(JSON.stringify(copyJson));

            return copyJson;
        },

        findPositions: function (selector, rootContainer, tooltipSel, arrowHeadSize, bgColor, prefOrient) {
            return findPositions(selector, rootContainer, tooltipSel, arrowHeadSize, bgColor, prefOrient)
        },

        repositionCurrToolip: function (jQueryObj, gtourGlobal) {

            // the current tooltip object (referred to in jQueryObj) is being repositioned using 
            // findPositions function. This function wraps findPositions so that only the jQuery Selector
            // and gtourGlobal is needed and all other params to call findPositions are found in here.

            const openTooltipId = $(jQueryObj).attr('id');
            const ownId = openTooltipId.split('_')[0];
            const openTooltipNo = $(jQueryObj).attr('tooltip-no');
            const reference = atob($(jQueryObj).attr('reference'));
            const bgColor = $(jQueryObj).css('background-color');
            const tooltipDef = gtourGlobal.cache[ownId].tooltips[openTooltipNo - 1];
            const rootContainer = gtourGlobal.isSingleMode ? '#qv-stage-container' : '#qv-page-container';

            findPositions(reference, rootContainer, '#' + openTooltipId,
                gtourGlobal.cache[ownId].arrowHead, bgColor, tooltipDef.orientation
            );

            //console.log('open tooltip is ', openTooltipId, openTooltipNo);
        }
    }

    // ---------------------------------------------------------------------------------------------------
    async function play(gtourGlobal, ownId, layout, tooltipNo, reset, enigma, currSheet
        , lStorageKey, lStorageVal, previewMode = false, multiTooltips = false) {


        /*
            multiTooltips (default false): set to true in hover-mode, it will assume that
                multiple tooltips exist in DOM model at the same time (maybe one visible at a time)
        */
        // var tourJson = gtourGlobal.cache[ownId];
        // await resolveQlikFormulas(tourJson, gtourGlobal.formulas[ownId], tooltipNo);
        var tourJson = await resolveQlikFormulas2(gtourGlobal.formulas[ownId]);
        const tooltipJson = tourJson.tooltips[tooltipNo];
        const arrowHeadSize = tourJson.arrowHead || 16;
        const rootContainer = gtourGlobal.isSingleMode ? '#qv-stage-container' : '#qv-page-container';
        const finallyScrollTo = '#sheet-title';
        const opacity = tourJson.mode == 'hover' ? 1 : (tourJson.opacity || 1);
        const licensed = gtourGlobal.isOEMed ? true : gtourGlobal.licensedObjs[ownId];
        const isLast = tooltipNo >= (tourJson.tooltips.length - 1);
        const tooltipDOMid = ownId + '_tooltip' + (multiTooltips ? (tooltipNo + 1) : '');

        if (layout.pConsoleLog) console.log(`${ownId} Play tour (previewMode ${previewMode}, tooltip ${tooltipNo}, isLast ${isLast}, licensed ${licensed}, lStorageKey ${lStorageKey})`);

        if (reset) {  // end of tour

            function quitTour(fadeSpeed) {
                // unfade all cells, remove the current tooltip and reset the tours counter
                removeFading();
                removeHighlighting(tourJson.tooltips[isLast ? (tooltipNo - 1) : tooltipNo]);
                $(`#${tooltipDOMid}`).fadeTo(fadeSpeed, 0, () => { $(`#${tooltipDOMid}`).remove() });
                gtourGlobal.activeTooltip[currSheet][ownId] = -2;
                //gtourGlobal.cache[ownId] = null;
                // stop rotating the play icon
                $(`#${ownId}_play`).removeClass('lui-icon--reload').addClass('lui-icon--play').removeClass('gtour-rotate');
            }

            if (isLast) {
                if (!licensed) {
                    // after the last item of a tour, show databridge ad for a second
                    $(`#${tooltipDOMid}`).children().css('opacity', 0);
                    $(`#${tooltipDOMid}_text`)
                        .after(`<div style="position:absolute; top:35%; color:${$('#' + tooltipDOMid + '_next').css('color')}; width:100%; left:-3px; text-align:center; font-size:medium;">
                        Tour sponsored by <a href="https://www.databridge.ch" target="_blank" style="color:${$('#' + tooltipDOMid + '_next').css('color')};">data/\\bridge</a>
                        </div>`);
                }
                function delay(time) {
                    return new Promise(resolve => setTimeout(resolve, time));
                }

                try {
                    if (!isScrolledIntoView(finallyScrollTo)) {
                        document.querySelector(finallyScrollTo).scrollIntoView({ behavior: "smooth" });  // scroll to the top
                    }
                }
                catch (err) { }
                delay(licensed ? 1 : 1000).then(() => quitTour('slow'));

            } else {
                quitTour('fast');
            }
            $(document).unbind('keydown'); // stop key listener

        } else {
            // increase the tours counter and highlight next object
            // rotate the play icon
            $(`#${ownId}_play`).removeClass('lui-icon--play').addClass('lui-icon--reload').addClass('gtour-rotate');

            const prevTooltipNo = gtourGlobal.activeTooltip[currSheet][ownId];
            const prevElem = tourJson.tooltips[prevTooltipNo] ? tourJson.tooltips[prevTooltipNo] : null;
            gtourGlobal.activeTooltip[currSheet][ownId] = tooltipNo;
            const currElem = tourJson.tooltips[tooltipNo] ? tourJson.tooltips[tooltipNo] : null;
            const nextElem = tourJson.tooltips[tooltipNo + 1] ? tourJson.tooltips[tooltipNo + 1] : null;

            if (prevElem && !multiTooltips) {
                $(`#${tooltipDOMid}`).remove();
            }
            if (currElem) {
                setTimeout(function () {


                    // for better readability of code put some tooltipJson into variables
                    var qObjId = currElem.selector;
                    var html = currElem.html;
                    const vizId = html.split(' ').length == 1 ? html : null; // instead of html text it could be an object id of a chart to be rendered

                    var tooltipStyle = `width:${currElem.width || tourJson.width}px;`
                        + `color:${currElem.fontcolor || tourJson.fontcolor};`
                        + `background-color:${currElem.bgcolor || tourJson.bgcolor};`;

                    var fontColor;
                    var bgColor;
                    var orientation = currElem.orientation;
                    var knownObjId;
                    // var chart;

                    // 5 selectors are set by function "setAllSelectors" in currElem: 
                    // pointToSelector, highlightSelector, fadeOutSelector, highlightSelector2, fadeOutSelector2 

                    setAllSelectors(qObjId, currElem, gtourGlobal, layout);

                    knownObjId = $(currElem.pointToSelector).length;

                    function renderTooltip() {
                        // if action has to be done prior to showing the tooltip, now it's the time

                        if (!previewMode && licensed && tooltipJson.action1_use && tooltipJson.action1_timing == 'before') {
                            doAction(tooltipJson.action1_type, tooltipJson.action1_field, tooltipJson.action1_var
                                , tooltipJson.action1_value, tooltipJson.action1_sheet, currElem.pointToSelector)
                        }
                        if (!previewMode && licensed && tooltipJson.action2_use && tooltipJson.action2_timing == 'before') {
                            doAction(tooltipJson.action2_type, tooltipJson.action2_field, tooltipJson.action2_var
                                , tooltipJson.action2_value, tooltipJson.action2_sheet, currElem.pointToSelector)
                        }
                        if (!previewMode && licensed && tooltipJson.action3_use && tooltipJson.action3_timing == 'before') {
                            doAction(tooltipJson.action3_type, tooltipJson.action3_field, tooltipJson.action3_var
                                , tooltipJson.action3_value, tooltipJson.action3_sheet, currElem.pointToSelector)
                        }

                        // give the DOM some moments for the object to appear (relevant with action goto-sheet)

                        waitForElement(currElem.pointToSelector, undefined, previewMode ? 1 : undefined)
                            .then(function (res) {

                                knownObjId = $(currElem.pointToSelector).length;

                                if (opacity < 1 && tourJson.tooltips[tooltipNo - 1] && tourJson.tooltips[tooltipNo - 1].fadeOutSelector2
                                    && tourJson.tooltips[tooltipNo - 1].fadeOutSelector != tourJson.tooltips[tooltipNo].fadeOutSelector) {
                                    // if previous tooltip had fadedOutSelector2 (grouped-container) unfade those objects
                                    $(tourJson.tooltips[tooltipNo - 1].fadeOutSelector2).css('opacity', 1)
                                }

                                if (knownObjId == 0) {
                                    // target object does not exist, place object in the middle
                                    if (opacity < 1) {
                                        $('.cell')
                                            .fadeTo('fast', opacity, () => { })
                                            .addClass('gtour-faded');
                                    }

                                } else {
                                    // fade the other objects
                                    if (opacity < 1) {
                                        $(currElem.fadeOutSelector)
                                            .fadeTo('fast', opacity, () => { })
                                            .addClass('gtour-faded');
                                    }
                                    // unfade the target object
                                    if (opacity < 1 && currElem.highlightSelector) {
                                        $(currElem.highlightSelector)
                                            .fadeTo('fast', 1, () => { });
                                    }
                                    // fade the other objects (2)
                                    if (opacity < 1 && currElem.fadeOutSelector2) {
                                        $(currElem.fadeOutSelector2)
                                            .fadeTo('fast', opacity, () => { })
                                            .addClass('gtour-faded');
                                    }
                                    // unfade the target object (2)
                                    if (opacity < 1 && currElem.highlightSelector2) {
                                        $(currElem.highlightSelector2)
                                            .fadeTo('fast', 1, () => { });
                                    }

                                    if (tooltipJson.highlight && tooltipJson.otherSelector
                                        && tooltipJson.highlightattr && tooltipJson.highlightvalue) {
                                        $(tooltipJson.otherSelector)
                                            .css(tooltipJson.highlightattr, tooltipJson.highlightvalue)
                                            .addClass('gtour-highlighted');
                                    }

                                    // save the time this object was rendered if in auto-once mode
                                    // if (tourJson.mode == 'auto-once-p-obj' && lStorageKey && lStorageVal) {
                                    //     enigma.evaluate("Timestamp(Now(),'YYYYMMDDhhmmss')") // get server time
                                    //         .then(function (serverTime) {
                                    //             lStorageVal.objectsOpened[qObjId] = serverTime;
                                    //             window.localStorage.setItem(lStorageKey, JSON.stringify(lStorageVal));
                                    //             if (layout.pConsoleLog) console.log(ownId, 'Stored locally ', lStorageKey, JSON.stringify(lStorageVal));
                                    //         });
                                    // }

                                }

                                // try to avoid several tooltips in DOM
                                $('.gtour-tooltip-parent').remove();

                                // add the tooltip div
                                $(rootContainer).append(`
                                <div class="lui-tooltip  gtour-tooltip-parent"
                                    id="${tooltipDOMid}" 
                                    tooltip-no="${tooltipNo + 1}" 
                                    reference="${btoa(currElem.pointToSelector)}"
                                    style="${tooltipStyle};display:none;position:absolute;">
                                    <!--${currElem.pointToSelector}-->
                                    <span style="opacity:0.6;${multiTooltips ? 'display:none;' : ''}">${tooltipNo + 1}/${tourJson.tooltips.length}</span>
                                    <span class="lui-icon  lui-icon--close" id="${tooltipDOMid}_quit" style="float:right;cursor:pointer;display:${tooltipJson.noClose ? 'none' : 'block'};${tourJson.mode == 'hover' ? 'opacity:0;' : ''}"></span>
                                    ${knownObjId == 0 ? '<br/><div class="gtour-err">Object <strong>' + qObjId + '</strong> not found!</div>' : '<br/>'}
                                    ${knownObjId > 1 ? '<br/><div class="gtour-err"><strong>' + qObjId + '</strong> selects ' + knownObjId + ' objects!</div>' : '<br/>'}
                                    <div id="${tooltipDOMid}_text" class="gtour-text" style="font-size:${tourJson.fontsize}">
                                        ${vizId ? '<!--placeholder for chart-->' : html}
                                    </div>
                                    <a class="lui-button  gtour-next" 
                                    style="${tourJson.mode == 'hover' ? 'opacity:0;' : ''}border-color:${tourJson.bordercolor};${(tooltipJson.hideNextButton && knownObjId > 0) ? 'display:none;' : ''}" 
                                    id="${tooltipDOMid}_next">${isLast ? tourJson.btnLabelDone : tourJson.btnLabelNext}</a>
                                    <div class="lui-tooltip__arrow"></div>
                                </div>`);

                                if ($('.gtour-tooltip-parent').length > 1) {
                                    console.error(`Now there are ${$('.gtour-tooltip-parent').length} tooltips in DOM.`);
                                }
                                // replace <pre> tags with <span> and put included text as html
                                // Background: Quill text editor has the option to add a code block and this is put inside <pre> </pre> tags.
                                // Here we unwrap the code and interpret it as HTML
                                try {
                                    const preTags = document.querySelectorAll(`#${tooltipDOMid}_text pre`);
                                    preTags.forEach(function (preTag) {
                                        var span = document.createElement('span');
                                        span.innerHTML = preTag.innerText;
                                        preTag.parentNode.replaceChild(span, preTag);
                                    });
                                } catch (error) { }

                                if (vizId) {
                                    const app = qlik.currApp();
                                    $(`#${tooltipDOMid}_text`).css('height', ($(`#${tooltipDOMid}`).height() - 90) + 'px');
                                    // https://help.qlik.com/en-US/sense-developer/June2020/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/VisualizationAPI/get-method.htm
                                    app.visualization.get(vizId).then(function (viz) {
                                        viz.show(tooltipDOMid + '_text');
                                    }).catch(function (err3) {
                                        console.error(err3);
                                        $(`#${tooltipDOMid}_text`).html('Error getting object ' + vizId + ':' + JSON.stringify(err3))
                                    })
                                }


                                // get the current colors, because the attribute-dimension can overrule the first color and background-color style setting
                                fontColor = $(`#${tooltipDOMid}`).css('color');
                                bgColor = $(`#${tooltipDOMid}`).css('background-color');
                                $(`#${tooltipDOMid}_next`).css('color', fontColor); // set the a-tag button's font color

                                // register click trigger for "X" (quit) and Next/Done button
                                $(`#${tooltipDOMid}_quit`).click(function () {
                                    play(gtourGlobal, ownId, layout, tooltipNo, true, enigma,
                                        currSheet, lStorageKey, lStorageVal)
                                });

                                $(`#${tooltipDOMid}_next`).click(async function () {

                                    // if an on-close action is set, now it's the time to execute it
                                    if (!previewMode && licensed && tooltipJson.action1_use && tooltipJson.action1_timing == 'after') {
                                        doAction(tooltipJson.action1_type, tooltipJson.action1_field, tooltipJson.action1_var
                                            , tooltipJson.action1_value, tooltipJson.action1_sheet, currElem.pointToSelector)
                                    }
                                    if (!previewMode && licensed && tooltipJson.action2_use && tooltipJson.action2_timing == 'after') {
                                        doAction(tooltipJson.action2_type, tooltipJson.action2_field, tooltipJson.action2_var
                                            , tooltipJson.action2_value, tooltipJson.action2_sheet, currElem.pointToSelector)
                                    }
                                    if (!previewMode && licensed && tooltipJson.action3_use && tooltipJson.action3_timing == 'after') {
                                        doAction(tooltipJson.action3_type, tooltipJson.action3_field, tooltipJson.action3_var
                                            , tooltipJson.action3_value, tooltipJson.action3_sheet, currElem.pointToSelector)
                                    }
                                    removeHighlighting(tooltipJson);
                                    if (nextElem && nextElem.delaybefore) removeFading();

                                    play(gtourGlobal, ownId, layout, tooltipNo + 1, isLast, enigma,
                                        currSheet, lStorageKey, lStorageVal, previewMode, multiTooltips)

                                });

                                // handle Esc and Return key
                                $(document).keydown(function (e) {
                                    const key = e.keyCode || e.which;
                                    if (key == 13 && $(`#${tooltipDOMid}_next`).css('display') == 'block') {
                                        // Return key pressed and Next button is visible
                                        $(`#${tooltipDOMid}_next`).click();
                                    }
                                    if (key == 27 && $(`#${tooltipDOMid}_quit`).css('display') == 'block') {
                                        // Return key pressed and Next button is visible
                                        $(`#${tooltipDOMid}_quit`).click();
                                    }
                                })

                                const calcPositions = findPositions(currElem.pointToSelector, rootContainer, `#${tooltipDOMid}`, arrowHeadSize, bgColor, orientation);

                                // $(`#${tooltipDOMid}`)
                                //     .css('left', calcPositions.left).css('right', calcPositions.right)  // left or right
                                //     .css('top', calcPositions.top).css('bottom', calcPositions.bottom)  // top or bottom
                                //     .attr('orient', calcPositions.orient);
                                // // remove possible previous arrow-heads
                                // $(`#${tooltipDOMid} .gtour-arrowhead`).remove();
                                // // render new arrow-head
                                // if (calcPositions.arrow) $(`#${tooltipDOMid} .lui-tooltip__arrow`).after(calcPositions.arrow);  // arrowhead

                                if (!multiTooltips) {
                                    $(`#${tooltipDOMid}`).show();
                                }
                            })
                    }

                    if (knownObjId) {   // hmm, knownObjId is undefined at this point. test scrollintoview
                        if (!isScrolledIntoView(currElem.pointToSelector)) {
                            document.querySelector(currElem.pointToSelector).scrollIntoView({ behavior: "smooth" }); // scroll to the element
                            var interval;
                            interval = setInterval(function () {
                                if (isScrolledIntoView(currElem.pointToSelector)) {
                                    clearInterval(interval);
                                    renderTooltip();
                                }
                            }, 200);
                        } else {
                            renderTooltip();
                        }
                    } else {
                        renderTooltip();
                    }
                }, (tooltipJson.delaybefore && !previewMode) ? (tooltipJson.delaybefore * 1000) : 1);
            }
        }
    }  // end of function play

    // ---------------------------------------------------------------------------------------------------
    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();

        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    // ---------------------------------------------------------------------------------------------------
    function isQlikObjId(selector) {
        // returns true if the selector is a Qlik Object Id or false if it is a DOM selector (CSS)
        return selector.indexOf('#') == -1 && selector.indexOf('.') == -1 && selector.indexOf('=') == -1
            && selector.indexOf(' ') == -1;

    }

    // ---------------------------------------------------------------------------------------------------
    function setAllSelectors(qObjId, currElem, gtourGlobal, layout) {

        // 5 selectors are defined by "setAllSelectors" function and set as object keys in currElem: 
        // pointToSelector is the DOM object that will define the position of the tooltip
        // highlightSelector is the DOM object that will be highlighted (the only object not faded)
        // fadeOutSelector are the DOM objects that will be faded
        // highlightSelector2 is the child DOM object (in grouped-container) that will be highlighted (the only object not faded)
        // fadeOutSelector2 are the child DOM objects (in grouped-container) that will be faded

        if (isQlikObjId(qObjId)) {
            // qlik object id format
            selectorFormat = 'qlik-object';
            if (gtourGlobal.isSingleMode) {
                selectorFormat += ' (single-mode)';
                currElem.pointToSelector = `[data-qid="${qObjId}"]`;
                currElem.fadeOutSelector = `.qvt-sheet [data-qid]:not(${currElem.pointToSelector})`;
            } else {
                currElem.pointToSelector = `[tid="${qObjId}"]`;
                currElem.fadeOutSelector = `.cell:not(${currElem.pointToSelector})`;
            }
            currElem.highlightSelector = currElem.pointToSelector;
            currElem.highlightSelector2 = null;
            currElem.fadeOutSelector2 = null;
            // knownObjId = $(currElem.pointToSelector).length;

        } else if (qObjId.indexOf('[data-itemid=') > -1) {
            // the object is part of a Qlik Tabbed Container (standard element)
            selectorFormat = 'qlik-container';
            currElem.pointToSelector = qObjId;
            if (gtourGlobal.isSingleMode) {
                selectorFormat += ' (single-mode)';
                currElem.highlightSelector = `[data-qid="${$(currElem.pointToSelector).closest('[data-qid]').attr('data-qid')}"]`;
                currElem.fadeOutSelector = `.qvt-sheet [data-qid]:not(${currElem.highlightSelector})`;
            } else {
                currElem.highlightSelector = `[tid="${$(currElem.pointToSelector).closest('.cell').attr('tid')}"]`;
                currElem.fadeOutSelector = `.cell:not(${currElem.highlightSelector})`;
            }
            currElem.highlightSelector2 = null;
            currElem.fadeOutSelector2 = null;
            // knownObjId = $(currElem.pointToSelector).length;
            $(currElem.pointToSelector).trigger('click'); // click on the tab in the container

        } else if ($('#grid-wrap').find(qObjId).length == 0) {
            // css selector outside the sheet grid
            selectorFormat = 'css-outside-grid';
            currElem.pointToSelector = qObjId;
            currElem.highlightSelector = null;
            currElem.fadeOutSelector = '.cell';
            currElem.highlightSelector2 = null;
            currElem.fadeOutSelector2 = null;
            // knownObjId = $(currElem.pointToSelector).length;

        } else if ($(qObjId).attr('class').indexOf('grouped-container-') > -1) {
            // css selector inside a grouped container (extension by Dennis Jaskowiak)
            selectorFormat = 'grouped-container-cell'
            currElem.pointToSelector = qObjId;
            if (gtourGlobal.isSingleMode) {
                currElem.highlightSelector = `[data-qid="${$(currElem.pointToSelector).closest('[data-qid]').attr('data-qid')}"]`;
                currElem.fadeOutSelector = `.qvt-sheet [data-qid]:not(${currElem.highlightSelector})`;
            } else {
                currElem.highlightSelector = `[tid="${$(currElem.pointToSelector).closest('.cell').attr('tid')}"]`;
                currElem.fadeOutSelector = `.cell:not(${currElem.highlightSelector})`;
            }
            // if it is a grouped-container in a grouped-container, no 2nd highlighting
            if ($(qObjId).closest('.grouped-container-main').parent().closest('.grouped-container-main').length) {
                currElem.highlightSelector2 = null;
                currElem.fadeOutSelector2 = null;
            } else {
                currElem.highlightSelector2 = qObjId;
                currElem.fadeOutSelector2 = `.grouped-container-main [id^="${(qObjId).substr(1, (qObjId).length - 2)}"]:not(${qObjId})`;
            }
        } else {
            // css selector inside the sheet grid, not a special known object
            selectorFormat = 'css-on-grid';
            currElem.pointToSelector = qObjId;
            currElem.highlightSelector = '[tid="' + $(currElem.pointToSelector).closest('.cell').attr('tid') + '"]';  // find the parent with class "cell"
            currElem.fadeOutSelector = '.cell:not(' + currElem.highlightSelector + ')';
            currElem.highlightSelector2 = null;
            currElem.fadeOutSelector2 = null;
        }

        if (layout.pConsoleLog) {
            console.log('function setAllSelectors');
            console.log(`selectorFormat ${selectorFormat}, pointToSelector ${currElem.pointToSelector}`);
            console.log(`highlightSelector ${currElem.highlightSelector}, fadeOutSelector ${currElem.fadeOutSelector}`);
            console.log(`highlightSelector2 ${currElem.highlightSelector2}, fadeOutSelector2 ${currElem.fadeOutSelector2}`);
        }
    }

    // ---------------------------------------------------------------------------------------------------
    function findPositions(selector, rootContainer, tooltipSel, arrowHeadSize = 16, bgColor, prefOrient) {

        // analyses and finds the best position for the given tooltip.

        //const arrowHeadSize = layout.pArrowHead || 16;
        var leftOrRight = ['', 0];
        var topOrBottom = ['', 0];
        var arrowDiv = '';
        var orientation;
        const knownObjId = $(selector).length > 0;
        const screen = {
            width: $(rootContainer).width(),
            height: $(rootContainer).height()
        }

        // from the rendered tooltip the browser knows the height and width
        var tooltip = {
            width: $(tooltipSel).width(),
            height: $(tooltipSel).height(),
            left: '',
            right: '',
            top: '',
            bottom: ''
        }

        if (!knownObjId) {
            // css-selector of object doesn't exist in DOM, render the tooltip in the middle with no arrow
            tooltip.left = screen.width / 3 - tooltip.width / 2;
            tooltip.top = screen.height / 2 - tooltip.height / 2;

        } else {

            var target = $(selector).offset(); // this already sets target.left and target.top 
            target.height = $(selector).height();
            target.width = $(selector).width();
            target.right = screen.width - (target.left + target.width);  // pixels space between right edge of target and right edge of screen
            target.bottom = screen.height - (target.top + target.height); // pixels space between bottom edge of target and bottom of screen


            var pointTo;

            if (!prefOrient || prefOrient == 'h') {  // horizontal positioning (left or right) preferred

                // decide between Left or Right positioning, depending where there is more free space left.
                // if not enough free space to the left or right, then try "tb" (top or bottom)
                orientation = target.right > target.left ?
                    (target.right > tooltip.width ? 'r' : 'tb')
                    : (target.left > tooltip.width ? 'l' : 'tb');

                // if it is top or bottom orientation, decide depending on where there is more space left 
                if (orientation == 'tb') {
                    orientation = target.top > target.bottom ? 't' : 'b';
                }
            } else {  // vertical (top or bottom) positioning preferred
                // decide between top or bottom positioning, depending where there is more free space left.
                // if not enough free space to the left or right, then try "rl" (right or left)
                orientation = target.top > target.bottom ?
                    (target.top > tooltip.height ? 't' : 'rl')
                    : (target.bottom > tooltip.height ? 'b' : 'rl');

                // if it is right or left orientation, decide depending on where there is more space left 
                if (orientation == 'rl') {
                    orientation = target.right > target.left ? 'r' : 'l';
                }
            }

            if (orientation == 'l') {  // arrow will be to the right
                pointTo = { top: target.top + target.height / 2, left: target.left };
                tooltip.width += arrowHeadSize;
                tooltip.right = target.right + target.width + arrowHeadSize;
                tooltip.top = Math.min(Math.max(pointTo.top - tooltip.height / 2, 0), screen.height - tooltip.height - 10); // fix if bottom edge of tooltip would be below screen
                tooltip.arrow = `<div class="gtour-arrowhead"
                        style="border-color: rgba(0,0,0,0) rgba(0,0,0,0) rgba(0,0,0,0) ${bgColor}; border-style:solid; 
                        border-width:${arrowHeadSize}px; position:absolute; right:${-2 * arrowHeadSize}px; top:${pointTo.top - tooltip.top - arrowHeadSize}px">
                    </div>`;
            }

            if (orientation == 'r') { // arrow will be to the left
                pointTo = { top: target.top + target.height / 2, left: target.left + target.width };
                tooltip.width += arrowHeadSize;
                tooltip.left = Math.min(target.left + target.width + arrowHeadSize, screen.width - tooltip.width - 15);
                tooltip.top = Math.min(Math.max(pointTo.top - tooltip.height / 2, 0), screen.height - tooltip.height - 10);
                tooltip.arrow = `<div class="gtour-arrowhead"
                        style="border-color: rgba(0,0,0,0) ${bgColor} rgba(0,0,0,0) rgba(0,0,0,0); border-style:solid; 
                        border-width:${arrowHeadSize}px; position:absolute; left:${-2 * arrowHeadSize}px; top:${pointTo.top - tooltip.top - arrowHeadSize}px">
                    </div>`;
            }

            if (orientation == 't' || orientation == 't!') {  // arrow will be at the buttom
                pointTo = { top: target.top, left: target.left + target.width / 2 };
                tooltip.height += arrowHeadSize;
                tooltip.top = Math.max(target.top - tooltip.height - arrowHeadSize, 0);
                tooltip.left = Math.min(Math.max(pointTo.left - tooltip.width / 2, 0), screen.width - tooltip.width - 15);
                tooltip.arrow = `<div class="gtour-arrowhead"
                       style="border-color: ${bgColor} rgba(0,0,0,0) rgba(0,0,0,0) rgba(0,0,0,0); border-style:solid; 
                       border-width:${arrowHeadSize}px; position:absolute; left:${pointTo.left - tooltip.left - arrowHeadSize}px; bottom:${-2 * arrowHeadSize}px;">
                    </div>`;
            }

            if (orientation == 'b' || orientation == 'b!') {  // arrow will be at the top
                pointTo = { top: target.top + target.height, left: target.left + target.width / 2 };
                tooltip.height += arrowHeadSize;
                tooltip.left = Math.min(Math.max(pointTo.left - tooltip.width / 2, 0), screen.width - tooltip.width - 15);
                tooltip.bottom = Math.max(target.bottom - tooltip.height - arrowHeadSize, 0);
                tooltip.arrow = `<div class="gtour-arrowhead"
                        style="border-color: rgba(0,0,0,0) rgba(0,0,0,0) ${bgColor} rgba(0,0,0,0); border-style:solid; 
                        border-width:${arrowHeadSize}px; position:absolute; left:${pointTo.left - tooltip.left - arrowHeadSize}px; top:${-2 * arrowHeadSize}px;">
                    </div>`;
            }
        }

        // $('#kulimuk').remove();
        // if (pointTo) $('#qv-page-container').append(`<div id="kulimuk" style="position:absolute;width:3px;height:3px;left:${pointTo.left}px;top:${pointTo.top}px;background-color:red;z-index:200;"></div>`);

        if (tooltip.left) tooltip.left += 'px';
        if (tooltip.right) tooltip.right += 'px';
        if (tooltip.top) tooltip.top += 'px';
        if (tooltip.bottom) tooltip.bottom += 'px';
        tooltip.orient = orientation;

        // console.log('orientation', orientation, tooltip);
        // apply positions
        $(tooltipSel)
            .css('left', tooltip.left).css('right', tooltip.right)  // left or right
            .css('top', tooltip.top).css('bottom', tooltip.bottom)  // top or bottom
            .attr('orient', tooltip.orient);
        // remove possible previous arrow-heads
        $(`${tooltipSel} .gtour-arrowhead`).remove();
        // render new arrow-head
        if (tooltip.arrow) $(`${tooltipSel} .lui-tooltip__arrow`).after(tooltip.arrow);  // arrowhead

        return tooltip;
    }

    // ---------------------------------------------------------------------------------------------------
    function doAction(actionType, field, variable, value, sheet, selector) {

        const app = qlik.currApp();
        // const enigma = app.model.enigmaModel;
        console.warn('Action ' + actionType);
        try {
            if (actionType == 'select') {
                // https://help.qlik.com/en-US/sense-developer/February2022/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/FieldAPI/selectMatch-method.htm
                app.field(field).selectMatch(value, true);
                return true

            } else if (actionType == 'clear') {
                // https://help.qlik.com/en-US/sense-developer/February2022/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/FieldAPI/clear-method.htm
                app.field(field).clear();
                return true

            } else if (actionType == 'clear-all') {
                // https://help.qlik.com/en-US/sense-developer/February2022/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/FieldAPI/clear-method.htm
                app.clearAll();
                return true

            } else if (actionType == 'variable') {
                if (isNaN(value)) {
                    app.variable.setStringValue(variable, value)
                } else {
                    app.variable.setNumValue(variable, parseFloat(value))
                }
                return true

            } else if (actionType == 'goto-sheet') {
                if (sheet.toLowerCase() == 'next') {
                    qlik.navigation.nextSheet();
                } else if (sheet.toLowerCase().substr(0, 4) == 'prev') {
                    qlik.navigation.prevSheet();
                } else {
                    qlik.navigation.gotoSheet(sheet);
                }
                return true

            } else {
                console.error('Guided Tour doesnt know such action: ' + actionType);
                return false
            }
        } catch (err) {
            console.error('action ' + actionType + ' had an error:', err);
            return false
        }
    }

    // ---------------------------------------------------------------------------------------------------
    function waitForElement(selector, delay = 50, tries = 20) {

        // function resolves as a Promise when the DOM element "selector" is present.
        // it will retry every <delay> millisecs until the DOM element is available
        // or max <tries> retries is reached. 

        // The return is a resolve with null when the element still wasn't in DOM, or the
        // element itself when it is.

        //console.warn('waitForElement x times:', tries);f

        const element = selector.substr(0, 1) == '#' ?
            document.querySelector(`[id="${selector.substr(1)}"]`)  // .querySelector fails with special chars in id, for example on #9e2531ea-9b89-4da6-bdd4-ddb4fa473c6d6
            : document.querySelector(selector);


        if (!window[`__${selector}`]) {
            window[`__${selector}`] = 0;
        }

        function _search() {
            return new Promise((resolve) => {
                window[`__${selector}`]++;
                console.log(window[`__${selector}`]);
                setTimeout(resolve, delay);
            });
        }

        if (element === null) {
            if (window[`__${selector}`] >= tries) {
                window[`__${selector}`] = 0;
                // return Promise.reject(null);
                return Promise.resolve(null);
            }

            return _search().then(() => waitForElement(selector, delay, tries));
        } else {
            return Promise.resolve(element);
        }
    }

    // ---------------------------------------------------------------------------------------------------
    async function resolveQlikFormulas2(formulas) {

        // if in some specific keys of tourJson a Qlik Formula is used (defined in the formulas object) 
        // evaluate those so they get resolved, then set the result in tourJson.

        const app = qlik.currApp();
        const enigma = app.model.enigmaModel;
        var objDef = JSON.parse(JSON.stringify(formulas));
        objDef.qInfo = { qType: 'gtour' }; // add mandatory key qInfo
        const obj = await enigma.createSessionObject(objDef);
        var layout = await obj.getLayout();
        enigma.destroySessionObject(layout.qInfo.qId);
        var tourJson = JSON.parse(JSON.stringify(layout));
        delete tourJson.qInfo
        if (tourJson.qMeta) delete tourJson.qMeta;
        if (tourJson.qSelectionInfo) delete tourJson.qSelectionInfo;
        // console.log('resolveQlikFormulas');
        // console.log(tourJson);
        return tourJson
    }

    // ---------------------------------------------------------------------------------------------------
    function removeHighlighting(tooltipJson) {
        // gets all DOM elements with class gtour-highlighted, if there was an attribute
        // set it will be removed, and the class itself will also be removed

        if (tooltipJson && tooltipJson.highlightattr) {
            $('.gtour-highlighted').css(tooltipJson.highlightattr, '');
        }
        $('.gtour-highlighted').removeClass('gtour-highlighted');
    }

    // ---------------------------------------------------------------------------------------------------
    function removeFading() {
        $('.gtour-faded').fadeTo('fast', 1, () => { }).removeClass('gtour-faded');
    }

})




