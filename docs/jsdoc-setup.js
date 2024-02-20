window.addEventListener("load", function reorderCss() {
	// Move css tags to bottom so they override defaults
	let cssTags = document.getElementsByTagName("link");
	for (let i = 0; i < cssTags.length - 1; ++i) {
		let tag = cssTags[i];
		if (tag.href.includes("css")) {
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
});
