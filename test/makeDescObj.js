var RSSlib = require("../");

describe("RSS", function() {
  describe("makeDescObj", function() {
    it("should parse a string properly", function() {
      var RSS = new RSSlib.RSS({});
      var descString = "Show Name: Name; Show Title: Title; Season: 1; Episode: 1; Filename: Show.avi";
      var urlString = "http://example.com";
      var descObj = RSS.makeDescObj(descString,urlString);
      console.log(descObj.show);
      descObj.show.should.equal("Name");
    });
  });
});
