package main

import (
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn     *websocket.Conn
	username string
	room     string
}

type Message struct {
	Type      string   `json:"type"`
	Username  string   `json:"username"`
	Content   string   `json:"content"`
	Timestamp int64    `json:"timestamp"`
	Room      string   `json:"room"`
	Rooms     []string `json:"rooms,omitempty"`
}

var (
	clients = make(map[*Client]bool)
	mutex   = &sync.Mutex{}
	rooms   = make(map[string]map[*Client]bool)
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		ReadHeaderTimeout: 3 * time.Second,
	}
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", handleConnections)

	log.Println("Server started on :8080")
	log.Fatal(server.ListenAndServe())
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	username := r.URL.Query().Get("username")
	room := r.URL.Query().Get("room")

	mutex.Lock()
	// Check if room already has 2 users
	if len(rooms[room]) >= 2 {
		conn.WriteJSON(Message{Type: "error", Content: "Room is full"})
		mutex.Unlock()
		return
	}

	client := &Client{conn: conn, username: username, room: room}

	// Initialize room if not exists
	if rooms[room] == nil {
		rooms[room] = make(map[*Client]bool)
		broadcastRoomList()
	}

	// Add client to room
	rooms[room][client] = true
	clients[client] = true
	mutex.Unlock()

	sendRoomList(client)

	defer func() {
		mutex.Lock()
		delete(clients, client)
		delete(rooms[room], client)
		if len(rooms[room]) == 0 {
			delete(rooms, room)
			broadcastRoomList()
		}
		mutex.Unlock()
	}()

	for {
		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			break
		}

		msg.Type = "message"
		msg.Username = username
		msg.Timestamp = time.Now().Unix()
		msg.Room = room

		mutex.Lock()
		for client := range rooms[room] {
			if err := client.conn.WriteJSON(msg); err != nil {
				delete(rooms[room], client)
				delete(clients, client)
				client.conn.Close()
			}
		}
		mutex.Unlock()
	}
}

func broadcastRoomList() {
	roomList := getRoomList()
	msg := Message{Type: "roomList", Rooms: roomList}
	for client := range clients {
		client.conn.WriteJSON(msg)
	}
}

func sendRoomList(client *Client) {
	roomList := getRoomList()
	client.conn.WriteJSON(Message{Type: "roomList", Rooms: roomList})
}

func getRoomList() []string {
	var roomList []string
	for room := range rooms {
		roomList = append(roomList, room)
	}
	return roomList
}
