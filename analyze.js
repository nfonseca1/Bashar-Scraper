const fs = require("fs");
const express = require("express");
const app = express();

let transcriptFiles = fs.readdirSync("./transcripts/", {encoding: "utf-8"});
let eventData = [];

for (let transcript of transcriptFiles) {
    let jsonFile = fs.readFileSync("./transcripts/" + transcript, {encoding: "utf-8"});
    let transcription = JSON.parse(jsonFile);
    
    let dashSplit = transcription.jobName.split("-");
    if (dashSplit[0] === "Bashar") dashSplit = dashSplit.slice(1);
    let underSplit = dashSplit.join(" ").split("_");
    if (underSplit[0] === "Bashar") underSplit = underSplit.slice(1);
    let name = underSplit.join(" ");
    console.log(name);

    let transcriptContent = formatTranscription(transcription);
    if (name[name.length-1] == 2 || name[name.length-1] == 3 || name[name.length-1] == 4) {
        for (let i = 0; i < eventData.length; i++) {
            if (eventData[i].evantName == name.slice(0, name.length - 1)) {
                eventData[i].data.push(...transcriptContent);
                break;
            }
        }
    }
    else {
        eventData.push({eventName: name})
        eventData[eventData.length-1].data = transcriptContent;
    }

}
fs.writeFileSync("./eventData.json", JSON.stringify(eventData, null, '\t'));

function formatTranscription(transcription) {
    let orderedText = [];

    for (let segment of transcription.results.speaker_labels.segments) {
        let start = parseFloat(segment.start_time);
        let end = parseFloat(segment.end_time);
        let speaker = segment.speaker_label === 'spk_0' ? 'Bashar' : 'Questioneer';

        let time = (Math.round((start / 60)*100) / 100).toString();
        let min = time.split(".")[0];
        let sec = Math.round((time.split(".")[1] * .6)*100) / 100;

        if (orderedText[orderedText.length - 1]?.speaker !== speaker) {
            orderedText.push({time: `${min}m ${sec}s`, content: [], speaker: speaker});
        }

        let items = transcription.results.items;
        for (let i = 0; i < items.length; i++) {
            let content = items[i].alternatives[0].content;
            let wordTimeStr = items[i].start_time;
            let wordTime = parseFloat(wordTimeStr);

            if (parseFloat(items[i].start_time) >= start && parseFloat(items[i].end_time) <= end) {

                orderedText[orderedText.length - 1].content.push({word: content, time: wordTime});

                if (i < items.length - 1 && items[i + 1].start_time === undefined) {
                    let content = orderedText[orderedText.length - 1].content;
                    let punctuation = items[i + 1].alternatives[0].content;
                    content[content.length - 1].word += punctuation;
                    if (punctuation === "." || punctuation === "?" || punctuation === "!") {
                        orderedText[orderedText.length - 1].content.push({word: "\n"});
                    }
                }
            }
        }
    }
    return orderedText;
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/analyze.html");
})

app.get("/transcription", (req, res) => {
    console.log(eventData);
    res.send(orderedText);
})

app.listen(3000, () => console.log("server started"));