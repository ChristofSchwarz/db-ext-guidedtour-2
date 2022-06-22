// props.js: Extension properties (accordeon menu) externalized

define(["qlik", "jquery", "./tooltip", "./store", "./paint", "text!../editor-div.html"], function
    (qlik, $, tooltip, store, paint, htmlEditor) {

    // const storageProvider = 1; // 1.. Qlik Sense for Windows, app-attached content

    const origin = '*'; // origin for postMessage into iframe, where Tour Editor is loaded

    return {
        editTour: async function (arg, gtourGlobal) {
            // console.log(arg);
            const ownId = arg.qInfo.qId;
            const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            const app = qlik.currApp(this);
            const enigma = app.model.enigmaModel;
            const editorUrl = arg.pEditorUrl == 'custom' ? arg.pEditorCustom : arg.pEditorUrl;

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

            if (arg.pConsoleLog) console.log('pick-n-edit.js: editTour()', arg);

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

                        await store.saveTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, event.data.tourJson, app.id);
                        gtourGlobal.cache[ownId] = event.data.tourJson;
                        closeEditor(origWidth, false);
                        $('.gtour-editor button').prop('disabled', false);

                    } else if (event.data.msg == 'autoSave') {

                        await store.saveTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, event.data.tourJson, app.id);

                    } else if (event.data.msg == 'closePreview') {

                        $('#' + ownId + '_tooltip').remove(); // if another tooltip is open, close it

                    } else if (event.data.msg == 'previewTooltip') {


                        const tourJson = event.data.tourJson;
                        const selector = event.data.selector;
                        const activeTab = event.data.activeTab;

                        //const selector = $editor('#tab-' + activeTab + '-accordion [key="selector"]').val();
                        // const html = $editor('#tab-' + activeTab + '-accordion .ql-editor').html();
                        $('#' + ownId + '_tooltip').remove(); // if another tooltip is open, close it


                        var mimikGlobal = {
                            cache: JSON.parse(`{"${ownId}":${JSON.stringify(tourJson)}}`),
                            isSingleMode: false,
                            licensedObjs: JSON.parse(`{"${ownId}":true}`),
                            activeTooltip: JSON.parse(`{"${currSheet}":{"${ownId}":-2}}`)
                        };
                        mimikGlobal.cache[ownId] = await tooltip.resolveQlikFormulas(mimikGlobal.cache[ownId]);
                        mimikGlobal.cache[ownId].mode = 'click'; // simple sequential mode
                        mimikGlobal.cache[ownId].opacity = 1;  // no fading of other objects

                        if (activeTab != 1) {
                            // activeTab is not "Tour", play only one tooltip (not the entire series). Remove the rest from array
                            mimikGlobal.cache[ownId].tooltips = mimikGlobal.cache[ownId].tooltips.filter(function (elem) {
                                return elem.selector == selector
                            });
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

                        $('#' + ownId + '_quit').click(); // if a tooltip is open, close it
                        pick(arg); //, event.data.activeTab);
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

                    // const tourJson = store.createTourJson($('#gtour-editor-iframe').contents());

                    // const selector = $editor('#tab-' + activeTab + '-accordion [key="selector"]').val();
                    // // const html = $editor('#tab-' + activeTab + '-accordion .ql-editor').html();
                    // $('#' + ownId + '_tooltip').remove(); // if another tooltip is open, close it


                    // var mimikGlobal = {
                    //     cache: JSON.parse(`{"${ownId}":${JSON.stringify(tourJson)}}`),
                    //     isSingleMode: false,
                    //     licensedObjs: JSON.parse(`{"${ownId}":true}`),
                    //     activeTooltip: JSON.parse(`{"${currSheet}":{"${ownId}":-2}}`)
                    // };
                    // mimikGlobal.cache[ownId] = await tooltip.resolveQlikFormulas(mimikGlobal.cache[ownId]);
                    // mimikGlobal.cache[ownId].mode = 'click'; // simple sequential mode

                    // if (activeTab != 1) {
                    //     // activeTab is not "Tour", play only one tooltip (not the entire series). Remove the rest from array
                    //     mimikGlobal.cache[ownId].tooltips = mimikGlobal.cache[ownId].tooltips.filter(function (elem) {
                    //         return elem.selector == selector
                    //     });
                    // }
                    // if ((activeTab != 1 && selector) || activeTab == 1) {

                    //     console.warn('preview play');
                    //     // if selector is filled show this one tooltip, or if on tab 1 show entire tour
                    //     tooltip.play(JSON.parse(JSON.stringify(mimikGlobal)), ownId, arg, 0, null, enigma, currSheet
                    //         , undefined, undefined, true);  // true = preview, dont perform actions 
                    // }
                    // // repaint the button, too
                    // enigma.getObject(ownId).then(obj => {
                    //     obj.getLayout().then(layout => {
                    //         console.log('gtour-preview-tooltip repainting, layout', layout);
                    //         paint.paint(layout, tourJson, gtourGlobal);
                    //     })
                    // })
                });
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

    /*
    function $editor(selector) {
        // function that wraps the iframe editor for jquery methods
        return $('#gtour-editor-iframe').contents().find(selector);
    }*/

    function divPICK(classes, label) {
        return `<div 
            style="position:absolute; z-index:100; background-color:#079B4A; 
            cursor:pointer; color:white; border-radius: 10px; padding: 0 10px;height: 20px; line-height:20px;" 
            class="${classes}">
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

    function pick(arg) {
        const ownId = arg.qInfo.qId;
        // const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
        bypassQlikClick();

        $(".gtour-picker").remove(); // remove previous divs

        $(".cell")
            .not(`[tid="${arg.qInfo.qId}"]`)
            .find(".qv-inner-object")
            .each(function (i) {
                // add divs overlaying every Sense object
                console.log(
                    i,
                    this.parentElement
                );
                // if the element is a container, skip it
                if (
                    this.parentElement.attributes["tid"] &&
                    this.parentElement.attributes["tid"].value != "qv-object-container"
                ) {
                    $(this)
                        .prepend(divPICK('gtour-picker', 'PICK'));
                }
            });

        // if an element inside a container was selected above (now has a PICK div), remove it again
        $(".cell .qv-object-container .gtour-picker").remove();

        // special care of container objects, add picker per tab (li-tag)
        $(".cell .qv-object-container li")
            .prepend(divPICK("gtour-picker-container", 'PICK'));

        function choseObj(objId, tidOrCss) {

            console.log(ownId, "Picked object Id " + objId);
            $(".gtour-picker").remove();
            $(".gtour-picker-container").remove();

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
