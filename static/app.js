const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
let ws;
let currentRoom;
let username = prompt("Enter your username:") || "Anonymous";

function connectToRoom(room) {
    if (ws) ws.close();
    
    currentRoom = room;
    document.getElementById('chatHeader').textContent = room;
    document.getElementById('messages').innerHTML = '';
    
    ws = new WebSocket(`${protocol}${window.location.host}/ws?username=${
        encodeURIComponent(username)}&room=${encodeURIComponent(room)}`);
    
    ws.onmessage = function(event) {
        const msg = JSON.parse(event.data);
        if (msg.type === 'roomList') {
            updateRoomList(msg.rooms);
        } else if (msg.type === 'message') {
            addMessage(msg);
        }
    };

    ws.onerror = function(error) {
        console.error('WebSocket Error:', error);
        alert('Connection error - please refresh the page');
    };

    ws.onclose = function() {
        console.log('WebSocket connection closed');
    };
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = msg.username === username ? 'message self' : 'message';
    
    const date = new Date(msg.timestamp * 1000);
    div.innerHTML = `
        <div class="message-sender">${msg.username}</div>
        <div class="message-content">${msg.content}</div>
        <div class="message-time">${date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
        })}</div>
    `;
    
    const messages = document.getElementById('messages');
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function updateRoomList(rooms) {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'chat-item' + (room === currentRoom ? ' active' : '');
        div.textContent = room;
        div.setAttribute('data-room', room);
        div.onclick = () => {
            if (room !== currentRoom) {
                connectToRoom(room);
            }
        };
        chatList.appendChild(div);
    });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ content: message }));
        input.value = '';
    }
}

function createRoom() {
    const roomInput = document.getElementById('roomInput');
    const room = roomInput.value.trim();
    
    if (room && !document.querySelector(`.chat-item[data-room="${room}"]`)) {
        connectToRoom(room);
        roomInput.value = '';
    }
}

// Initial connection
connectToRoom('general');

// Event listeners
document.getElementById('messageInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
});