// props.js: Extension properties (accordeon menu) externalized

define(["qlik", "jquery", "./tooltip", "./store", "./paint",
    "../editor/scripts/leonardo-msg", "text!../editor-div.html"], function
    (qlik, $, tooltip, store, paint, leonardo, htmlEditor) {

    // const storageProvider = 1; // 1.. Qlik Sense for Windows, app-attached content

    const origin = '*'; // origin for postMessage into iframe, where Tour Editor is loaded

    return {
        editTour: async function (arg, gtourGlobal) {
            // console.log(arg);
            const ownId = arg.qInfo.qId;
            const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel;
            var editorUrl = arg.pEditorUrl == 'other' ? arg.pEditorCustom : arg.pEditorUrl;
            const editorLocations = {
                "custom": arg.pEditorCustom,
                "christofschwarz.github.io": `https://christofschwarz.github.io/${arg.extensionMeta.qextVersion}/editor.html`,
                "qs-i-dev.databridge.ch": `https://qs-i-dev.databridge.ch/anonym/extensions/db-ext-gtour-editor/${arg.extensionMeta.qextVersion}/editor.html`
            }
            editorUrl = editorLocations[editorUrl] || editorUrl;

            if (arg.pConsoleLog) {
                console.log('pick-n-edit.js: editTour()', arg);
                console.log('editorUrl:', editorUrl);
            }

            const origWidth = $('.qv-panel-properties').width();
            $('.qv-panel-properties').css('max-width', origWidth + 'px');
            $('.qv-panel-properties').animate(  // animate the editor to 
                { "max-width": `480px` }
                , 'fast', 'swing'
            );
            $('.property-content').hide();
            var justUnhide = false;
            if ($('.gtour-editor').length > 0) {
                if ($('.gtour-editor').attr('tour') == arg.pTourName) {
                    justUnhide = true;  // this tour is already in Editor
                } else {
                    $('.gtour-editor').remove();
                }
            }

            if (justUnhide) {
                // if the editor has been opened before, unhide it
                $('.gtour-editor').show();

                $('.gtour-editor iframe').css(
                    'height',
                    ($('.gtour-editor').height() - $('.gtour-editor .pp-section-header').height()) + 'px'
                );

            } else {

                // editor hasn't been opened before, add it to DOM

                $('.property-content').parent().append(
                    `<div class="property-content  gtour-editor" style="z-index:21;" tour="${arg.pTourName}"> 
                    ${htmlEditor}
                </div>`);

                // define source of iframe
                $('#gtour-editor-iframe').attr('src',
                    (gtourGlobal.isQlikCloud ? editorUrl : "../extensions/ext_guided_tour_2/editor/editor.html")
                    + '?log=' + arg.pConsoleLog);

                window.onmessage = async function (event) {
                    console.log('Parent got message', event.data);

                    if (event.data.msg == 'editorReady') {

                        const tourJson = await store.loadTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, app.id, false, arg.pConsoleLog);
                        event.source.window.postMessage({
                            msg: 'putToDOM',
                            tourJson: tourJson,
                            tour: arg.pTourName,
                            pStorageProvider: arg.pStorageProvider,
                            app: app.id,
                            log: arg.pConsoleLog
                        }, origin)

                    } else if (event.data.msg == 'saveAndClose') {

                        removePickers();
                        $('#' + ownId + '_tooltip_quit').click(); // if a tooltip is open, close it

                        await store.saveTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, event.data.tourJson, app.id);
                        gtourGlobal.cache[ownId] = event.data.tourJson;
                        closeEditor(origWidth, false);
                        $('.gtour-editor button').prop('disabled', false);

                    } else if (event.data.msg == 'autoSave') {

                        await store.saveTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, event.data.tourJson, app.id);

                    } else if (event.data.msg == 'closePreview') {

                        $('#' + ownId + '_tooltip_quit').click(); // if a tooltip is open, close it
                        // $('#' + ownId + '_tooltip').remove(); // if another tooltip is open, close it

                    } else if (event.data.msg == 'previewTooltip') {


                        const tourJson = event.data.tourJson;
                        const currFormulas = tooltip.getKeysWithFormulas(tourJson)
                        const selector = event.data.selector;
                        const activeTab = event.data.activeTab;

                        removePickers();
                        // $('#' + ownId + '_tooltip_quit').click(); // if a tooltip is open, close it

                        // build a partial copy of the gtourGlobal object with only the current tour.
                        var mimikGlobal = {
                            cache: JSON.parse(`{"${ownId}":${JSON.stringify(tourJson)}}`),
                            formulas: JSON.parse(`{"${ownId}":${JSON.stringify(currFormulas)}}`),
                            isSingleMode: false,
                            licensedObjs: JSON.parse(`{"${ownId}":true}`),
                            activeTooltip: JSON.parse(`{"${currSheet}":{"${ownId}":-2}}`)
                        };
                        mimikGlobal.cache[ownId].mode = 'click'; // simple sequential mode
                        mimikGlobal.cache[ownId].opacity = 1;  // no fading of other objects

                        if (activeTab != 1) {
                            // activeTab is not "Tour", play only one tooltip (not the entire series). 
                            // keep only the currently edited tooltip in mimikGlobal.cache[...].tooltips
                            var keepTooltipNo;
                            for (var i = 0; i < mimikGlobal.cache[ownId].tooltips.length; i++) {
                                if (mimikGlobal.cache[ownId].tooltips[i].selector == selector) keepTooltipNo = i;
                            }
                            mimikGlobal.cache[ownId].tooltips = [mimikGlobal.cache[ownId].tooltips[keepTooltipNo]];
                            mimikGlobal.formulas[ownId].tooltips = [mimikGlobal.formulas[ownId].tooltips[keepTooltipNo]];
                            mimikGlobal.cache[ownId] = await tooltip.resolveQlikFormulas2(mimikGlobal.formulas[ownId]);
                        }

                        if ((activeTab != 1 && selector) || activeTab == 1) {

                            console.warn('preview play');
                            // if selector is filled show this one tooltip, or if on tab 1 show entire tour
                            tooltip.play(JSON.parse(JSON.stringify(mimikGlobal)), ownId, arg, 0, null, enigma, currSheet
                                , undefined, undefined, true);  // true = preview, dont perform actions 
                        }
                        // repaint the button, too
                        enigma.getObject(ownId).then(obj => {
                            obj.getLayout().then(layout => {
                                console.log('gtour-preview-tooltip repainting, layout', layout);
                                paint.paint(layout, tourJson, gtourGlobal);
                            })
                        })

                    } else if (event.data.msg == 'startPicker') {

                        $('#' + ownId + '_tooltip_quit').click(); // if a tooltip is open, close it
                        pick(arg); //, event.data.activeTab);

                    } else if (event.data.msg == 'quitPicker') {
                        $('.gtour-picker').remove();
                        $('.gtour-picker-container').remove();

                    } else if (event.data.msg == 'showAsTable') {
                        console.log(event.data.tourJson);

                        const qlikify = function (value, key) {

                            if (typeof value == 'boolean') {
                                return `Dual('${value}',${value ? 0 : 1}) AS [${key}]`;
                            } else if (value == null || (typeof value == 'number' && isNaN(value))) {
                                return `null() AS [${key}]`;
                            } else if (typeof value == 'number') {
                                return `${value} AS [${key}]`;
                            } else if (typeof value == 'string') {
                                return `'${value.split("$(").join("$'&'(")}' AS [${key}]`;
                            } else {
                                return `// ${value} AS [${key}]`
                            }
                        }

                        var text = ["[$tours]:", "LOAD", `  '${arg.pTourName}' AS %tourName`];

                        for (const key in event.data.tourJson) {
                            if (key != 'tooltips') {
                                text.push('  ,' + qlikify(event.data.tourJson[key], 'tour.' + key));
                            }
                        }
                        text.push('AUTOGENERATE(1);');
                        text.push('');
                        text.push('[$tooltips]:');
                        var tooltipId = 0;
                        for (const tooltip of event.data.tourJson.tooltips) {
                            text.push(tooltipId > 0 ? 'CONCATENATE LOAD' : 'LOAD');
                            text.push(`  '${arg.pTourName}' AS %tourName`);
                            text.push(`  ,${tooltipId} AS %tooltipId`);
                            for (const key2 in tooltip) {
                                text.push('  ,' + qlikify(tooltip[key2], 'tooltip.' + key2));
                            }
                            text.push('AUTOGENERATE(1);');
                            text.push('');
                            tooltipId++;
                        }
                        console.log(text.join('\n'));

                        leonardo.msg(
                            ownId,
                            'Copy this load script',
                            '<textarea style="width:98%;height:400px;border-width:0;">' + text.join('\n') + '</textarea>',
                            null, 'OK'
                        );

                    }

                }

                // wait for iframe to be loaded
                // while ($editor('#addTab').attr('class')) {
                //     await delay(25);
                // }
                setTimeout(function () {
                    $('#gtour-editor-loader').fadeOut('slow');
                }, 1000);

                // set height of iframe
                $('.gtour-editor iframe').css(
                    'height', ($('.gtour-editor').height() - $('.gtour-editor .pp-section-header').height()) + 'px'
                );

                /*
                //  Pick Object handle click
                $('.gtour-start-picker').click(function () {

                    $('#' + ownId + '_quit').click(); // if a tooltip is open, close it
                    pick(arg);
                });
                */

                //  [Save + Close Editor] Button handle click
                $('.gtour-close-editor').click(async function () {

                    $('#' + ownId + '_quit').click(); // if preview-tooltip is open, close it

                    // disable the mousedown capture of the editor, back to normal Qlik Sense Editor behaviour
                    $('.qvt-sheet-container').off('mousedown');

                    // disable the action buttons 
                    $('.gtour-editor button').prop('disabled', true);

                    //const tourJson = store.createTourJson($('#gtour-editor-iframe').contents());

                    document.getElementById('gtour-editor-iframe').contentWindow.postMessage({
                        msg: 'getTourJson',
                        nextMsg: 'saveAndClose'
                    }, origin);

                    // await store.saveTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, tourJson, app.id);
                    // gtourGlobal.cache[ownId] = tourJson;
                    // closeEditor(origWidth, false);
                    // $('.gtour-editor button').prop('disabled', false);
                });

                $('.gtour-preview-tooltip').click(async function () {

                    //const activeTab = $editor('.ui-tabs-active').attr('id');

                    document.getElementById('gtour-editor-iframe').contentWindow.postMessage({
                        msg: 'getTourJson',
                        nextMsg: 'previewTooltip'
                    }, origin);

                });

                $('#gtour-as-table').click(async function () {
                    document.getElementById('gtour-editor-iframe').contentWindow.postMessage({
                        msg: 'getTourJson',
                        nextMsg: 'showAsTable'
                    }, origin);

                    // const objDef = {
                    //     qInfo: { qType: 'gtour' },
                    //     def: { qStringExpression: '=OSUser()' },
                    //     ghi: { qValueExpression: '=Pi()' },
                    //     tooltip: [
                    //         { a: 1, b: 2 },
                    //         { a: 1, b: 2 }
                    //     ],
                    //     blabla: "yes"
                    // };
                    // enigma.createSessionObject(objDef).then(obj => {
                    //     obj.getLayout().then(layout => {
                    //         console.log('sessionobj', layout);
                    //         enigma.destroySessionObject(layout.qInfo.qId)
                    //     })
                    // })
                })
            }

            // Disable clicks in Qlik Sense Worksheet:
            $('.qvt-sheet-container').on('mousedown', function (event) {
                //$('.gtour-close-editor').css('background-color', 'yellow');
                // blink with the close button 2x
                $('.gtour-close-editor').animate({ 'background-color': 'yellow' }, 300, function () {
                    $('.gtour-close-editor').animate({ 'background-color': 'rgba(0,0,0,0)' }, 300, function () {
                        $('.gtour-close-editor').animate({ 'background-color': 'yellow' }, 300, function () {
                            $('.gtour-close-editor').animate({ 'background-color': 'rgba(0,0,0,0)' }, 300, function () {
                            })
                        })
                    })
                })
                event.stopPropagation();
            })



            $('.gtour-expandable-list-header').click(function () {
                // console.log('header', elem.target);
                if ($(this).hasClass('expanded')) {
                    // close the setion
                    $(this).removeClass('expanded');
                    $(this).find('.toggle-expand').removeClass('lui-icon--triangle-bottom').addClass('lui-icon--triangle-right')
                    // $(this).next('.gtour-expandable-list-content').css('height', '0px');
                    $(this).next('.gtour-expandable-list-content').animate({ 'height': '0px' });
                } else {
                    // open the section
                    $(this).addClass('expanded');
                    $(this).find('.toggle-expand').removeClass('lui-icon--triangle-right').addClass('lui-icon--triangle-bottom')
                    // $(this).next('.gtour-expandable-list-content').css('height', '400px');
                    const neededHeight = $(this).next('.gtour-expandable-list-content').attr('needed-height');
                    $(this).next('.gtour-expandable-list-content').animate({ 'height': neededHeight + 'px' });
                }

            })


        }
    }


    function closeEditor(origWidth, removeFromDOM) {
        $('.property-content').show();
        if (removeFromDOM) {
            $('.gtour-editor').remove();
        } else {
            $('.gtour-editor').hide();
        }
        // animate the width getting narrower until origWidth
        $('.qv-panel-properties').animate(
            { "max-width": origWidth + 'px' }
            , 'fast', 'swing'
            // remove "max-width" property again after animation is finished 
            , function () { $('.qv-panel-properties').css('max-width', ''); }
        );
    }


    function divPICK(classes = 'gtour-picker', label = 'PICK') {
        // renders the PICK div
        return `<div class="${classes}">
                ${label}
            </div>`;
    }

    function bypassQlikClick() {
        // prevent that during selection of the object Qlik would select the object in Edit Mode,
        // which would take away the focus from the accordion menu 
        $('body.qv-client.qv-sheet-enabled.qv-view-sheet.qv-card').on('mousedown', function (event) {
            event.stopPropagation();
        })
    }

    function enableQlikClick() {
        $('body.qv-client.qv-sheet-enabled.qv-view-sheet.qv-card').off('mousedown');
    }

    function removePickers() {
        $(".gtour-picker").remove(); // remove previous pickers
        $(".gtour-picker-container").remove();
    }

    function pick(arg) {
        const ownId = arg.qInfo.qId;
        // const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
        bypassQlikClick();
        removePickers();


        $(".cell")
            .not(`[tid="${arg.qInfo.qId}"]`)
            .find(".qv-inner-object")
            .each(function (i) {
                // add divs overlaying every Sense object
                $(this).prepend(divPICK('gtour-picker', 'PICK'));
            });

        // if an element inside a container was selected above (now has a PICK div), remove it again
        $(".cell .qv-object-container .gtour-picker").each(function () {
            if (!this.parentElement.parentElement.classList.contains('qv-object-container')) {
                $(this).remove();
            }
        });

        // special care of container objects, add picker per tab (li-tag)
        $(".cell .qv-object-container li")
            .prepend(divPICK("gtour-picker-container", 'PICK'));

        function choseObj(objId, tidOrCss) {

            console.log(ownId, "Picked object Id " + objId);
            removePickers();

            document.getElementById('gtour-editor-iframe').contentWindow.postMessage({
                msg: 'pasteSelector',
                selector: objId
            }, origin);
            // const activeTab = $editor('.ui-tabs-active').attr('id');
            // $editor('#tab-' + activeTab + '-accordion [key="selector"]').val(objId);
            $('.gtour-preview-tooltip').click(); // auto-preview the tooltip
        }


        // if user clicked on a PICK div in a container tab
        $(".gtour-picker-container").click(function (me) {

            const myParentAttr =
                me.currentTarget.parentElement.attributes["data-itemid"];
            const selector = `[data-itemid="${myParentAttr.value}"]`;

            if (myParentAttr) {
                choseObj(selector, "css");
                enableQlikClick();
            }
        });

        $(".gtour-picker").click(function (me) {

            console.log('arg', arg);

            var parent = me.currentTarget;
            // go up the parents tree until the level where the class contains 'cell' or 'grouped-container-flex-item'
            // ... maybe could be replaced with jquery's .closest() function 
            var i = 0;
            while ((!parent.classList.contains("cell"))
                && (!parent.classList.contains("grouped-container-flex-item"))
                && i < 6
            ) {
                i++;
                parent = parent.parentElement;
            }

            if (parent.classList.contains("cell")
                && parent.attributes.hasOwnProperty("tid")
            ) {
                const objId = parent.attributes["tid"].value;
                choseObj(objId, "tid");
                enableQlikClick();
            } else if (parent.classList.contains("grouped-container-flex-item")) {
                const objId = '#' + parent.id;
                choseObj(objId, "css");
            } else {
                console.error(
                    "Object Id not found while going " + i + " parent levels up",
                    parent
                );
            }
        });
    }
});
