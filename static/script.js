const error = document.querySelector(".error");
const input = document.querySelector("input");
const button = document.querySelector("button");
const list = document.querySelector(".list");

document.querySelector("button").addEventListener("click", async () => {
	
	if (input.value == "") {
		error.style.visibility = "visible";
		return;
	}
	error.style.visibility = "hidden";

	let response = await fetch("/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({keywords: input.value.split(", ")})
	})
	let data = await response.json();

	for (let i = 0; i < data.length; i++) {
        if (data[i].content.length === 0) continue;
		let div = document.createElement("div");
        div.innerHTML += `<h1>${data[i].eventName}</h1>`;
        for (let snippet of data[i].content) {
            div.innerHTML += `<br><h3>${snippet[0].speaker} - ${snippet[0].time}</h3>`;
            let lastSpeaker = snippet[0].speaker;
            let html = `<p>`;
		    for (let w = 0; w < snippet.length; w++) {
                if (snippet[w].speaker !== lastSpeaker) {
                    html += `</p><h4>${snippet[w].speaker}</h4><p>`;
                    lastSpeaker = snippet[w].speaker;
                }
                html += snippet[w].word + ' ';
            }
            html += `</p>`;
            div.innerHTML += html;
        }
		list.appendChild(div);
	}
})