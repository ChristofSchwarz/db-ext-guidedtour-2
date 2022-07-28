// props.js: Extension properties (accordeon menu) externalized

define(["qlik", "jquery", "../editor/scripts/leonardo-msg", "./license", "./pick-n-edit", "./store"], function
    (qlik, $, leonardo, license, pickEdit, store) {

    const ext = 'db_ext_guided_tour';
    const lbl = {  // label definitions
        openTour: 'Choosen Tour',
        startNewTour: 'Start a new tour',
        new: 'Create or import a tour',
        edit: 'Edit a tour',
        // import: 'Import a tour from file',
        expDel: 'Export or delete a tour'
    }

    return {

        presentation: function (gtourGlobal) {

            const app = qlik.currApp();
            // const enigma = app.model.enigmaModel;
            // const currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            return [
                {
                    type: "string",
                    component: "buttongroup",
                    defaultValue: "edit",
                    label: 'Actions',
                    ref: "pMode",
                    options: [
                        { value: "edit", tooltip: lbl.edit, label: 'Edit' },
                        { value: "new", tooltip: lbl.new, label: 'New/Imp' },
                        // { value: "import", tooltip: lbl.import, label: 'Imp' },
                        { value: "expDel", tooltip: lbl.expDel, label: 'Exp/Del' }
                    ]
                },  /*               {
                    type: "boolean",
                    defaultValue: false,
                    ref: "pNewTourMode",
                    label: lbl.StartNewTour
                },*/  {
                    label: lbl.openTour,
                    type: 'string',
                    component: "dropdown",
                    ref: 'pTourName',
                    options: async function (arg) {
                        var fileList = await store.listTours(gtourGlobal, arg.pStorageProvider, app.id);
                        return fileList.map(function (e) { return { value: e }; });
                    },
                    //show: function (arg) { return !arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'edit' || arg.pMode == 'expDel' }
                }, {
                    label: "Edit Tour",
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
                    label: "Export Tour",
                    component: "button",
                    action: function (arg) {
                        if (arg.pTourName) {
                            exportTour(arg, app, gtourGlobal);
                        } else {
                            leonardo.msg('err', 'Error', 'First, choose a tour', null, 'Close');
                        }
                    },
                    //show: function (arg) { return arg.pTourName != '' && !arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'expDel' }
                }, {
                    label: "Delete Tour",
                    component: "button",
                    action: function (arg) {
                        if (arg.pTourName) {
                            deleteTour(arg, app, gtourGlobal);
                        } else {
                            leonardo.msg('err', 'Error', 'First, choose a tour', null, 'Close');
                        }
                    },
                    //show: function (arg) { return arg.pTourName != '' && !arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'expDel' }
                }, {
                    label: 'Tour name',
                    type: 'string',
                    ref: 'pNewTourName',
                    //show: function (arg) { return arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'new' }
                }, {
                    label: "Create Tour",
                    component: "button",
                    action: function (arg) { createTour(arg, app); },
                    //show: function (arg) { return arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'new' }
                }, {
                    label: "Import Tour",
                    component: "button",
                    action: function (arg) { importTour(arg, app) },
                    //show: function (arg) { return !arg.pNewTourMode }
                    show: function (arg) { return arg.pMode == 'new' }
                }, subSection('Button Text & Color', [
                    {
                        label: 'Text for Tour Start',
                        type: 'string',
                        ref: 'pTextStart',
                        defaultValue: 'Start Tour',
                        expression: 'optional'
                    }, /*{
                        label: "Mouse-Over Mode \u2605",
                        type: "boolean",
                        component: "switch",
                        ref: "pHoverMode",
                        defaultValue: false,
                        trueOption: {
                            value: true,
                            translation: "On - Hover tooltips"
                        },
                        falseOption: {
                            value: false,
                            translation: "Off - Sequential Tour"
                        }
                    },*/ {
                        type: "boolean",
                        defaultValue: true,
                        ref: "pShowIcon",
                        label: "Show play icon",
                        show: function (arg) { return arg.pLaunchMode != 'hover' }
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

                            // opt.push({ value: "9", label: "External (not available)" })
                            return opt
                        }
                    }, {
                        label: 'Tour Editor location (qlikcloud only)',
                        type: 'string',
                        component: 'dropdown',
                        ref: 'pEditorUrl',
                        options: [
                            {
                                value: "qs-i-dev.databridge.ch"
                            },
                            {
                                value: "christofschwarz.github.io"
                            },
                            {
                                value: "other",
                                label: 'Other'
                            }
                        ],
                        defaultValue: "christofschwarz.github.io"
                    }, {
                        label: 'Tour Editor location',
                        type: 'string',
                        ref: 'pEditorCustom',
                        defaultValue: "https://qs-i-dev.databridge.ch/anonym/extensions/ext_guided_tour_2/editor/editor.html",
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
        },

        licensing: function (gtourGlobal) {
            const app = qlik.currApp();
            const enigma = app.model.enigmaModel;
            return [
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
        },

        about: function (qext) {
            return [
                {
                    label: function (arg) { return 'Installed extension version ' + qext.version },
                    component: "link",
                    url: '../extensions/ext_guided_tour_2/ext_guided_tour_2.qext'
                }, {
                    label: "This extension is available either licensed or free of charge by data/\\bridge, Qlik OEM partner and specialist for Mashup integrations.",
                    component: "text"
                }, {
                    label: "Without license you may use it as is. Licensed customers get support.",
                    component: "text"
                }, {
                    label: "",
                    component: "text"
                }, {
                    label: "About Us",
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
            store.existsTour(arg.pNewTourName, arg.pStorageProvider, app.id)
                .then(function (existsTour) {
                    //console.log('then', existsTour);
                    if (existsTour) {
                        leonardo.msg('collision', 'Warning',
                            `A tour with name <strong>${arg.pNewTourName}</strong> already exists.<br>`
                            + `<br>Use a different one or delete the existing.`,
                            null, 'Close');
                    } else {
                        // create new tour with default settings
                        store.saveTour(gtourGlobal, arg.pNewTourName, arg.pStorageProvider, undefined, app.id)
                            .then(function () {

                                // close new tour fields by clicking on Edit
                                $(`.pp-buttongroup-component [title="${lbl.edit}"]`).trigger('qv-activate')
                                // $(`[title="${lbl.StartNewTour}"]`).parent().parent().trigger('click');
                                // select the newly created tour 
                                setTimeout(function () {
                                    $(`[title="${lbl.openTour}"]`).parent().find(`select [label="${arg.pNewTourName}"]`).prop('selected', true);
                                    $(`[title="${lbl.openTour}"]`).parent().find('select').trigger('change');
                                }, 300);
                            })
                    }
                })
        } else {
            leonardo.msg('no_name', 'Error', 'Tour name must not be empty.', null, 'Close');
        }
    }

    function importTour(arg, app, gtourGlobal) {

        if (arg.pNewTourName) {
            store.existsTour(arg.pNewTourName, arg.pStorageProvider, app.id)
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
                                store.saveTour(gtourGlobal, tourName, arg.pStorageProvider, JSON.parse(fileContent), app.id)
                                    .then(function (res) {
                                        $('#msgparent_tourimport').remove();
                                        // activate Edit Mode
                                        $(`.pp-buttongroup-component [title="${lbl.edit}"]`).trigger('qv-activate');
                                        // $(`[title="${lbl.StartNewTour}"]`).parent().parent().trigger('click');
                                        // select the newly created tour 
                                        setTimeout(function () {
                                            $(`[title="${lbl.openTour}"]`).parent().find(`select [label="${tourName}"]`).prop('selected', true);
                                            $(`[title="${lbl.openTour}"]`).parent().find('select').trigger('change');
                                        }, 300);
                                    });
                            }
                            reader.readAsText(file);
                        })

                    }
                })
        } else {
            leonardo.msg('no_name', 'Error', 'Tour name must not be empty.', null, 'Close');
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
            // refresh the tour list by changing the action-group to "Edit" then back to "Exp/Del"
            $(`.pp-buttongroup-component [title="${lbl.edit}"]`).trigger('qv-activate');
            setTimeout(function () {
                $(`.pp-buttongroup-component [title="${lbl.expDel}"]`).trigger('qv-activate');
            }, 300);
        })
    }
});
