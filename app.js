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
	let results = await scrape(req.body.keyword);
	res.send(results);
})

app.listen(3000, () => {
	console.log("server started");
})

async function scrape(keyword) {
	const response = await fetch("https://basharstore.com/2015");
	const text = await response.text();
	const dom = await new JSDOM(text);

	let links = [];
	dom.window.document.querySelectorAll(".sf-menu li")[1].querySelectorAll("ul li ul li ul a").forEach(a => {links.push(a.getAttribute("href"))});
	// Await for this promise before proceeding and returning
	let results = await function() {
		return new Promise((resolve, reject) => {
			let results = [];
			links.forEach(async (link, i, res) => { // For every link, get html, convert to text and create new DOM with it
				let linkRes = await fetch(link);
				let linkText = await linkRes.text();
				let linkDom = await new JSDOM(linkText);

				let content = linkDom.window.document.querySelector(".main").textContent;
				
				if (content.includes(keyword)) {
					results.push({link: link, snippets: []});

					let keyIndexes = [];
					let keyIndex = 0;
					// Keep pushing the returned keyword index and searching for next as long we dont get -1 (keyword not found)
					do {
						keyIndexes.push(keyIndex);
						keyIndex = content.indexOf(keyword, keyIndexes[keyIndexes.length - 1] + keyword.length);
					}
					while (keyIndex > -1)
					keyIndexes.shift(); // Remove the zero at the beginning. This was only used to start the loop

					keyIndexes.forEach(i => {
						let val = i;
						let endIndex = getSnippetEndIndex(content, val); // Get index of the end of question containing keyword

						let reverse = content.split("").reverse().join(""); // Reverse the text to get the start index of question
						val = content.length - val - keyword.length;
						let startIndex = content.length - getSnippetEndIndex(reverse, val); // Subtracting actually gives the start index

						let sub = content.substring(startIndex, endIndex + 1); // Add the question snippet to the array
						results[results.length - 1].snippets.push(sub);
					})
				}
				if (i === res.length - 1) resolve(results); // Resolve the promise to proceed and return the results
			})
		})
	}();
	return results;
}

function getSnippetEndIndex(content, keyIndex) {
	let endIndexes = [];
	// Search for indexes of these characters, starting from the keyword position
	let periodIndex = content.indexOf(".", keyIndex);
	let questionIndex = content.indexOf("?", keyIndex);
	let dotIndex = content.indexOf("•", keyIndex);

	// If the character was found, add it to the array
	if (periodIndex > -1) endIndexes.push(periodIndex);
	if (questionIndex > -1) endIndexes.push(questionIndex);
	if (dotIndex > -1) endIndexes.push(dotIndex);

	// Sort the indexes and return the smallest one (first character found)
	return endIndexes.sort((a, b) => a - b )[0];
}