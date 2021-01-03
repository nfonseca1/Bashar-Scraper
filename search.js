const fs = require("fs");
const express = require("express");
const app = express();

app.use(express.static(__dirname + "/static/"));
app.use(express.json());

let eventDataRaw = fs.readFileSync("./eventData.json", {encoding: "utf-8"});
let eventData = JSON.parse(eventDataRaw);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/search.html");
})

app.post("/search", (req, res) => {
    let keywords = req.body.keyword.split(" ");

    let keySnippets = [];

    for (let eventDetails of eventData) {
        console.log(eventDetails.eventName);
        for (let snippet of eventDetails.data) {
            let keywordIndex = 0;
            let c = snippet.content;
            for (let i = 0; i < c.length; i++) {
                if (c[i].word.toLowerCase() === keywords[keywordIndex].toLowerCase()) {
                    keywordIndex++;
                    if (keywordIndex === keywords.length) {
                        let snip = getSentenceSnippet(snippet, keywords, i);
                        if (snip.nextIdx > i) i = snip.nextIdx;
                        keySnippets.push({time: snip.time, snippet: snip.snippet, eventName: eventDetails.eventName});
                        keywordIndex = 0;
                    }
                }
                else keywordIndex = 0;
            }
        }
    }

    res.send(keySnippets);
})

function getSentenceSnippet(snippet, keywords, idx) {
    let beginningOfSentenceFound = false;
    let startSnippetIdx = -1;
    for (let i = idx - keywords.length; i > 0; i--) {
        let lastWordChar = snippet.content[i].word[snippet.content[i].word.length - 1];
        if (lastWordChar === "." || lastWordChar === "?" || lastWordChar === "!") {
            if (beginningOfSentenceFound) {
                startSnippetIdx = i;
                break;
            }
            else {
                beginningOfSentenceFound = true;
            }
        }
    }

    let endOfSentenceFound = false;
    let endSnippetIdx = snippet.content.length - 1;
    for (let i = idx + 1; i < snippet.content.length; i++) {
        let lastWordChar = snippet.content[i].word[snippet.content[i].word.length - 1];
        if (lastWordChar === "." || lastWordChar === "?" || lastWordChar === "!") {
            endSnippetIdx = i;
            if (endOfSentenceFound) {
                break;
            }
            else {
                endOfSentenceFound = true;
            }
        }
    }

    let sentenceSnippet = snippet.content.slice(startSnippetIdx + 1, endSnippetIdx + 1).map(w => w.word).join(" ");
    return {time: snippet.content[startSnippetIdx + 1].time, snippet: sentenceSnippet, nextIdx: endSnippetIdx + 1}
}

app.listen(3000, () => console.log("Server started..."))