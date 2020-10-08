let express = require("express");
let mongo = require("mongodb");
let mongoose = require("mongoose");
let bodyParser = require("body-parser");
let dns = require("dns");
let url = require("url");
let dotenv = require("dotenv");

dotenv.config();

let app = express();

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

let listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// create Schema
let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number,
});

// create model based on defined Schema
let Url = mongoose.model("Url", urlSchema);

app.post(
  "/api/shorturl/new",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let inputUrl = req.body.url;

    const parsedInputUrl = url.parse(inputUrl);

    // if posted URL is not valid send proper json response
    dns.lookup(parsedInputUrl.hostname, (error, address, family) => {
      if (error) {
        res.json({ error: "Invalid URL" });
      } else {
        // first search database for the posted URL
        Url.findOne({ original: inputUrl }, function (err, result) {
          if (err) {
            console.log(err);
          }

          let urlShort = 1;

          // if there was no error and the URL is already in database respond
          // with values from the databse
          if (!err && result != undefined) {
            res.json({
              original_url: result.original,
              short_url: result.short,
            });
          } // otherwise if URL is not in database
          else if (!err) {
            // sort database in descending order by short value and
            // create new short value adding +1 to it
            Url.findOne({})
              .sort({ short: "desc" })
              .exec((err, result) => {
                if (!err && result != undefined) {
                  console.log(result.short);
                  urlShort = result.short + 1;
                  console.log(result.short);
                }

                let newUrl = new Url({
                  original: inputUrl,
                  short: urlShort,
                });

                // save the new URL in the database
                newUrl.save(function (err, url) {
                  if (err) {
                    console.log(err);
                  }
                });

                // respond with proper json object
                res.json({
                  original_url: inputUrl,
                  short_url: urlShort,
                });
              });
          }
        });
      }
    });
  }
);

app.get("/api/shorturl/:new", (req, res) => {
  let shortInput = req.params.new;

  Url.findOne({ short: shortInput }, function (err, result) {
    if (err || result == undefined) {
      res.json({ error: "No short URL found for the given input" });
    } else {
      res.redirect(result.original);
    }
  });
});
