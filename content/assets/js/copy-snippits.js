document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".copy-btn");
    console.log(`Found ${buttons.length} copy buttons`);
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const snippetId = button.getAttribute("data-snippet-id");
        const snippet = document.getElementById(snippetId);
        if (snippet) {
          const textToCopy = snippet.textContent;
          navigator.clipboard.writeText(textToCopy).then(() => {
            // Create a tooltip-like message
            const tooltip = document.createElement("div");
            tooltip.textContent = "Copied!";
            tooltip.style.position = "absolute";
            tooltip.style.top = "-30px"; // Position above the button
            tooltip.style.left = "50%";
            tooltip.style.transform = "translateX(-50%)";
            tooltip.style.backgroundColor = "black";
            tooltip.style.color = "white";
            tooltip.style.padding = "5px 10px";
            tooltip.style.borderRadius = "4px";
            tooltip.style.fontSize = "0.8rem";
            tooltip.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
            tooltip.style.zIndex = "1000";
            tooltip.style.pointerEvents = "none"; // Prevent interaction

            // Append the tooltip to the button
            button.style.position = "relative"; // Ensure the button is the positioning context
            button.appendChild(tooltip);

            // Remove the tooltip after 2 seconds
            setTimeout(() => {
              tooltip.remove();
            }, 2000);
          }).catch((err) => {
            console.error("Failed to copy text: ", err);
          });
        } else {
          console.error(`Snippet with ID ${snippetId} not found`);
        }
      });
    });
  });