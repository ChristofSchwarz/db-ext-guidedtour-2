define(["qlik", "jquery", "text!./styles.css", "./js/props", "./js/paint",
    "./js/tooltip", "./js/license", "./js/store"], function
    (qlik, $, cssContent, props, paint, tooltipJs, license, store) {

    'use strict';

    var gtourGlobal = {
        qext: {}, // extension meta-information
        hashmap: license.hashmap(location.hostname, 'db_ext_guided_tour'), // hash map for the license check
        activeTooltip: {},  // remember all active tours, contains later one entry per extension and the 
        // an integer shows the active tooltip (0..n) or -2 if tour is inactive, -1 (in hover-mode) if armed
        visitedTours: {},  // all extension-ids which will be started, are added to this object
        licensedObjs: {}, // list of all extension-ids which have a license
        //tooltipsCache: {}, // the qHypercube result of each tour will be put here under the key of the objectId when started 
        cache: {}, // the qHypercube result of each tour will be put here under the key of the objectId when started 
        formulas: {},  // structure like in cache, but every key that needs to be evaluated by Qlik is put into a subobject {qStringExpression:"..."} 
        noLicenseWarning: {}, // in order not to suppress repeating license warnings, every extension id is added here once the warning was shown
        isOEMed: null,
        isQlikCloud: location.href.indexOf('.qlikcloud.com/') > -1,
        imageBaseUrl: location.href.indexOf('.qlikcloud.com/') > -1 ? // array of 2 strings, url part before app-id and url part after app-id
            ["/api/v1/apps/", "/media/files/"]
            : ['../appcontent/', '/']
    }


    $("<style>").html(cssContent).appendTo("head");
    // $("<style>").html(cssSnow).appendTo("head");  // theme for Quill editor


    $.ajax({
        url: '../extensions/ext_guided_tour_2/ext_guided_tour_2.qext',
        dataType: 'json',
        async: false,  // wait for this call to finish.
        success: function (data) { gtourGlobal.qext = data; }
    });


    return {
        initialProperties: {
            showTitles: false,
            disableNavMenu: true,
            qHyperCubeDef: {
                qMeasures: [{
                    qDef: { qDef: '=GetCurrentSelections()' }
                }]
            }
        },

        definition: {
            type: "items",
            component: "accordion",
            items: [
                {
                    uses: "measures",
                    min: 1,
                    max: 6
                }, {
                    uses: "settings"
                }, {
                    label: 'Editor & Settings',
                    type: 'items',
                    items: props.presentation(gtourGlobal)
                }, {
                    label: 'License',
                    type: 'items',
                    items: props.licensing(gtourGlobal)
                }, {
                    label: 'About this extension',
                    type: 'items',
                    items: props.about(gtourGlobal.qext)
                }
            ]
        },
        snapshot: {
            canTakeSnapshot: false
        },

        resize: function ($element, layout) {

            const ownId = layout.qInfo.qId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel
            //const licensed = gtourGlobal.licensedObjs[ownId];
            const mode = qlik.navigation.getMode();

            // if (mode != 'edit') $('.gtour-picker').remove();
            if (layout.pConsoleLog) console.log(ownId, 'resize', layout, gtourGlobal);

            $('.gtour-tooltip-parent').each(function (i) {
                if ($(this).css('display') != 'none') {
                    // a visible tooltip is open.
                    tooltipJs.repositionCurrToolip(this, gtourGlobal);
                    // const openTooltipId = $(this).attr('id');
                    // const openTooltipNo = $(this).attr('tooltip-no');
                    // const reference = atob($(this).attr('reference'));
                    // const bgColor = $(this).css('background-color');
                    // const tooltipDef = gtourGlobal.cache[ownId].tooltips[openTooltipNo - 1];
                    // const rootContainer = gtourGlobal.isSingleMode ? '#qv-stage-container' : '#qv-page-container';

                    // tooltipJs.findPositions(reference, rootContainer, '#' + openTooltipId,
                    //     gtourGlobal.cache[ownId].arrowHead, bgColor, tooltipDef.orientation
                    // );

                    // console.log('open tooltip is ', openTooltipId, openTooltipNo);
                }
            });

            return qlik.Promise.resolve();
        },

        paint: async function ($element, layout) {

            const ownId = layout.qInfo.qId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel;

            gtourGlobal.isSingleMode = document.location.href.split('?')[0].split('/').indexOf('single') > -1;
            if (layout.pConsoleLog) console.log(ownId, 'paint', layout, gtourGlobal);
            /*
                        if ($(`#${ownId}_tooltip[tooltip-no="2"]`).length) {
                            // Check for auto-click on Next button due to condition
                            enigma.evaluate('GetSelectedCount(CaseID)').then(function (res) {
                                console.log('gtourglobal', res, gtourGlobal);
                                if (res != 0) {
                                    $(`#${ownId}_next`).trigger('click');
                                }
                            })
                        };*/
            if (!layout.pTourName) {
                $element.html('<div class="gtour-center-middle">'
                    + '<span class="lui-icon  lui-icon--info"></span>&nbsp;'
                    + 'No tour assigned to this element.<br>Set it in the properties panel.</div>');

            } else {

                const tourJson = await store.loadTour(gtourGlobal, layout.pTourName, layout.pStorageProvider,
                    app.id, true, layout.pConsoleLog);
                gtourGlobal.formulas[ownId] = tooltipJs.getKeysWithFormulas(tourJson);
                gtourGlobal.cache[ownId] = await tooltipJs.resolveQlikFormulas2(gtourGlobal.formulas[ownId]);

                // gtourGlobal.cache[ownId] = tourJson;

                paint.paint(layout, gtourGlobal.cache[ownId], gtourGlobal);
            }
            if (gtourGlobal.isOEMed == null) {
                license.isOEM(enigma,
                    'WyJDYXNlTGVhZFRpbWUiLCJQcm9jZXNzUGF0aFVuaXF1ZU5vIiwiVW5pcXVlU29ydGVkUm93Tm8iLCJQcm9j'
                    + 'ZXNzUGF0aCIsIkFjdGl2aXR5VHlwZUlEIiwiUHJvY2Vzc1N0ZXBGb2xsb3dVcElkbGVUaW1lIl0='
                ).then(function (res) {
                    gtourGlobal.isOEMed = res
                });
            }
            return qlik.Promise.resolve();
        }
    }

})
