const express = require("express");
const app = express();

app.set('views', __dirname);
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname));

const fetch = require("isomorphic-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

app.get("/", (req, res) => {
	res.render("index.html");
})

app.post("/", async (req, res) => {
	let searchTerm = req.body.keyword.toLowerCase();
	let links = await getEventLinks();
	
	let results = [];
	// Wait for all link fetch promises to resolve
	await Promise.all(links.map(getLinkContent))
	.then((contents) => contents.forEach((pageContent, i) => {
		let indexes = getKeywordIndexes(pageContent, searchTerm);
		if (indexes.length > 1) {
			let snippets = indexes.map(index => getKeywordSnippet(pageContent, searchTerm, index));
			results.push({link: links[i], snippets});
		}
	}))
	res.send(results);
})

app.listen(process.env.PORT || 3000, process.env.IP, () => {
	console.log("server started");
})

let getEventLinks = () => new Promise(async (resolve) => {
	const response = await fetch("https://basharstore.com/2015");
	const text = await response.text();
	const dom = await new JSDOM(text);

	let aTags = dom.window.document.querySelectorAll(".sf-menu li")[1].querySelectorAll("ul li ul li ul a");
	resolve(Array.from(aTags).map(a => a.getAttribute("href")));
})

let getLinkContent = (link) => new Promise(async (resolve) => {
	let response = await fetch(link);
	let text = await response.text();
	let dom = await new JSDOM(text);

	resolve(dom.window.document.querySelector(".main").textContent);
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
