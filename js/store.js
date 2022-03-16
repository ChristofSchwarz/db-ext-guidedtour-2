/*
store.js - all function around parsing DOM elements to Json and saving that Json to a storage provider

Version: 0.1
History:
0.1, Christof Schwarz, alpha version

*/

define(["jquery", "../editor/scripts/leonardo-msg"], function
    ($, leonardo) {

    const tourDefault = {
        "mode": "click",
        "fontsize": "12px",
        "arrowHead": 12,
        "opacity": 0.2,
        "width": "250",
        "bgcolor": "black",
        "fontcolor": "white",
        "bordercolor": "gray",
        "btnLabelNext": "Next",
        "btnLabelDone": "Done",
        "tooltips": []
    };

    // 43 Bytes of a valid 1x1 px GIF http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
    const smallestGIF = atob('R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');


    return {

        // dummyUpload: async function () {

        //     var uploadFormData = new FormData();
        //     // https://www.semicolonworld.com/question/21154/sending-formdata-with-a-binary-data-by-using-jquery-ajax

        //     //uploadFormData.append("file", new Blob([smallestGIF], { type: "application/octet-stream" }));
        //     uploadFormData.append("file", new Blob([smallestGIF], { type: "image/gif" }));

        //     var xrfkey = 'RvyIQG8CbGw7lzec';
        //     var headers = [];
        //     headers["X-Qlik-Xrfkey"] = xrfkey;
        //     $.ajax({
        //         url: 'https://qs-i-dev.databridge.ch/qrs/appcontent/e506dfb6-dee4-49e6-9258-c77180e2fcab/uploadfile?externalpath=test_gtour.gif&overwrite=true&xrfkey=' + xrfkey,
        //         //type: "POST",
        //         method: 'POST',
        //         data: uploadFormData,
        //         //cache: false,
        //         contentType: false,
        //         processData: false,
        //         headers: headers,
        //         success: function (r) {
        //             alert("Success!");
        //         }
        //     });
        // },

        //--------------------------------------------------------------------------------
        existsTour: async function (tourName, providerId, appId, log = true) {
            //----------------------------------------------------------------------------

            const mode = location.href.indexOf('qlikcloud.com') > -1 ? 'cloud' : 'windows';
            // gtourGlobal.isQlikCloud
            const apiUrls = {
                "1": `/qrs/app/content?filter=app.id eq ${appId} and references.logicalPath ew '${tourName}.txt'`,
                "2": `/api/v1/apps/${appId}/media/files/${tourName}_gtour.gif`,
                "3": `/qrs/app/content?filter=app.id eq ${appId} and references.logicalPath ew '${tourName}_gtour.gif'`,
            }

            if (log) console.log('calling existsTour ', tourName);

            if (providerId == 1) {  // Save into the app as attached file (Qlik Sense Windows)

                const res = await restCall('GET', apiUrls["1"], undefined, log);
                return res.length > 0

            } else if (providerId == 2 || (providerId == 3 && mode == 'cloud')) {

                const res = await qlikCloudApiCall('GET', apiUrls["2"], undefined, log);
                return res == 200;

            } else if (providerId == 3 && mode == 'windows') {

                const res = await restCall('GET', apiUrls["3"], undefined, log);
                return res.length > 0

            } else {
                leonardo.msg('existsTour', 'Error', 'Function existsTour: unknown providerId ' + providerId, null, 'OK');
                return false;
            }
        },

        //--------------------------------------------------------------------------------
        saveTour: async function (gtourGlobal, tourName, providerId, tourJson = tourDefault, appId, log = true) {
            //----------------------------------------------------------------------------
            if (log) console.log('calling saveTour', tourName, tourJson);

            const mode = location.href.indexOf('qlikcloud.com') > -1 ? 'cloud' : 'windows';
            // gtourGlobal.isQlikCloud
            const apiUrls = {
                "1": `/qrs/appcontent/${appId}/uploadfile?externalpath=${tourName}.txt&overwrite=true`,
                "2": `/api/v1/apps/${appId}/media/files/${tourName}_gtour.gif`,
                "3": `/qrs/appcontent/${appId}/uploadfile?externalpath=${tourName}_gtour.gif&overwrite=true`,
            }

            //const app = qlik.currApp(this);
            // if (tourJson) {
            if (providerId == 1) {  // Save into the app as attached file (Qlik Sense Windows)
                // POST appcontent/58f721a5-c14c-438b-bd2d-dc54f7b36c3d/uploadfile?externalpath=Book1.xlsx&overwrite=true&xrfkey={{xrfkey}}

                await restCall('POST', apiUrls["1"], JSON.stringify(tourJson), log);
                return true

            } else if (providerId == 2 || (providerId == 3 && mode == 'cloud')) {

                var blob = new Blob(
                    [smallestGIF + JSON.stringify(tourJson)],
                    { type: 'image/gif' }
                );
                var status = await qlikCloudApiCall('PUT', apiUrls["2"], log, blob);
                if (status == 409) {
                    await qlikCloudApiCall('DELETE', apiUrls["2"], log);
                    status = await qlikCloudApiCall('PUT', apiUrls["2"], log, blob);
                }
                if (status != 200) {
                    console.error('PUT file resulted in error, status ' + status);
                    return false
                } else {
                    return true
                }

            } else if (providerId == 3 && mode == 'windows') {

                var uploadFormData = new FormData();
                uploadFormData.append("file", new Blob(
                    [smallestGIF + JSON.stringify(tourJson)],
                    { type: 'image/gif' }
                ));
                await restCall('POST', apiUrls["3"], uploadFormData, log, false);
                return true;

            } else {

                leonardo.msg('saveTour', 'Error', 'Function saveTour: unknown providerId ' + providerId, null, 'OK');
                return false;
            }
            // } else {
            //     leonardo.msg('saveTour', 'Error', 'Function saveTour: no tour JSON provided', null, 'OK');
            //     return false;
            // }
        },

        //--------------------------------------------------------------------------------
        loadTour: async function (gtourGlobal, tourName, providerId, appId, skipBypassedTTs = false, log = true) {
            //----------------------------------------------------------------------------
            if (log) console.log('calling loadTour "' + tourName + '"');
            const mode = location.href.indexOf('qlikcloud.com') > -1 ? 'cloud' : 'windows';
            // gtourGlobal.isQlikCloud
            const apiUrls = {
                "1": `/appcontent/${appId}/${tourName}.txt`,
                "2": `/api/v1/apps/${appId}/media/files/${tourName}_gtour.gif`,
                "3": `/appcontent/${appId}/${tourName}_gtour.gif`,
            }

            if (tourName) {
                var tourJson

                //const app = qlik.currApp(this);
                if (providerId == 1) {  // Load from app-attached file (Qlik Sense Windows)

                    const raw = await restCall('GET', apiUrls["1"], undefined, log);
                    tourJson = raw ? JSON.parse(raw) : {};

                } else if (providerId == 2 || (providerId == 3 && mode == 'cloud')) {

                    tourJson = tourDefault;
                    const raw = await restCall('GET', apiUrls["2"], undefined, log);
                    tourJson = raw ? JSON.parse(raw.split(smallestGIF)[1]) : {}

                } else if (providerId == 3 && mode == 'windows') {

                    tourJson = tourDefault;
                    const raw = await restCall('GET', apiUrls["3"], undefined, log);
                    tourJson = raw ? JSON.parse(raw.split(smallestGIF)[1]) : {}

                } else {

                    leonardo.msg('loadTour', 'Error', 'Function loadTour: unknown providerId ' + providerId, null, 'OK');
                    return false;
                }

                tourJson = Object.assign({}, tourDefault, tourJson)  // merge default vals with tour settings
                if (skipBypassedTTs) {
                    tourJson.tooltips = tourJson.tooltips.filter(function (e) { return e.bypass ? false : true })
                }
                return tourJson

            } else {
                return tourDefault
            }
        },

        //--------------------------------------------------------------------------------
        listTours: async function (gtourGlobal, providerId, appId, log = true) {
            //----------------------------------------------------------------------------
            if (log) console.log('calling listTours');

            const mode = location.href.indexOf('qlikcloud.com') > -1 ? 'cloud' : 'windows';
            // gtourGlobal.isQlikCloud
            const apiUrls = {
                "1": `/qrs/app/content/full?filter=app.id eq ${appId}`,
                "2": `/api/v1/apps/${appId}/media/list`,
                "3": `/qrs/app/content/full?filter=app.id eq ${appId}`
            }

            if (providerId == 1) {  // Load from app-attached file (Qlik Sense Windows)

                var res = await restCall('GET', apiUrls["1"], undefined, log);
                var fileList = [];
                var res = res[0] ? res[0].references : [];
                res.forEach(function (fileInfo) {
                    if (fileInfo.externalPath.substr(-4) == '.txt') {
                        const fileNameOnly = fileInfo.externalPath.split('/')[fileInfo.externalPath.split('/').length - 1];
                        if (fileNameOnly.length > 4) {
                            fileList.push(decodeURI(fileNameOnly.split('.txt')[0]))  // without trailling '.txt'
                        }
                    }
                });
                fileList.sort();
                return fileList;

            } else if (providerId == 2 || (providerId == 3 && mode == 'cloud')) {  // provider qlikcloud.com

                var res = await restCall('GET', apiUrls["2"], undefined, log);
                var fileList = [];
                if (res) {
                    res.data.forEach(function (fileInfo) {
                        if (fileInfo.id.substr(-10) == '_gtour.gif') {
                            fileList.push(fileInfo.id.split('_gtour.gif')[0]);
                        }
                    });
                    fileList.sort();
                }
                return fileList;

            } else if (providerId == 3 && mode == 'windows') {

                var res = await restCall('GET', apiUrls["3"], undefined, log);
                var fileList = [];
                var res = res[0] ? res[0].references : [];
                res.forEach(function (fileInfo) {
                    if (fileInfo.externalPath.substr(-10) == '_gtour.gif') {
                        const fileNameOnly = fileInfo.externalPath.split('/')[fileInfo.externalPath.split('/').length - 1];
                        if (fileNameOnly.length > 4) {
                            fileList.push(decodeURI(fileNameOnly.split('_gtour.gif')[0]))  // without trailling '_gtour.gif'
                        }
                    }
                });
                fileList.sort();
                return fileList;

            } else {

                leonardo.msg('listTours', 'Error', 'Function listTours: unknown providerId ' + providerId, null, 'OK');
                return [];

            }
        },

        //--------------------------------------------------------------------------------
        deleteTour: async function (gtourGlobal, tourName, providerId, appId, log = true) {
            //----------------------------------------------------------------------------

            if (log) console.log('calling deleteTour');

            const mode = location.href.indexOf('qlikcloud.com') > -1 ? 'cloud' : 'windows';
            // gtourGlobal.isQlikCloud
            const apiUrls = {
                "1": `/qrs/appcontent/${appId}/deletecontent?externalpath=${tourName}.txt`,
                "2": `/api/v1/apps/${appId}/media/files/${tourName}_gtour.gif`,
                "3": `/qrs/appcontent/${appId}/deletecontent?externalpath=${tourName}_gtour.gif`,
            }

            try {
                if (providerId == 1) {  // Remove app-attached file (Qlik Sense Windows)

                    await restCall('DELETE', apiUrls["1"], undefined, log);

                } else if (providerId == 2 || (providerId == 3 && mode == 'cloud')) {

                    await qlikCloudApiCall('DELETE', apiUrls["2"], undefined, log);

                } else if (providerId == 3 && mode == 'windows') {

                    await restCall('DELETE', apiUrls["3"], undefined, log);

                } else {

                    leonardo.msg('listTours', 'Error', 'Function deleteTour: unknown providerId ' + providerId, null, 'OK');
                    return false;
                }
            }
            catch (err) {
                leonardo.msg('listTours', 'Error', 'Function deleteTour: Error ' + JSON.stringify(err), null, 'OK');
                return false;
            }
        }
    }

    //=============================================================================================
    async function restCall(method, endpoint, body, log = true, contentType) {
        //=========================================================================================
        // Calling an API. 

        let result;
        const baseUrl = location.href.substr(0, location.href.indexOf('/sense/app'))
            + (endpoint.substr(0, 1) == '/' ? '' : '/');

        try {
            var args = {
                timeout: 0,
                method: method,
                url: baseUrl + endpoint,
            };
            var headers = [];
            const xrfkey = ('' + Math.random()).replace('.', '').repeat(6).substr(0, 16);

            if (method.toUpperCase() != 'GET') {
                if (contentType == undefined) {
                    headers["Content-Type"] = 'application/json'
                } else if (contentType == false) {
                    args.contentType = false;
                    args.processData = false;
                } else {
                    headers["Content-Type"] = contentType;
                }
            };
            if (endpoint.indexOf('qrs/') > -1) {
                // call to QRS API needs a additional header and query Param
                headers["X-Qlik-Xrfkey"] = xrfkey;
                args.url += (endpoint.indexOf('?') == -1 ? '?xrfkey=' : '&xrfkey=') + xrfkey;
            }
            if (headers) args.headers = headers;
            if (body) args.data = body;
            if (log) console.log('$.ajax request', args);
            result = await $.ajax(args);
            if (log) console.log('$.ajax response', result.substr(0, 1024) & (result.length > 1024 ? '...' : ''));
            return result;

        } catch (error) {
            //alert('Error');
            //leonardoMsg('qrs_error', 'Error 152', error.responseText, null, 'Close', false);
            console.error('error', error.status ? (error.status + ' ' + error.statusText) : error);
            return null
        }
    }


    function qlikCloudApiCall(method, url, log = true, blob) {

        var csrfToken = document.cookie.split(';').filter(function (cookie) {
            return cookie.indexOf('_csrfToken=') > -1
        });
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, false);
            if (csrfToken.length) {
                // add http header from csrfToken cookie
                xhr.setRequestHeader('qlik-csrf-token', csrfToken[0].split('=')[1]);
            }
            xhr.onload = function () {
                if (log) console.log('qlikCloudApiCall response status ', xhr.status)
                resolve(xhr.status);
            };
            if (log) console.log('qlikCloudApiCall ' + method + ' ' + url);
            xhr.send(blob);
        });
    }

})