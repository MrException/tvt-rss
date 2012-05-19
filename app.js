///////////////////////////// START SETTINGS//{{{
// NOTE: right now this is highly dependent on tvtorrents.com
//
// the url the rss feed is at
var url = "http://www.tvtorrents.com/mytaggedRSS?digest=9eb619c42f819ecb144ef88181b88a278c226ca0&hash=73f3f27ece46767294cf91133cfc81d6165a1e58";

// where to save the files
var dir = "/home/rob/Projects/rss/test/";

// the filename to save the index to
var indexFile = "index.json";

// location of wget - NOTE: will probably remove this dep
var wget = "/usr/bin/wget";

// minutes between each run
var interval = 5;

// should this download full seasons?
var season = false;

// an array of regexes to run against the file name if the filename matches ANY
// of these regexes, then the file will be skipped
var regFalse = [
  new RegExp("avi$"),
  new RegExp("720p","i"),
  new RegExp("1080"),
  new RegExp("nuked","i")
];

// an array of regexes to run against the file name the filename must match ALL
// of these, or it will be skipped
var regTrue = [
  new RegExp(".*")
];
////////////////////////////// END SETTINGS//}}}

var request = require("request");
var parser = require("xml2json");
var util = require("util");
var exec = require("child_process").exec;
var fs = require("fs");
var _ = require("underscore");

// this will hold all of the shows we have seen so far
var index;

function run() {//{{{
  index = readIndex();
  console.log(index);

  request(url, function(error, response, xml) {
    if (!error && response.statusCode === 200) {
      var json = parser.toJson(xml, { object: true });
      var showsRaw = json.rss.channel.item;

      var shows = [];
      _.each(showsRaw, function(show, i) {
        showObj = makeDescObj(show.description, show.link);
        shows.push(showObj);
      });
      shows = _.filter(shows, filter);

      shows = runIndex(shows);

      //_.each(shows, download);
      //console.log(util.inspect(index, true, null));
    }
  });
}//}}}

function makeDescObj(desc, url) {//{{{
  var arr = desc.split(";");

  var show = arr[0].split(":")[1].trim();
  var title = arr[1].split(":")[1].trim();
  var season = arr[2].split(":")[1].trim();
  var episode = arr[3].split(":")[1].trim();
  var file = arr[4].split(":")[1].trim() + ".torrent";

  return {
    show: show,
    title: title,
    season: season,
    episode: episode,
    file: file,
    url: url
  };
}//}}}

function filter(show) {//{{{
  if (!season && (/all/i).test(show.episode)) {
    return false;
  }

  var pass = true;
  _.each(regFalse, function(reg) {
    if (reg.test(show.file)) {
      pass = false;
    }
  });

  if (pass) {
    _.each(regTrue, function(reg) {
      if (!reg.test(show.title)) {
        pass = false;
      }
    });
  }

  return pass;
}//}}}

function runIndex(shows) {//{{{
  var unseenShows = [];
  var unseen;

  _.each(shows, function(show) {
    unseen = false;

    if (!index[show.show]) {
      index[show.show] = {};
      index[show.show][show.season] = {};
      index[show.show][show.season][show.episode] = true;
      unseen = true;
    }
    else {
      if (!index[show.show][show.season]) {
        index[show.show][show.season] = {};
        index[show.show][show.season][show.episode] = true;
        unseen = true;
      }
      else {
        if (!index[show.show][show.season][show.episode]) {
          index[show.show][show.season][show.episode] = true;
          unseen = true;
        }
      }
    }

    if(unseen) {
      unseenShows.push(show);
    }
  });

  if (writeIndex(index)) {
    console.log("Wrote index");
  }
  else {
    console.log("Error writting index");
  }
  return unseenShows;
}//}}}

function download(show) {//{{{
  var command = wget + " -O '" + dir + show.file + "' '" + show.url + "'";
  console.log(command);
  var child = exec(command, function(error, stdout, stderr) {
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
    if (error !== null) {
      console.log("exec error: " + error);
    }
  });
}//}}}

function readIndex() {
  // need to check special cases:
  // -file not there
  // -file has bad content
  var index = {};
  var data = fs.readFileSync(__dirname + "/" + indexFile, "utf8");
  if (data.length) {
    index = JSON.parse(data);
  }
  else {
    console.log("index file empty");
  }
  return index;
}

function writeIndex() {
  fs.writeFileSync(__dirname + "/" + indexFile, JSON.stringify(index));
  return true;
}

//var id = setInterval(run, 5*60*1000);
run();
