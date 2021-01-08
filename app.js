const fs = require("fs");
// Express Setup
const express = require("express");
const app = express();
app.set('views', __dirname);
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname + "/static/"));

// Other Dependencies
const fetch = require("isomorphic-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const session = require("express-session");
const redis = require("redis");
const redisClient = redis.createClient(process.env.REDIS_URL 
										|| `redis://localhost:6379`);
const RedisStore = require("connect-redis")(session);
app.use(session({
	secret: "It's a secret!",
	store: new RedisStore({client: redisClient}),
	saveUninitialized: false,
	resave: false
}))

// BULL SETUP
const BullQueue = require("bull");
let scrapeQueue = new BullQueue("Scraping", process.env.REDIS_URL 
								|| `redis://localhost:6379`);
scrapeQueue.process(async (job) => {
	return processQueue(job);
});

scrapeQueue.on("completed", (job, result) => {
	console.log("Job Completed!");
	let sessionKey = 'sess:' + job.data.sessionId;
	redisClient.get(sessionKey, (err, val) => {
		let jsonSession = JSON.parse(val);
		jsonSession.results = result;
		jsonSession.searchFinished = true;
		redisClient.set(sessionKey, JSON.stringify(jsonSession));
		console.log("SAVING: " + Date.now());
	});
})
scrapeQueue.on("progress", (job, progress) => {
	if (progress >= 100) return;
	let sessionKey = 'sess:' + job.data.sessionId;
	redisClient.get(sessionKey, (err, val) => {
		let jsonSession = JSON.parse(val);
		jsonSession.progress = progress;
		redisClient.set(sessionKey, JSON.stringify(jsonSession));
	});
})

// Data
let {checkWordMatch, getSnippet} = require("./lib/searchHelpers.js");
let eventDataRaw = fs.readFileSync("./newEventData.json", {encoding: "utf-8"});
let eventData = JSON.parse(eventDataRaw);

app.get("/search", (req, res) => {
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

app.get("/", (req, res) => {
	res.render("index.html");
})

app.post("/", async (req, res) => {
	req.session.searchFinished = false;
	req.session.results = null;
	req.session.progress = 0;
	let searchTerm = req.body.keyword.toLowerCase();

	await scrapeQueue.add({searchTerm, sessionId: req.sessionID});
	res.sendStatus(200);
})

app.get("/status", (req, res) => {
	req.session.reload(() => {
		let obj = {
			results: req.session.results,
			searchFinished: req.session.searchFinished,
			progress: req.session.progress ?? 0
		}
		res.send(obj);
	})
})

app.listen(process.env.PORT || 3000, () => {
	console.log("server started");
})


async function processQueue(job) {
	let links = await getEventLinks();
	console.log("Job Processing");
	let results = [];
	// Wait for all link fetch promises to resolve
	let linkPromises = links.map(getLinkContent);
	await Promise.all(linkPromises)
	.then(async (texts) => {
		let mains = [];
		for (text of texts) {
			let mainContent = getMainContent(text);
			if (mainContent) mains.push(mainContent);
			job.progress((100 / texts.length) * mains.length);
			await new Promise(resolve => setTimeout(() => resolve(), 0));
		}
		return mains;
	})
	.then((contents) => {
		contents.forEach((pageContent, i) => {
			let indexes = getKeywordIndexes(pageContent, job.data.searchTerm);
			if (indexes.length >= 1) {
				let snippets = indexes.map(index => getKeywordSnippet(pageContent, job.data.searchTerm, index));
				results.push({link: links[i], snippets});
			}
		})
	})
	return results;
}

let getEventLinks = async () => {
	const response = await fetch("https://basharstore.com/");
	const text = await response.text();
	const dom = await new JSDOM(text);

	let aTags = dom.window.document.querySelectorAll(".sf-menu li")[1].querySelectorAll("ul li ul li ul a");
	return Array.from(aTags).map(a => a.getAttribute("href"));
}

let getLinkContent = async (link) => {
	let response = await fetch(link);
	let text = await response.text();
	return text;
}

let getMainContent = (text) => {
	let dom = new JSDOM(text);
	let main = dom.window.document.querySelector(".main")?.textContent;
	return main;
}

let getKeywordIndexes = (content, keyword)  => {
	let lowerCaseContent = content.toLowerCase();
	let keywordIndexes = [];
	
	if (lowerCaseContent.includes(keyword)) {
		let lastKeywordIndex = 0;
		// Generate an array of all indexes where the keyword is found in the content, until no more are found
		do {
			keywordIndexes.push(lastKeywordIndex);
			lastKeywordIndex = lowerCaseContent.indexOf(keyword, lastKeywordIndex + keyword.length);
		}
		while (lastKeywordIndex > -1)
		// Remove the zero at the beginning. This was only used to start the loop
		keywordIndexes.shift(); 
	}
	return keywordIndexes;
}

let getKeywordSnippet = (content, keyword, index) => {
	let lowerCaseContent = content.toLowerCase();
	let endIndex = getSnippetEndIndex(lowerCaseContent, index);
	// Reverse the text to get the start index of question (snippet)
	let reverse = lowerCaseContent.split("").reverse().join(""); 
	let reversedIndex = content.length - index - keyword.length;
	// Subtracting from end index gives the start index (Since it's been reversed)
	let startIndex = content.length - getSnippetEndIndex(reverse, reversedIndex); 

	return content.substring(startIndex, endIndex + 1);
}

function getSnippetEndIndex(content, keywordIndex) {
	let endIndexes = [];
	// Search for indexes of these characters, starting from the keyword position
	let periodIndex = content.indexOf(".", keywordIndex);
	let questionIndex = content.indexOf("?", keywordIndex);
	let dotIndex = content.indexOf("•", keywordIndex);
	let colonIndex = content.indexOf(":", keywordIndex);
	let exclamationIndex = content.indexOf("!", keywordIndex);

	// If the character was found, add it to the array
	if (periodIndex > -1) endIndexes.push(periodIndex);
	if (questionIndex > -1) endIndexes.push(questionIndex);
	if (dotIndex > -1) endIndexes.push(dotIndex);
	if (colonIndex > -1) endIndexes.push(colonIndex);
	if (exclamationIndex > -1) endIndexes.push(exclamationIndex);

	// Sort the indexes and return the smallest one (first character found)
	return endIndexes.sort((a, b) => a - b )[0];
}
