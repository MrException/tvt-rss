var request = require("request");
var parser = require("xml2json");
var util = require("util");
var exec = require("child_process").exec;
var fs = require("fs");
var _ = require("underscore");

exports = module.exports = RSS;

function RSS(config) {
  this.url = config.url;
  this.configDir = config.configDir;
  this.dir = config.dir;
  this.indexFile = config.indexFile;
  this.wget = config.wget;
  this.interval = config.interval;
  this.season = config.season;
  this.regFalse = config.regFalse;
  this.regTrue = config.regTrue;
  this.index = {};
}

RSS.prototype.run = function() {
  this.index = this.readIndex(this.indexFile);
  console.log(this.index);

  var that = this;
  request(this.url, function(error, response, xml) {
    if (!error && response.statusCode === 200) {
      var json = parser.toJson(xml, { object: true });
      var showsRaw = json.rss.channel.item;

      var shows = [];
      _.each(showsRaw, function(show, i) {
        showObj = that.makeDescObj(show.description, show.link);
        shows.push(showObj);
      });
      shows = _.filter(shows, that.filter);

      shows = that.runIndex(shows);

      _.each(shows, function(show, i) {
        that.download(show);
      });
      console.log(util.inspect(that.index, true, null));
    }
  });
};

RSS.prototype.makeDescObj = function(desc, url) {
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
};

RSS.prototype.filter = function(show) {
  if (!this.season && (/all/i).test(show.episode)) {
    return false;
  }

  var pass = true;
  var re;
  _.each(this.regFalse, function(reg) {
    re = new RegExp(reg, "i");
    if (re.test(show.file)) {
      pass = false;
    }
  });

  if (pass) {
    _.each(this.regTrue, function(reg) {
      re = new RegExp(reg, "i");
      if (!re.test(show.title)) {
        pass = false;
      }
    });
  }

  return pass;
};

RSS.prototype.runIndex = function(shows) {
  var unseenShows = [];
  var unseen;
  var index = this.index;

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

  if (this.writeIndex(index)) {
    console.log("Wrote index");
  }
  else {
    console.log("Error writting index");
  }
  return unseenShows;
};

RSS.prototype.download = function(show) {
  var command = this.wget + " -O '" + this.configDir + this.dir + show.file + "' '" + show.url + "'";
  console.log(command);
  var child = exec(command, function(error, stdout, stderr) {
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
    if (error !== null) {
      console.log("exec error: " + error);
    }
  });
};

RSS.prototype.readIndex = function() {
  // need to check special cases:
  // -file not there
  // -file has bad content
  var index = {};
  var data = fs.readFileSync(this.configDir + this.indexFile, "utf8");
  if (data.length) {
    index = JSON.parse(data);
  }
  else {
    console.log("index file empty");
  }
  return index;
};

RSS.prototype.writeIndex = function() {
  fs.writeFileSync(this.configDir + this.indexFile, JSON.stringify(this.index));
  return true;
};
