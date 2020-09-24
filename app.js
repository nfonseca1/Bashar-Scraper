// Express Setup
const express = require("express");
const app = express();
app.set('views', __dirname);
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname));

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

const BullQueue = require("bull");
let scrapeQueue = new BullQueue("Scraping", process.env.REDIS_URL 
								|| `redis://localhost:6379`);
scrapeQueue.process(async (job) => {
	return await processQueue(job.data);
});

scrapeQueue.on("completed", (job, result) => {
	console.log("Job completed!");
	let sessionKey = 'sess:' + job.data.sessionId;
	redisClient.get(sessionKey, (err, val) => {
		let jsonSession = JSON.parse(val);
		jsonSession.results = result;
		jsonSession.searchFinished = true;
		redisClient.set(sessionKey, JSON.stringify(jsonSession));
		console.log("SAVING: " + Date.now());
	});
})

app.get("/", (req, res) => {
	res.render("index.html");
})

app.post("/", async (req, res) => {
	req.session.searchFinished = false;
	req.session.results = null;
	let searchTerm = req.body.keyword.toLowerCase();

	await scrapeQueue.add({searchTerm, sessionId: req.sessionID});
	res.sendStatus(200);
})

app.get("/status", (req, res) => {
	console.log("RELOADING: " + Date.now());
	req.session.reload(() => {
		let obj = {
			results: req.session.results,
			searchFinished: req.session.searchFinished
		}
		res.send(obj);
	})
})

app.listen(process.env.PORT || 3000, () => {
	console.log("server started");
})


async function processQueue(data) {
	let links = await getEventLinks();
	
	let results = [];
	// Wait for all link fetch promises to resolve
	await Promise.all(links.map(getLinkContent))
	.then((contents) => {
		contents.forEach((pageContent, i) => {
			let indexes = getKeywordIndexes(pageContent, data.searchTerm);
			if (indexes.length > 1) {
				let snippets = indexes.map(index => getKeywordSnippet(pageContent, data.searchTerm, index));
				results.push({link: links[i], snippets});
			}
		})
	})
	return results;
}

let getEventLinks = () => new Promise(async (resolve) => {
	const response = await fetch("https://basharstore.com/");
	const text = await response.text();
	const dom = await new JSDOM(text);

	let aTags = dom.window.document.querySelectorAll(".sf-menu li")[1].querySelectorAll("ul li ul li ul a");
	resolve(Array.from(aTags).map(a => a.getAttribute("href")));
})

let getLinkContent = (link) => new Promise(async (resolve) => {
	let response = await fetch(link);
	let text = await response.text();
	let dom = await new JSDOM(text);

	let main = dom.window.document.querySelector(".main")?.textContent;
	if (main === undefined) console.error("Main content couldn't be retrieved for: " + link);
	resolve(main);
})

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
