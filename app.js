var request = require("request");
var parser = require("xml2json");
var util = require("util");
var exec = require("child_process").exec;
var fs = require("fs");
var _ = require("underscore");

// TODO: read this from an argument
var configFileName = "config.json";
var config;
var index;
function run() {
  index = readIndex(config.indexFile);
  console.log(index);

  request(config.url, function(error, response, xml) {
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

      _.each(shows, download);
      console.log(util.inspect(index, true, null));
    }
  });
}

function makeDescObj(desc, url) {
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
}

function filter(show) {
  if (!config.season && (/all/i).test(show.episode)) {
    return false;
  }

  var pass = true;
  var re;
  _.each(config.regFalse, function(reg) {
    re = new RegExp(reg, "i");
    if (re.test(show.file)) {
      pass = false;
    }
  });

  if (pass) {
    _.each(config.regTrue, function(reg) {
      re = new RegExp(reg, "i");
      if (!re.test(show.title)) {
        pass = false;
      }
    });
  }

  return pass;
}

function runIndex(shows) {
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
}

function download(show) {
  var command = config.wget + " -O '" + config.dir + show.file + "' '" + show.url + "'";
  console.log(command);
  var child = exec(command, function(error, stdout, stderr) {
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
    if (error !== null) {
      console.log("exec error: " + error);
    }
  });
}

function readIndex() {
  // need to check special cases:
  // -file not there
  // -file has bad content
  var index = {};
  var data = fs.readFileSync(__dirname + "/" + config.indexFile, "utf8");
  if (data.length) {
    index = JSON.parse(data);
  }
  else {
    console.log("index file empty");
  }
  return index;
}

function readConfig() {
  // need to check special cases:
  // -file not there
  // -file has bad content
  var config = {};
  var data = fs.readFileSync(__dirname + "/" + configFileName, "utf8");
  if (data.length) {
    config = JSON.parse(data);
  }
  else {
    console.log("config file empty");
  }
  return config;
}

function writeIndex() {
  fs.writeFileSync(__dirname + "/" + config.indexFile, JSON.stringify(index));
  return true;
}


config = readConfig();
console.log(config);

//var id = setInterval(run, config.interval*60*1000);
run();
