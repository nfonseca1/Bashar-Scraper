const fs = require("fs");
const express = require("express");
const app = express();

app.use(express.static(__dirname + "/static/"));
app.use(express.json());

let eventDataRaw = fs.readFileSync("./newEventData.json", {encoding: "utf-8"});
let eventData = JSON.parse(eventDataRaw);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/search.html");
})

app.post("/search", (req, res) => {
    let keyPhrases = req.body.keywords;

    let keySnippets = [];
    
    for (let evt of eventData) {
        console.log(evt.eventName);
        keySnippets.push({eventName: evt.eventName, content: []});
        let content = evt.content;
        for (let i = 0; i < content.length; i++) {
            let endIdx = checkWordMatch(content, i, keyPhrases);
            if (endIdx === -1) continue;
            let bounds = getSnippet(content, keyPhrases, i, endIdx);
            keySnippets[keySnippets.length-1].content.push(content.slice(bounds.startIdx, bounds.endIdx + 1));
            i = bounds.endIdx + 1;
        }
    }

    res.send({keySnippets, keyPhrases});
})

function checkWordMatch(content, i, keyPhrases, checkBackwards = false) {
    let wordToCheck = filterWord(content, i);

    // Check for word match
    for (let w = 0; w < keyPhrases.length; w++) {
        let keyPhrase = keyPhrases[w].toLowerCase().split(" ");
        if ((checkBackwards === false && wordToCheck === keyPhrase[0])
            || (checkBackwards && wordToCheck === keyPhrase[keyPhrase.length - 1])) {
            let endIdx = checkPhraseMatch(content, i, keyPhrase, checkBackwards);
            if (endIdx > -1) {
                return endIdx;
            }
        }
    }
    return -1;
}

function filterWord(content, i) {
    // Filter word to check
    let wordToCheck = content[i].word.toLowerCase();
    let lastWordChar = wordToCheck[wordToCheck.length - 1];
    if (lastWordChar === "." || lastWordChar === "?" || lastWordChar === "," || lastWordChar === "!") {
        wordToCheck = wordToCheck.slice(0, wordToCheck.length - 1);
    }
    return wordToCheck;
}

// If all words of the key phrase are matched in consecutive order
function checkPhraseMatch(content, idx, keyPhrase, checkBackwards = false) {
    let endIndex = idx;
    if (checkBackwards) {
        for (let k = keyPhrase.length - 2; k >= 0; k--) {
            let diff = keyPhrase.length - 2 - k;
            let wordToCheck = filterWord(content, idx - diff);
            if (keyPhrase[k] === wordToCheck) endIndex = idx - diff;
            else {
                endIndex = -1;
                break;
            }
        }
    }
    else {
        for (let k = 1; k < keyPhrase.length; k++) {
            let wordToCheck = filterWord(content, idx + k);
            if (keyPhrase[k] === wordToCheck) endIndex = idx + k;
            else {
                endIndex = -1;
                break;
            }
        }
    }
    return endIndex;
}

function getSnippet(content, keyPhrases, startIdx, endIdx) {
    let prevSentencesFound = 0;
    let startSnippetIdx = startIdx;
    for (let i = startIdx - 1; i > 0; i--) {
        // Check for another keyword match
        let endOfKeyIdx = checkWordMatch(content, i, keyPhrases, true);
        if (endOfKeyIdx > -1) {
            i = Math.max(0, endOfKeyIdx - 1);
            prevSentencesFound = 0;
            startSnippetIdx = i;
            continue;
        }

        // Check for end of question
        if (checkWordMatch(content, i, ["hello bashar", "good day"]) !== -1) {
            startSnippetIdx = i;
            break;
        }

        // Check for sentence start
        let wordToCheck = content[i].word.toLowerCase();
        let lastWordChar = wordToCheck[wordToCheck.length - 1];
        if (lastWordChar === "." || lastWordChar === "?" || lastWordChar === "!") {
            prevSentencesFound++;
            startSnippetIdx = i + 1;
            // When the set amount of sentences are found before the key phrase, stop
            if (prevSentencesFound >= 5) break;
        }
    }

    let currentSpeaker = content[endIdx].speaker;
    let nextSentencesFound = 0;
    let endSnippetIdx = endIdx;
    for (let i = endIdx + 1; i < content.length; i++) {
        currentSpeaker = content[i].speaker;
        // Check for another keyword match
        let endOfKeyIdx = checkWordMatch(content, i, keyPhrases);
        if (endOfKeyIdx > -1) {
            i = Math.max(0, endOfKeyIdx + 1);
            nextSentencesFound = 0;
            endSnippetIdx = i;
            continue;
        }

        // Check for end of question
        if (checkWordMatch(content, i, ["good day"]) !== -1) {
            endSnippetIdx = i;
            break;
        }

        // Check for sentence end
        let wordToCheck = content[i].word.toLowerCase();
        let lastWordChar = wordToCheck[wordToCheck.length - 1];
        if (lastWordChar === "." || lastWordChar === "?" || lastWordChar === "!") {
            if (currentSpeaker === "Bashar") nextSentencesFound++;
            endSnippetIdx = i;
            // When the set amount of sentences are found after the key phrase, stop
            if (nextSentencesFound >= 5) break;
        }
    }

    return {startIdx: startSnippetIdx, endIdx: endSnippetIdx}
}

app.listen(3000, () => console.log("Server started..."))