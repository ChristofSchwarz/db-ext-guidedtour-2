// props.js: Extension properties (accordeon menu) externalized

define(["qlik", "jquery", "../editor/scripts/leonardo-msg", "./license",
    "./pick-n-edit", "./store", "./tooltip", "text!./senseDemoTour.json"], function
    (qlik, $, leonardo, license, pickEdit, store, tooltip, senseDemoTour) {

    const ext = 'db_ext_guided_tour';

    // label definitions used in Extensions Accordion Menu
    const lbl = {
        helpButton: "Help with Guided Tour",
        actions: 'Actions Menu',
        newTooltip: 'Create or import a tour',
        editTooltip: 'Edit, export or delete a tour',
        // under Actions Menu "Edit"
        selectedTour: 'Selected Tour',
        editTourButton: 'Edit Tour',
        exportTourButton: 'Export Tour (.json)',
        deleteTourButton: 'Delete Tour',
        // under Actions Menu "Create"
        tourName: 'Tour name',
        createTourButton: "Create New Tour",
        importTourButton: 'Import Tour (.json)',
        createDemoButton: "Create Sense Demo Tour"
    };


    return {

        // --------------------------------------------------------------------------------

        editorAndSettings: function (gtourGlobal) {

            const app = qlik.currApp();
            // const enigma = app.model.enigmaModel;
            // const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            return {
                label: function (arg) {
                    // show exclamation mark (unicode) if Tour Name is empty
                    return 'Editor & Settings' + (arg.pTourName ? "" : " \u26a0\ufe0f")
                },
                type: 'items',
                items: [
                    {
                        label: "\u26a0\ufe0f The tour object has no tour assigned yet. "
                            + "Create a new tour below or select an existing tour from the 'Edit' menu.",
                        component: "text",
                        show: function (arg) { return arg.pTourName == '' && arg.pMode == 'new' }
                    }, {
                        label: "\u26a0\ufe0f The tour object has no tour assigned yet. "
                            + "Create select an existing tour below or create a new tour from the 'Create' menu.",
                        component: "text",
                        show: function (arg) { return arg.pTourName == '' && arg.pMode == 'edit' }
                    }, {
                        label: lbl.helpButton,
                        component: "button",
                        action: function (arg) { runHelpTour(arg, app) }
                    }, {
                        type: "string",
                        component: "buttongroup",
                        defaultValue: "new",
                        label: lbl.actions,
                        ref: "pMode",
                        options: [
                            { value: "edit", tooltip: lbl.editTooltip, label: 'Edit' },
                            { value: "new", tooltip: lbl.newTooltip, label: 'Create' },
                            //{ value: "expDel", tooltip: lbl.expDel, label: 'Exp/Del' }
                        ]
                    }, {
                        label: lbl.selectedTour, // 'Selected Tour'
                        type: 'string',
                        component: "dropdown",
                        ref: 'pTourName',
                        options: async function (arg) {
                            var fileList = await store.listTours(gtourGlobal, arg.pStorageProvider, app.id, arg.pConsoleLog);
                            return fileList.map(function (e) { return { value: e }; });
                        },
                        //show: function (arg) { return !arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'edit' } // || arg.pMode == 'expDel' }
                    }, {
                        label: lbl.editTourButton, // "Edit Tour",
                        component: "button",
                        action: function (arg) {
                            if (arg.pTourName) {
                                pickEdit.editTour(arg, gtourGlobal)
                            } else {
                                leonardo.msg('err', 'Error', 'First, choose a tour', null, 'Close');
                            }
                        },
                        //show: function (arg) { return arg.pTourName != '' && !arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'edit' }
                    }, {
                        label: lbl.exportTourButton,
                        component: "button",
                        action: function (arg) {
                            if (arg.pTourName) {
                                exportTour(arg, app, gtourGlobal);
                            } else {
                                leonardo.msg('err', 'Error', 'First, choose a tour', null, 'Close');
                            }
                        },
                        show: function (arg) { return arg.pMode == 'edit' }
                        //show: function (arg) { return arg.pMode == 'expDel' }
                    }, {
                        label: lbl.deleteTourButton,
                        component: "button",
                        action: function (arg) {
                            if (arg.pTourName) {
                                deleteTour(arg, app, gtourGlobal);
                            } else {
                                leonardo.msg('err', 'Error', 'First, choose a tour', null, 'Close');
                            }
                        },
                        show: function (arg) { return arg.pMode == 'edit' }
                        // show: function (arg) { return arg.pMode == 'expDel' }
                    }, {
                        label: lbl.tourName,
                        type: 'string',
                        ref: 'pNewTourName',
                        //show: function (arg) { return arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'new' }
                    }, {
                        label: lbl.createTourButton,
                        component: "button",
                        action: function (arg) { createTour(arg, app); },
                        //show: function (arg) { return arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'new' }
                    }, {
                        label: lbl.importTourButton,
                        component: "button",
                        action: function (arg) { importTour(arg, app) },
                        //show: function (arg) { return !arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'new' }
                    }, {
                        label: lbl.createDemoButton,
                        component: "button",
                        action: function (arg) { createDemoTour(arg, app, gtourGlobal); },
                        //show: function (arg) { return arg.pNewTourMode }
                        show: function (arg) { return arg.pMode == 'new' } // && arg.pTourName == '' }
                    }, subSection('Button Text & Color', [
                        {
                            label: 'Text for Tour Start',
                            type: 'string',
                            ref: 'pTextStart',
                            defaultValue: 'Start Tour',
                            expression: 'optional'
                        }, {
                            type: "boolean",
                            defaultValue: true,
                            ref: "pShowIcon",
                            label: "Show play icon",
                            // show: function (arg) { return arg.pLaunchMode != 'hover' }
                        }, {
                            label: 'Font-color of button',
                            type: 'string',
                            ref: 'pExtensionFontColor',
                            expression: 'optional',
                            defaultValue: '#333333'
                        }, {
                            label: 'Background-color of button',
                            type: 'string',
                            ref: 'pExtensionBgColor',
                            expression: 'optional',
                            defaultValue: 'white'
                        }, {
                            label: 'More styling',
                            type: 'string',
                            ref: 'pMoreStyles',
                            defaultValue: 'font-size:large;',
                            expression: 'optional'
                        }, {
                            label: "Use background",
                            component: "media",
                            ref: "pBgImage",
                            layoutRef: "pBgImage",
                            type: "string"
                        }, {
                            label: "Image Sizing",
                            type: "string",
                            component: "dropdown",
                            ref: "pBackgroundSize",
                            options: [
                                { label: "Original size", value: 'auto' },
                                { label: "Always fit", value: 'contain' },
                                { label: "Fit to width", value: '100%' },
                                { label: "Fit to height", value: 'auto 100%' },
                                { label: "Stretch to fit", value: '100% 100%' },
                            ],
                            show: function (arg) { return arg.pBgImage ? true : false }
                        }
                    ]), subSection('Advanced Settings', [
                        {
                            label: 'Storage Provder',
                            type: 'string',
                            ref: 'pStorageProvider',
                            component: 'dropdown',
                            defaultValue: '3',
                            options: function (arg) {
                                var opt = [];
                                opt.push({ value: "3", label: ".gif (auto: Qlik Cloud or Windows)" });
                                if (gtourGlobal.isQlikCloud) {
                                    opt.push({ value: "2", label: ".gif Attachment (Qlik Cloud)" });
                                } else {
                                    opt.push({ value: "1", label: ".txt Attachment (Qlik Sense Windows)" });
                                }
                                opt.push({ value: "4", label: "From data model (read-only)" });

                                // opt.push({ value: "9", label: "lbl.editTooltipernal (not available)" })
                                return opt
                            }
                        }, {
                            label: 'Tour Editor location (qlikcloud only)',
                            type: 'string',
                            component: 'dropdown',
                            ref: 'pEditorUrl',
                            options: [
                                // { value: "qs-i-dev.databridge.ch" },
                                { value: "christofschwarz.github.io" },
                                {
                                    value: "other", label: 'Other'
                                }
                            ],
                            defaultValue: "christofschwarz.github.io"
                        }, {
                            label: 'Tour Editor location',
                            type: 'string',
                            ref: 'pEditorCustom',
                            defaultValue: "https://qs-i-dev.databridge.ch/anonym/lbl.editTooltipensions/ext_guided_tour_2/editor/editor.html",
                            show: function (arg) { return arg.pEditorUrl == 'other' }
                        }, {
                            label: "Don't forget to set a CSP for 'frame-src' for above hostname in your Qlik Cloud Console Content Security Policy",
                            component: "text",
                            show: function (arg) { return location.href.indexOf('qlikcloud.com') > -1 }
                        }, {
                            type: "boolean",
                            defaultValue: false,
                            ref: "pConsoleLog",
                            label: "console.log debugging info"
                        } /*, {
                        label: 'Formula to trigger refresh of tour',
                        type: 'string',
                        ref: 'pRefreshTrigger',
                        defaultValue: '=GetCurrentSelections()',
                        expression: 'always'
                    }*/
                    ])
                ]
            }
        },

        // --------------------------------------------------------------------------------

        licensing: function (gtourGlobal) {
            const app = qlik.currApp();
            const enigma = app.model.enigmaModel;
            return {
                label: 'License',
                type: 'items',
                items: [
                    {
                        type: "string",
                        ref: "pLicenseJSON",
                        label: "License String",
                        component: "textarea",
                        rows: 5,
                        maxlength: 4000,
                        expression: 'optional'
                    }, {
                        label: "Contact data/\\bridge",
                        component: "link",
                        url: 'https://www.databridge.ch/contact-us'
                    }, {
                        label: 'Test response for this hostname',
                        type: 'string',
                        ref: 'pTestHostname'
                    }, {
                        label: "Check License",
                        component: "button",
                        action: function (arg) {

                            const ownId = arg.qInfo.qId;
                            resolveProperty(arg.pLicenseJSON, enigma)
                                .then(function (lstr) {
                                    const hostname = arg.pTestHostname ? (arg.pTestHostname.length > 0 ? arg.pTestHostname : location.hostname) : location.hostname;
                                    const report = license.chkLicenseJson(lstr, ext, hostname, true);
                                    leonardo.msg(ownId, 'Result', report, null, 'OK');
                                    $('#msgparent_' + ownId + ' th').css('text-align', 'left');
                                    // make window wider
                                    if (report.length > 200) $('#msgparent_' + ownId + ' .lui-dialog').css('width', '700px');
                                });
                        }
                    }, {
                        component: "text",
                        label: function () { return gtourGlobal.isOEMed ? 'Special OEM version' : 'Regular version' }
                    }
                ]
            }
        },

        // --------------------------------------------------------------------------------

        about: function (qext) {
            return {
                label: 'About this extension',
                type: 'items',
                items: [
                    {
                        label: function (arg) { return 'Extension version ' + qext.version },
                        component: "link",
                        url: '../extensions/ext_guided_tour_2/ext_guided_tour_2.qext'
                    }, {
                        label: 'Qlik Version',
                        component: 'button',
                        action: function (arg) {
                            const app = qlik.currApp();
                            const enigma = app.model.enigmaModel;
                            const ownId = arg.qInfo.qId;
                            enigma.global.engineVersion().then((v) => {
                                leonardo.msg(ownId, 'Engine Version', JSON.stringify(v), null, 'OK');
                            })
                        }
                    }, {
                        label: "This extension is available either licensed or free of charge by data/\\bridge. "
                            + "The licensed version has more features and does not show a data/\\bridge ad at the end of the tour.",
                        component: "text"
                    }, {
                        label: 'Report an issue/bug here',
                        component: 'link',
                        url: 'https://github.com/ChristofSchwarz/db-ext-guidedtour-2/issues'
                    }, {
                        label: "Only licensed customers get support.",
                        component: "text"
                    }, {
                        label: "",
                        component: "text"
                    }, {
                        label: "About data/\\bridge",
                        component: "link",
                        url: 'https://www.databridge.ch'
                    }, {
                        label: "More",
                        component: "button",
                        action: function (arg) {
                            console.log(arg);
                            window.open('https://insight.databridge.ch/items/guided-tour-extension', '_blank');
                        }
                    }
                ]
            }
        }
    }

    // ====================================================================================
    //                                 F u n c t i o n s
    // ====================================================================================

    function subSection(labelText, itemsArray, argKey, argVal) {
        var ret = {
            component: 'expandable-items',
            items: {}
        };
        var hash = 0;
        for (var j = 0; j < labelText.length; j++) {
            hash = ((hash << 5) - hash) + labelText.charCodeAt(j)
            hash |= 0;
        }
        ret.items[hash] = {
            label: labelText,
            type: 'items',
            show: function (arg) { return (argKey && argVal) ? (arg[argKey] == argVal) : true },
            items: itemsArray
        };
        return ret;
    }

    async function resolveProperty(prop, enigma) {
        // takes care of a property being either a constant or a expression, which needs to be evaluated
        var ret;
        if (prop.qStringExpression) {
            ret = await enigma.evaluate(prop.qStringExpression.qExpr);
            //console.log('was expression: ', ret);
        } else {
            //console.log(prop,' was constant');
            ret = prop;
        }
        return ret;
    }

    function createTour(arg, app, gtourGlobal) {

        if (arg.pNewTourName) {
            store.existsTour(arg.pNewTourName, arg.pStorageProvider, app.id, arg.pConsoleLog)
                .then(function (existsTour) {
                    //console.log('then', existsTour);
                    if (existsTour) {
                        leonardo.msg('collision', 'Warning',
                            `A tour with name <strong>${arg.pNewTourName}</strong> already exists.<br>`
                            + `<br>Use a different one or delete the existing.`,
                            null, 'Close');
                    } else {
                        // create new tour with default settings
                        store.saveTour(gtourGlobal, arg.pNewTourName, arg.pStorageProvider, undefined, app.id, arg.pConsoleLog)
                            .then(function () {

                                // close new tour fields by clicking on Edit
                                $(`.pp-buttongroup-component [title="${lbl.editTooltip}"]`).trigger('qv-activate')
                                // $(`[title="${lbl.StartNewTour}"]`).parent().parent().trigger('click');
                                // select the newly created tour 
                                waitForElement(`select [label="${arg.pNewTourName}"]`).then(function () {
                                    $(`[title="${lbl.selectedTour}"]`).parent().find(`select [label="${arg.pNewTourName}"]`).prop('selected', true);
                                    $(`[title="${lbl.selectedTour}"]`).parent().find('select').trigger('change');
                                });
                            })
                    }
                })
        } else {
            leonardo.msg('no_name', 'Error', `"${lbl.tourName}" must not be empty.`, null, 'Close');
        }
    }

    function runHelpTour(arg, app) {
        // figure out the tid of the elements in the accordeon menu
        var tids = {};
        const helpConfig = {
            actions: `<p>This is the mode selector for two groups of actions<p><ul>
                <li>Edit: Actions for existing tours: Edit, Export, Delete</li>
                <li>Create: Actions to create a tour: New, Import</li>
                </ul><p>If you switch here, <strong>press again</strong> on Help button to get help for the selected action group.`
            , selectedTour: 'If you already saved tours in this app, you can find them here and choose the one to start.'
            , editTourButton: `<p>Here you can edit the tour</p>
                <p>This will be the button you use the most while creating tour content.</p>`
            , exportTourButton: 'This exports the tour as a .json file'
            , deleteTourButton: 'Here you can remove an existing tour'
            , tourName: 'To create or import a new tour first enter the new name here, then press one of the buttons below.'
            , createTourButton: 'This button creates an empty new tour in this app'
            , importTourButton: 'This imports a tour from a .json file into this app'
            , createDemoButton: `<p>This quickly adds a ready-to-go tour which explains how to use the Qlik Sense Client</p>
                <p>Try this if you are new to Guided Tour, because you can look in ${lbl.editTourButton} Tour how things are done.</p>`
        };
        var tourJson = {
            mode: 'click',
            opacity: 1,
            btnLabelNext: "OK",
            btnLabelDone: "OK",
            width: 300,
            fontsize: "small",
            arrowHead: 12,
            bgcolor: "rgb(0, 135, 61)",
            fontcolor: "white",
            bordercolor: "white",
            tooltips: []
        };
        const selector = '[pp-accordion="items"] [tid="2"] .item';
        $(selector).each(function (i) {
            const html = $(this).html();
            const tid = $(this).attr('tid');
            for (const key in helpConfig) {
                if (html.indexOf(lbl[key]) > -1) {
                    //tids[key] = selector + `[tid="${$(this).attr('tid')}"]`;
                    tourJson.tooltips.push({
                        selector: selector + `[tid="${tid}"]`,
                        html: helpConfig[key]
                    });
                }
            }
        });

        quickPlay(tourJson, arg, app);
    }


    function quickPlay(tourJson, arg, app) {
        const ownId = arg.qInfo.qId;
        const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
        const enigma = app.model.enigmaModel;
        var mimikGlobal = {
            cache: JSON.parse(`{"${ownId}":${JSON.stringify(tourJson)}}`),
            formulas: JSON.parse(`{"${ownId}":${JSON.stringify(tourJson)}}`),
            isSingleMode: false,
            licensedObjs: JSON.parse(`{"${ownId}":true}`),
            activeTooltip: JSON.parse(`{"${currSheet}":{"${ownId}":-2}}`)
        };
        tooltip.play(JSON.parse(JSON.stringify(mimikGlobal)), ownId, arg, 0, null, enigma, currSheet
            , undefined, undefined, true);  // true = preview, dont perform actions 
    }


    function createDemoTour(arg, app, gtourGlobal) {
        // const demoTourName = (`${Math.random()}`).substr(2);
        const demoTourName = 'Qlik Sense Tour';
        const ownId = arg.qInfo.qId;

        const tourJson = {
            mode: "click",
            fontsize: "small",
            arrowHead: 12,
            opacity: 1,
            width: 300,
            bgcolor: "rgb(0, 135, 61)",
            fontcolor: "white",
            bordercolor: "white",
            btnLabelNext: "Next",
            btnLabelDone: "OK",
            tooltips: [
                {
                    selector: '[data-testid="analytics-creation-edit-button"]',
                    html: "To start the tour click here to close Edit Mode",
                    noClose: true
                }, {
                    selector: ownId,
                    html: `You can start the ${demoTourName} now.`,
                    noClose: true
                }
            ]
        }

        store.existsTour(demoTourName, arg.pStorageProvider, app.id, arg.pConsoleLog)
            .then(function (existsTour) {
                if (existsTour) {
                    // trigger click on Edit
                    $(`.pp-buttongroup-component [title="${lbl.editTooltip}"]`).trigger('qv-activate')
                    // select the existing Qlik Sense Demo tour 
                    waitForElement(`select [label="${demoTourName}"]`).then(function () {
                        $(`[title="${lbl.selectedTour}"]`).parent().find(`select [label="${demoTourName}"]`).prop('selected', true);
                        $(`[title="${lbl.selectedTour}"]`).parent().find('select').trigger('change');
                        quickPlay(tourJson, arg, app);
                    });
                } else {
                    store.saveTour(gtourGlobal, demoTourName, arg.pStorageProvider, JSON.parse(senseDemoTour), app.id, arg.pConsoleLog)
                        .then(function () {
                            // trigger click on Edit
                            $(`.pp-buttongroup-component [title="${lbl.editTooltip}"]`).trigger('qv-activate')
                            // select the newly created tour 
                            waitForElement(`select [label="${demoTourName}"]`).then(function () {
                                $(`[title="${lbl.selectedTour}"]`).parent().find(`select [label="${demoTourName}"]`).prop('selected', true);
                                $(`[title="${lbl.selectedTour}"]`).parent().find('select').trigger('change');
                                quickPlay(tourJson, arg, app);
                            });
                        })
                }
            })
    }

    function importTour(arg, app, gtourGlobal) {

        if (arg.pNewTourName) {
            store.existsTour(arg.pNewTourName, arg.pStorageProvider, app.id, arg.pConsoleLog)
                .then(function (existsTour) {
                    if (existsTour) {
                        leonardo.msg('collision', 'Warning',
                            `A tour with name <strong>${arg.pNewTourName}</strong> already exists.<br>`
                            + `<br>Use a different one or delete the existing.`,
                            null, 'Close');
                    } else {

                        const tourName = arg.pNewTourName;
                        leonardo.msg('tourimport', 'Import Tour Json',
                            '<input id="fileinput2" type="file" maxlength="1" accept=".json"><br>'
                            + '<br>will be imported as <strong>' + tourName + '</strong>'
                            , 'Import', 'Cancel');
                        $('#msgok_tourimport').attr('disabled', true);
                        $('#fileinput2').change(function () {
                            if ($('#fileinput2')[0].files.length > 0) {
                                $('#msgok_tourimport').attr('disabled', false);
                            }
                        })
                        $('#msgok_tourimport').click(function () {
                            //var fd = new FormData();
                            const files = $('#fileinput2')[0].files;
                            const file = files[0];
                            //const tourName = file.name.split('.txt')[0];

                            var reader = new FileReader();
                            reader.onload = function (event) {
                                var fileContent = event.target.result;
                                console.log('fileContent', fileContent)
                                try {
                                    const tourJson = JSON.parse(fileContent);
                                }
                                catch (err) {
                                    alert('No valid JSON');
                                }
                                store.saveTour(gtourGlobal, tourName, arg.pStorageProvider, JSON.parse(fileContent), app.id, arg.pConsoleLog)
                                    .then(function (res) {
                                        $('#msgparent_tourimport').remove();
                                        // activate Edit Mode
                                        $(`.pp-buttongroup-component [title="${lbl.editTooltip}"]`).trigger('qv-activate');
                                        // select the newly created tour 
                                        waitForElement(`[title="${lbl.selectedTour}"]`).then(function () {
                                            $(`[title="${lbl.selectedTour}"]`).parent().find(`select [label="${tourName}"]`).prop('selected', true);
                                            $(`[title="${lbl.selectedTour}"]`).parent().find('select').trigger('change');
                                        });
                                    });
                            }
                            reader.readAsText(file);
                        })

                    }
                })
        } else {
            leonardo.msg('no_name', 'Error', `"${lbl.tourName}" must not be empty.`, null, 'Close');
        }
    }

    function exportTour(arg, app, gtourGlobal) {
        store.loadTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, app.id, false, arg.pConsoleLog)
            .then(function (tourJson) {
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tourJson));
                var downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", arg.pTourName + ".json");
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            });
    }

    function deleteTour(arg, app, gtourGlobal) {
        leonardo.msg('confirm', 'Confirm',
            'Do you want to delete tour ' + arg.pTourName + '?',
            'Yes', 'No');
        $('#msgok_confirm').click(function () {
            $('#msgparent_confirm').remove();
            store.deleteTour(gtourGlobal, arg.pTourName, arg.pStorageProvider, app.id, arg.pConsoleLog);
            arg.pTourName = '';
            $('.gtour-editor').remove(); // remove the cached editor
            // refresh the tour list by changing the action-group to "New" then back to "Edit"
            $(`.pp-buttongroup-component [title="${lbl.newTooltip}"]`).trigger('qv-activate');
            setTimeout(function () {
                $(`.pp-buttongroup-component [title="${lbl.editTooltip}"]`).trigger('qv-activate');
            }, 500);
        })
    }

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

});
