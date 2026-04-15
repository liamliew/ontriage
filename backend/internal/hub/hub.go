package hub

import (
	"sync"
	"github.com/gofiber/websocket/v2"
)

type Hub struct {
	clients map[string][]*websocket.Conn
	mu      sync.RWMutex
}

func New() *Hub {
	return &Hub{
		clients: make(map[string][]*websocket.Conn),
	}
}

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func (h *Hub) Register(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[userID] = append(h.clients[userID], conn)
}

func (h *Hub) Unregister(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	conns := h.clients[userID]
	for i, c := range conns {
		if c == conn {
			h.clients[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}
}

func (h *Hub) SendToUser(userID string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	conns := h.clients[userID]
	for _, c := range conns {
		// Ignore error, if write fails, connection might be dead, Unregister will handle it soon
		_ = c.WriteJSON(event)
	}
}