// Chat page JavaScript functionality
document.addEventListener('DOMContentLoaded', function () {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    // Chat functionality
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messagesContainer');
    const conversationList = document.getElementById('conversationList');
    const searchInput = document.querySelector('.search input');
    const threadTitle = document.getElementById('thread-title');
    const threadSubtitle = document.getElementById('thread-subtitle');
    const threadHeader = document.querySelector('.thread__head');

    let currentConnectionId = null;
    let messagesPollInterval = null;
    let allConnections = [];

    // Load active connections for conversation list
    async function loadConnections() {
        conversationList.innerHTML = '<li class="conversation conversation--empty"><div class="meta"><div class="preview">Loading chats...</div></div></li>';
        try {
            // Using the endpoint added in previous steps: /connect (list active connections)
            const connections = await window.KN.api.get('/connect');

            if (!Array.isArray(connections) || connections.length === 0) {
                conversationList.innerHTML = '<li class="conversation conversation--empty"><div class="meta"><div class="preview">No active chats found. Connect with users from the Dashboard first.</div></div></li>';
                allConnections = [];
                return;
            }
            allConnections = connections;
            renderConnections(allConnections);
        } catch (error) {
            console.error('[Chat] Error loading connections:', error);
            conversationList.innerHTML = '<li class="conversation conversation--empty"><div class="meta"><div class="preview">Unable to load chats. Please try again later.</div></div></li>';
        }
    }

    function getOtherUser(connection) {
        const currentUser = window.KN.auth.getUser();
        if (!connection || !currentUser) return { name: 'Unknown' };
        // Connection object structure based on backend model
        // sender_id, receiver_id, sender {name...}, receiver {name...}
        return connection.sender_id === currentUser.id ? connection.receiver : connection.sender;
    }

    function renderConnections(connections) {
        conversationList.innerHTML = '';
        connections.forEach(conn => {
            const other = getOtherUser(conn);
            const li = document.createElement('li');
            li.className = 'conversation';
            li.dataset.connectionId = conn.id;

            // Avatar Handling
            let avatarHtml;
            if (other.avatar_url) {
                avatarHtml = `<img src="${other.avatar_url}" alt="${escapeHtml(other.name)}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                const initial = other.name ? other.name[0].toUpperCase() : '?';
                avatarHtml = initial;
            }

            li.innerHTML = `
                <div class="avatar" style="background: ${other.avatar_url ? 'none' : '#ccc'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; overflow: hidden;">
                    ${avatarHtml}
                </div>
                <div class="meta">
                    <div class="row"><span class="name">${escapeHtml(other.name || 'Unknown User')}</span></div>
                    <div class="preview">Tap to chat</div>
                </div>
            `;
            li.addEventListener('click', () => selectConnection(conn));
            conversationList.appendChild(li);
        });
    }

    async function selectConnection(connection) {
        currentConnectionId = connection.id;
        const other = getOtherUser(connection);

        // Update active conversation
        document.querySelectorAll('.conversation').forEach(conv => conv.classList.remove('conversation--active'));
        const selectedConv = document.querySelector(`.conversation[data-connection-id="${connection.id}"]`);
        if (selectedConv) selectedConv.classList.add('conversation--active');

        // Update thread header
        threadTitle.textContent = other.name;
        threadSubtitle.textContent = 'Active Connection';
        // Show header content if hidden
        if (threadHeader) threadHeader.style.visibility = 'visible';

        // Enable message input
        if (chatInput) chatInput.disabled = false;
        if (sendButton) sendButton.disabled = false;

        // Load messages
        await loadMessages(connection.id);

        // Start polling for new messages (every 3 seconds for "live" feel)
        if (messagesPollInterval) clearInterval(messagesPollInterval);
        messagesPollInterval = setInterval(() => loadMessages(connection.id, true), 3000);
    }

    async function loadMessages(connectionId, silent = false) {
        try {
            // Using the endpoint added in previous steps: /messages/connection/{id}
            const messages = await window.KN.api.get(`/messages/connection/${connectionId}`);

            if (!Array.isArray(messages)) return;

            const currentUser = window.KN.auth.getUser();
            if (!currentUser) return;

            // Clear only if not silent (first load)
            if (!silent) {
                messagesContainer.innerHTML = '';
            } else {
                // Check if we already have these messages to avoid redraw/scroll jitter
                // A simple check is counting active messages vs fetched
                const existingCount = messagesContainer.querySelectorAll('.msg').length;
                if (messages.length === existingCount && messages.length > 0) {
                    // Assuming append-only, existing length match means no new messages
                    // (Unless edits/deletes happen, but skipping for simplicity)
                    const lastMsgId = messagesContainer.lastElementChild?.dataset?.messageId;
                    const lastFetchedId = messages[messages.length - 1]?.id;
                    if (String(lastMsgId) === String(lastFetchedId)) return;
                }
            }

            if (messages.length === 0) {
                if (!silent) messagesContainer.innerHTML = '<div class="msg msg--system"><div class="bubble">No messages yet. Say hello!</div></div>';
                return;
            }

            // If silent update, we should only append new ones or re-render if necessary.
            // For simplicity in this legacy script, let's just re-render cleanly if not silent,
            // or smarter append if silent.

            if (silent) {
                // Find messages we don't have yet
                const existingIds = new Set(Array.from(messagesContainer.querySelectorAll('.msg')).map(m => m.dataset.messageId));
                messages.forEach(msg => {
                    if (!existingIds.has(String(msg.id))) {
                        renderMessage(msg, currentUser.id);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                });
            } else {
                // Full render
                messagesContainer.innerHTML = '';
                let lastDate = null;
                messages.forEach(msg => {
                    const msgDate = new Date(msg.timestamp);
                    const dateStr = msgDate.toDateString();

                    if (lastDate !== dateStr) {
                        const divider = document.createElement('div');
                        divider.className = 'date-divider';
                        divider.innerHTML = `<span>${getDateLabel(msgDate)}</span>`;
                        messagesContainer.appendChild(divider);
                        lastDate = dateStr;
                    }

                    renderMessage(msg, currentUser.id);
                });
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

        } catch (error) {
            console.error('[Chat] Error loading messages:', error);
            if (!silent) {
                messagesContainer.innerHTML = '<div class="msg msg--system"><div class="bubble">Unable to load messages. Please try again.</div></div>';
            }
        }
    }

    function renderMessage(msg, currentUserId) {
        const isMe = msg.sender_id === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `msg msg--${isMe ? 'me' : 'peer'}`;
        messageDiv.dataset.messageId = msg.id;

        const timeString = window.KN.util.formatTime(msg.timestamp);

        messageDiv.innerHTML = `
            <div class="bubble">
                ${escapeHtml(msg.content)}
                ${isMe ? `<i class="fas fa-trash delete-btn" onclick="window.deleteChatMessage(${msg.id}, ${currentConnectionId})" title="Delete Message"></i>` : ''}
            </div>
            <span class="time" title="${window.KN.util.formatDate(msg.timestamp)} ${timeString}">${timeString}</span>
        `;

        // Append to container
        messagesContainer.appendChild(messageDiv);
    }

    // Global delete handler for chat page
    window.deleteChatMessage = async function (msgId, connId) {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await window.KN.api.delete(`/messages/${msgId}`);
            alert("Message deleted successfully.");
            // Refresh messages
            if (currentConnectionId) loadMessages(currentConnectionId);
        } catch (e) {
            console.error("Failed to delete message", e);
            alert(`Could not delete message. Error: ${e.message || e}`);
        }
    };

    // Send message functionality
    async function sendMessage() {
        if (!currentConnectionId || !chatInput) return;
        const message = chatInput.value.trim();
        if (!message) return;

        const originalText = sendButton.textContent;
        sendButton.disabled = true;
        sendButton.textContent = '...';

        try {
            // Endpoint: POST /messages/connection/{id}
            await window.KN.api.post(`/messages/connection/${currentConnectionId}`, { content: message });
            chatInput.value = '';

            // Reload messages immediately
            await loadMessages(currentConnectionId, true);
        } catch (error) {
            console.error('[Chat] Error sending message:', error);
            showMessage(error.message || 'Failed to send message.', 'error');
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = originalText;
            chatInput.focus();
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Send button click
    if (sendButton) {
        sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    // Enter key to send
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Form submit
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            if (!allConnections) return;

            const filtered = allConnections.filter(conn => {
                const other = getOtherUser(conn);
                return other.name?.toLowerCase().includes(searchTerm);
            });
            renderConnections(filtered);
        });
    }

    // Initial load
    loadConnections();

    // Cleanup polling on page unload
    window.addEventListener('beforeunload', () => {
        if (messagesPollInterval) clearInterval(messagesPollInterval);
    });

    // Helper for toasts
    function showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) existingMessage.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.background = type === 'error' ? '#ff4d4f' : '#1890ff';
        messageEl.style.color = 'white';
        messageEl.style.zIndex = '1000';

        messageEl.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(messageEl);

        setTimeout(() => messageEl.remove(), 4000);
    }

    // Video Call Button Logic
    const videoCallBtn = document.querySelector('.icon-btn[aria-label="Start call"]');
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', () => {
            if (currentConnectionId) {
                window.location.href = `/pages/kn_meeting.html?connectionId=${currentConnectionId}`;
            } else {
                showMessage('Please select a chat first.', 'info');
            }
        });
    }

    function getDateLabel(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        }
    }

});
