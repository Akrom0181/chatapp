document.addEventListener("DOMContentLoaded", () => {
    const chatList = document.getElementById("chatList");
    const messages = document.getElementById("messages");
    const messageInput = document.getElementById("messageInput");
    const chatArea = document.querySelector(".chat-area");
    const chatHeader = document.getElementById("chatHeader");
    const sidebar = document.querySelector(".sidebar");

    const ws = new WebSocket("ws://localhost:8080"); // WebSocket connection

    // Create new chat room
    window.createRoom = function () {
        const roomInput = document.getElementById("roomInput");
        const roomName = roomInput.value.trim();
        if (!roomName) return;
        
        const chatItem = document.createElement("div");
        chatItem.classList.add("chat-item");
        chatItem.textContent = roomName;
        chatItem.onclick = () => selectChat(roomName);
        chatList.appendChild(chatItem);

        roomInput.value = "";
    };

    // Select chat room
    function selectChat(roomName) {
        chatHeader.textContent = roomName;
        messages.innerHTML = "";
        chatArea.classList.add("active");
        sidebar.style.display = "none";
    }

    // Back button for mobile
    const backButton = document.createElement("button");
    backButton.textContent = "← Back";
    backButton.style.background = "transparent";
    backButton.style.border = "none";
    backButton.style.color = "white";
    backButton.style.fontSize = "1rem";
    backButton.style.cursor = "pointer";
    backButton.style.marginRight = "10px";
    backButton.onclick = () => {
        chatArea.classList.remove("active");
        sidebar.style.display = "flex";
    };
    chatHeader.prepend(backButton);

    // Send message
    window.sendMessage = function () {
        const text = messageInput.value.trim();
        if (!text) return;

        const msgObj = { message: text };
        ws.send(JSON.stringify(msgObj)); // Send to WebSocket

        displayMessage(text, "self"); // Display locally
        messageInput.value = "";
    };

    // Display message in UI
    function displayMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", sender);
        msgDiv.textContent = text;
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // WebSocket message handler
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        displayMessage(data.message, "other");
    };
});
