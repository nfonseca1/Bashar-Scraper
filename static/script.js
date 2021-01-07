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
    
    ReactDOM.render(<ResultList data={data} />, list);
})