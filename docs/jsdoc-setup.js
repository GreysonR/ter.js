window.addEventListener("load", function reorderCss() {
	// Move css tags to bottom so they override defaults
	let cssTags = document.getElementsByTagName("link");
	for (let i = 0; i < cssTags.length - 1; ++i) {
		let tag = cssTags[i];
		if (tag.href.includes("css") && !tag.href.includes("styles/clean-jsdoc-theme.min.css")) {
			tag.parentNode.removeChild(tag);
			document.body.appendChild(tag);
		}
	}

	// Set current section to active in sidebar
	let sectionTitle = document.getElementsByTagName("header")[0].children[0].innerText;
	let sidebarSectionChildren = document.getElementsByClassName("sidebar-section-children");
	for (let child of sidebarSectionChildren) {
		if (child.innerText === sectionTitle) {
			child.classList.add("active");
		}
	}

	if (window.location.href.includes("tutorial")) return;

	// Remove extra type annotations
	let article = document.querySelector("article");
	for (let child of article.children) {
		if (child.className != "member-item-container flex") continue;
		if (child.children.length < 2) continue;
		if (child.children[0].innerHTML != "Type:") continue;

		child.style.display = "none";
	}

	// Group together elements for the same property
	function groupElements(titleElement) {
		let curElement = titleElement.nextElementSibling;
		let curGroup;
		while (curElement) {
			let nextSibling = curElement.nextElementSibling;

			if (curElement.classList.contains("name") && curElement.classList.contains("has-anchor")) {
				curGroup = document.createElement("div");
				curGroup.classList.add("propertyGroup");
				curElement.parentElement.insertBefore(curGroup, curElement);

				curElement.parentElement.removeChild(curElement);
				curGroup.appendChild(curElement);
			}
			if (!curElement.classList.contains("has-anchor")) {
				curElement.parentElement.removeChild(curElement);
				curGroup.appendChild(curElement);
			}
			
			curElement = nextSibling;
		}
	}
	let title = article.querySelector("#members");
	if (!title) title = article.querySelector("#methods");
	groupElements(title);
});
