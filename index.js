var express = require('express');
var fs = require('fs');
var extend  = require('extend');
var request = require('request');
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var app     = express();


url = 'http://www.politico.com/about-us';
request(url, function(error, response, html){
    if(!error) {
        var $ = cheerio.load(html, {
                normalizeWhitespace: true,
                xmlMode: false 
        });
        var data = {};
        var Staff = {
            'name': '',
            'image': '',
            'title': '',
            'description': ''
        };
        var counter = 0, sum = 0;
        var cacheDir = 'cache/';
        $('.staff section.staff-group').each(function (i, child) {
            $($(child).children()).each(function (x, value) {
                $($(value).children()).each(function (y, dataVal) { 

                    var details_url = "";
                    var fileId = "";

                    if($(dataVal).children('.name').children('a').attr('href')) {
                        details_url = $(dataVal).children('.name').children('a').attr('href');

                        if (matches = /http:\/\/www.politico.com\/staff\/(.+)/.exec(details_url)) {
                            try {
                                fileId = matches[1];
                                var filename = cacheDir + matches[1] + '.html';
                                fs.accessSync(filename, fs.F_OK);

                                details_url = 'http://localhost/politico_scrape/' + filename;
                            } catch (e) {
                                
                            }
                        }

                        var request_call = function (error_details, html_details, fileId) {

                            if(!error_details && html_details) {
                                // We cache the html page
                                if (!fs.existsSync(cacheDir)){
                                    fs.mkdirSync(cacheDir);
                                }
                                fs.writeFile(cacheDir + fileId + '.html', html_details, { flags: 'wx' }, function (err) {
                                    if (err) throw err;
                                });

                                var $j = cheerio.load(html_details, {
                                        normalizeWhitespace: true,
                                        xmlMode: false 
                                });

                                var data_details = {};
                                $j('.super-inner .layout-bi-unequal').each(function (idx, child_details) {
                                    $j(child_details).children('.content-groupset').each(function (text_id, txt) {
                                        if($j(txt).children('.about-bio-intro').children().children().children('h1').text()) {
                                            if(!data_details[$j(txt).children('.about-bio-intro').children().children().children('h1').text()]) {
                                                data_details[$j(txt).children('.about-bio-intro').children().children().children('h1').text()] = [];
                                            }

                                            var bio_details = $j(txt).children('.about-bio-description').children().children('p').text().trim();
                                            bio_details = bio_details ? bio_details : $j(txt).children('.about-bio-description').children('.generic-text').text().trim();
                                            var emails = $j(txt).children('.about-bio-tools').children().children().children().children().children().children('.credits-email').children().text().trim();
                                            var twitter = $j(txt).children('.about-bio-tools').children().children().children().children().children().children('.credits-twitter').children().text().trim();
                                            var phone = $j(txt).children('.about-bio-tools').children().children().children().children().children().children('.credits-phone').children().text().trim();
                                            // var image = $j(txt).children('.about-bio-description').children().children('.generic-media').children('.fig-graphic').attr('src');
                                            var idx = $j(txt).children('.about-bio-intro').children().children().children('h1').text().trim();

                                            data_details[idx] = {
                                                'bio':bio_details,
                                                'email':emails,
                                                'twitter_handle':twitter,
                                                'phone_number':phone
                                            };
                                        }
                                    });
                                });

                                var str = $(dataVal).children('.name').text().trim();
                                var staff_cat = $(child).children().first().text().trim();
                                var title_staff = $(dataVal).children('.title').text();
                                
                                if(str){
                                    if($(dataVal).children('.thumb').children('a').attr('href')) {
                                        if(!data[staff_cat]) {
                                            data[staff_cat] = [];
                                        }
                                        for(var key in data_details) {
                                            if(key == str) {
                                                data[staff_cat].push(extend({}, Staff, {
                                                    'name': str,
                                                    'title': title_staff,
                                                    'department': staff_cat,
                                                    'phone_number': data_details[key].phone_number,
                                                    'email': data_details[key].email,
                                                    'twitter_handle': data_details[key].twitter_handle,
                                                    'bio': data_details[key].bio,
                                                    'staff_photo': $(dataVal).children('.thumb').children('a').attr('href'),
                                                }));
                                            }
                                        }                                   
                                    }
                                    
                                }

                                // sum = $('.staff section.staff-group').length * $(child).children().length * $(value).children().length;
                            
                                // json2csv({data: data[staff_cat], fields: ['name', 'category', 'image', 'title', 'description']}, function(err, csv) {
                                //   if (err) console.log(err);
                                //   fs.writeFile('file.csv', csv, function(err) {
                                //     if (err) throw err;
                                //     console.log('file saved');
                                //   });
                                // });

                            
                                console.log('finished query');
                                counter--;

                                console.log(counter);
                                    
                                if(counter == 0){
                                    json2csv({data: data[staff_cat], fields: ['name', 'title', 'department', 'phone', 'email', 'twitter_handle', 'bio', 'staff_photo']}, function(err, csv) {
                                        if (err) console.log(err);
                                        fs.writeFile('file.csv', csv, function(err) {
                                            if (err) throw err;
                                            console.log('file saved');
                                        });
                                    });
                                }
                            } else {
                                console.log(error_details);
                                request(details_url, function(error_details, resp_details, html_details) {
                                    request_call(error_details, html_details, fileId);
                                });
                            }
                        }

                        console.log('run: ' + counter + '=' + details_url);
                        counter++;

                        console.log('requested query' + counter);
                        request(details_url, function(error_details, resp_details, html_details) {
                            console.log('called request call');
                            request_call(error_details, html_details, fileId);
                        });

                    } else {
                        console.log('if end');
                    }
                });
            });
        });
    }

});


exports = module.exports = app;