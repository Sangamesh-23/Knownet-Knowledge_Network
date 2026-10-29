// Skills page JavaScript functionality
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.KN) {
        console.error('KN API helpers are not loaded. Please include kn_api.js before this script.');
        return;
    }

    if (!window.KN.auth.requireAuth()) {
        return;
    }

    const elements = {
        categories: document.getElementById('category-list'),
        communityList: document.getElementById('community-list'),
        skillsGrid: document.getElementById('skills-grid'),
        discussionsList: document.getElementById('discussions-list'),
        searchInput: document.getElementById('skill-search'),
        addSkillBtn: document.getElementById('add-skill-btn'),
        createCommunityBtn: document.getElementById('create-community-btn'),
    };
            
    const state = {
        sessions: [],
        userSkills: [],
        joinedSessionIds: new Set(),
        filteredSessions: [],
        filteredSkills: [],
        activeCategory: 'all',
        searchTerm: '',
        user: window.KN.auth.getUser?.() || null,
    };

    init();

    async function init() {
        bindSearch();
        bindAddSkill();
        bindCreateCommunity();
        await hydrateUser();
        await Promise.all([loadSessions(), loadUserSkills()]);
    }

    async function hydrateUser() {
        try {
            state.user = await window.KN.auth.refreshProfile();
        } catch (error) {
            console.warn('[Skills] Unable to refresh profile', error);
            state.user = window.KN.auth.getUser();
        }
    }

    async function loadSessions() {
        setSkillsGridStatus('Loading sessions...', 'status--loading');
        try {
            const sessions = await window.KN.api.get('/sessions/', { auth: false });
            state.sessions = Array.isArray(sessions) ? sessions : [];
            
            // Track which sessions user has joined
            if (state.user && state.user.id) {
                state.sessions.forEach(session => {
                    if (session.created_by === state.user.id) {
                        state.joinedSessionIds.add(session.id);
                    }
                });
                // Try to fetch attendance for sessions user joined
                await loadJoinedSessions();
            }
            
            buildCategories();
            applyFilters();
            renderCommunities(state.sessions);
            renderDiscussions(state.sessions);
        } catch (error) {
            console.error('[Skills] Failed to load sessions', error);
            setSkillsGridStatus(error.message || 'Unable to load sessions from the backend.', 'status--error');
            renderCommunities([]);
            renderDiscussions([]);
        }
    }

    async function loadJoinedSessions() {
        // Check attendance for each session to see if user joined
        // Note: This is a limitation - we'd need a user-specific endpoint for efficiency
        // For now, we check sessions user created (they're automatically "joined")
        if (!state.user || !state.user.id) return;
        
        state.sessions.forEach(session => {
            if (session.created_by === state.user.id) {
                state.joinedSessionIds.add(session.id);
            }
        });
    }

    async function loadUserSkills() {
        if (!state.user) return;
        try {
            const skills = await window.KN.api.get('/profile/skills');
            state.userSkills = Array.isArray(skills) ? skills : [];
            renderUserSkills();
            applyFilters();
        } catch (error) {
            console.error('[Skills] Failed to load user skills', error);
        }
    }

    function renderUserSkills() {
        if (!elements.skillsGrid) return;
        // Skills are shown alongside sessions, so we'll integrate them in applyFilters
    }

    function bindSearch() {
        if (!elements.searchInput) return;
        elements.searchInput.addEventListener('input', (event) => {
            state.searchTerm = event.target.value.toLowerCase();
            applyFilters();
        });
    }

    function bindAddSkill() {
        if (!elements.addSkillBtn) return;
        elements.addSkillBtn.addEventListener('click', async () => {
            const name = prompt('Enter a skill to add:');
            if (!name || !name.trim()) {
                return;
            }
            
            const levelInput = prompt('Optional proficiency (e.g., Beginner, Expert):');
            const level = levelInput && levelInput.trim().length >= 2 ? levelInput.trim() : null;
            
            const payload = { name: name.trim() };
            if (level && level.length >= 2) {
                payload.level = level;
            }
            
            try {
                const newSkill = await window.KN.api.post('/profile/skills', payload);
                state.userSkills.push(newSkill);
                showMessage(`Skill "${name.trim()}" added!`, 'success');
                
                // Switch to "My Skills" view if not already there
                if (state.activeCategory !== 'my-skills') {
                    state.activeCategory = 'my-skills';
                    buildCategories();
                }
                applyFilters();
            } catch (error) {
                console.error('[Skills] Failed to add skill', error);
                showMessage(error.message || 'Unable to add skill.', 'error');
            }
        });
    }

    function bindCreateCommunity() {
        if (!elements.createCommunityBtn) return;
        elements.createCommunityBtn.addEventListener('click', () => {
            window.location.href = '/pages/kn_dashboard.html';
        });
    }

    function buildCategories() {
        const categories = new Map();
        categories.set('all', { label: 'All Skills', icon: 'fas fa-th' });
        categories.set('my-skills', { label: 'My Skills', icon: 'fas fa-user-check' });
        
        // Add categories from sessions
        state.sessions.forEach((session) => {
            const category = categorizeSession(session);
            if (!categories.has(category.key)) {
                categories.set(category.key, category);
            }
        });
        
        renderCategories([...categories.values()]);
    }

    function categorizeSession(session) {
        const title = session.title?.toLowerCase() || '';
        const description = session.description?.toLowerCase() || '';
        const text = `${title} ${description}`;
        if (/\bdesign|ux|ui|figma|illustrator\b/.test(text)) {
            return { key: 'design', label: 'Design', icon: 'fas fa-palette' };
        }
        if (/\bdata|analysis|analytics|ai|ml|python|sql\b/.test(text)) {
            return { key: 'data', label: 'Data & AI', icon: 'fas fa-database' };
        }
        if (/\bhealth|fitness|yoga|wellness\b/.test(text)) {
            return { key: 'health', label: 'Health & Fitness', icon: 'fas fa-heartbeat' };
        }
        if (/\bmusic|art|creative|photography\b/.test(text)) {
            return { key: 'arts', label: 'Arts & Music', icon: 'fas fa-music' };
    }
        if (/\bbusiness|marketing|sales|startup\b/.test(text)) {
            return { key: 'business', label: 'Business', icon: 'fas fa-briefcase' };
        }
        return { key: 'tech', label: 'Technology', icon: 'fas fa-laptop-code' };
    }

    function renderCategories(categories) {
        if (!elements.categories) return;
        elements.categories.innerHTML = '';
        categories.forEach((category) => {
            const button = document.createElement('button');
            button.className = 'category-item';
            if (category.key === state.activeCategory) {
                button.classList.add('active');
            }
            button.dataset.category = category.key;
            button.innerHTML = `
                <i class="${category.icon}"></i>
                ${category.label}
            `;
            button.addEventListener('click', () => {
                state.activeCategory = category.key;
                renderCategories(categories);
                applyFilters();
            });
            elements.categories.appendChild(button);
        });
    }

    function applyFilters() {
        if (state.activeCategory === 'my-skills') {
            // Show user's personal skills
            const filtered = state.userSkills.filter((skill) => {
                if (!state.searchTerm) return true;
                const search = state.searchTerm.toLowerCase();
                return skill.name?.toLowerCase().includes(search) ||
                       skill.level?.toLowerCase().includes(search);
        });
            state.filteredSkills = filtered;
            renderUserSkillsList(filtered);
        } else {
            // Show sessions
            const filtered = state.sessions.filter((session) => {
                const categoryMatch =
                    state.activeCategory === 'all' ||
                    categorizeSession(session).key === state.activeCategory;
                const searchMatch =
                    !state.searchTerm ||
                    session.title?.toLowerCase().includes(state.searchTerm) ||
                    session.description?.toLowerCase().includes(state.searchTerm) ||
                    session.location?.toLowerCase().includes(state.searchTerm);
                return categoryMatch && searchMatch;
            });
            state.filteredSessions = filtered;
            renderSkills(filtered);
        }
    }

    function renderSkills(sessions) {
        if (!elements.skillsGrid) return;
        elements.skillsGrid.innerHTML = '';
        if (!sessions.length) {
            setSkillsGridStatus('No sessions match this filter yet. Try a different category or create one from the dashboard.', 'status--muted');
            return;
        }
        sessions.forEach((session) => {
            elements.skillsGrid.appendChild(createSkillCard(session));
        });
    }

    function renderUserSkillsList(skills) {
        if (!elements.skillsGrid) return;
        elements.skillsGrid.innerHTML = '';
        if (!skills.length) {
            elements.skillsGrid.innerHTML = `
                <div class="status status--muted" style="grid-column: 1 / -1;">
                    <p>You haven't added any skills yet.</p>
                    <button class="btn btn--primary" style="margin-top: 1rem;" onclick="document.getElementById('add-skill-btn')?.click()">
                        <i class="fas fa-plus"></i> Add Your First Skill
                    </button>
                </div>
            `;
            return;
        }
        skills.forEach((skill) => {
            elements.skillsGrid.appendChild(createUserSkillCard(skill));
        });
    }

    function createUserSkillCard(skill) {
        const article = document.createElement('article');
        article.className = 'skill-card';
        article.dataset.skillId = skill.id;
        const levelBadge = skill.level ? `<span class="skill-level">${escapeHtml(skill.level)}</span>` : '';
        article.innerHTML = `
            <div class="skill-header">
                <div class="skill-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="skill-info">
                    <h3>${escapeHtml(skill.name)}</h3>
                    ${levelBadge}
                    <p class="skill-description">Your personal skill</p>
                </div>
            </div>
            <div class="skill-actions">
                <button class="btn btn--secondary" data-action="remove-skill" data-skill-id="${skill.id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        article.querySelector('[data-action="remove-skill"]').addEventListener('click', (event) =>
            handleRemoveSkill(event.currentTarget, skill),
        );
        return article;
    }

    async function handleRemoveSkill(button, skill) {
        if (!confirm(`Remove skill "${skill.name}"?`)) return;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
        try {
            await window.KN.api.delete(`/profile/skills/${skill.id}`);
            state.userSkills = state.userSkills.filter(s => s.id !== skill.id);
            applyFilters();
            showMessage(`Skill "${skill.name}" removed`, 'success');
        } catch (error) {
            console.error('[Skills] Failed to remove skill', error);
            showMessage(error.message || 'Unable to remove skill.', 'error');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-trash"></i> Remove';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setSkillsGridStatus(message, modifier = '') {
        if (!elements.skillsGrid) return;
        elements.skillsGrid.innerHTML = `<p class="status ${modifier}">${message}</p>`;
    }

    function createSkillCard(session) {
        const article = document.createElement('article');
        article.className = 'skill-card';
        article.dataset.category = categorizeSession(session).key;
        const dateLabel = formatDate(session);
        const memberCount = 25 + ((session.id || 1) % 50);
        const isJoined = state.joinedSessionIds.has(session.id);
        const isOwner = session.created_by === state.user?.id;
        
        article.innerHTML = `
            <div class="skill-header">
                <div class="skill-icon">
                    <i class="${categorizeSession(session).icon}"></i>
                </div>
                <div class="skill-info">
                    <h3>${escapeHtml(session.title)}</h3>
                    <p>${escapeHtml(session.description || 'Live learning session')}</p>
                    <div class="skill-stats">
                        <span><i class="fas fa-users"></i> ${memberCount} members</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(session.location || 'Remote')}</span>
                    </div>
                </div>
            </div>
            <div class="skill-actions">
                ${isJoined || isOwner
                    ? `<button class="btn btn--success" disabled><i class="fas fa-check"></i> ${isOwner ? 'Owned' : 'Joined'}</button>`
                    : `<button class="btn btn--primary" data-action="join" data-session-id="${session.id}"><i class="fas fa-users"></i> Join Community</button>`
                }
                <button class="btn btn--secondary" data-action="resources" data-session-id="${session.id}">
                    <i class="fas fa-book"></i> View Resources
                </button>
            </div>
            <div class="skill-footer">
                <span><i class="fas fa-calendar"></i> ${escapeHtml(dateLabel)}</span>
            </div>
        `;
        
        const joinBtn = article.querySelector('[data-action="join"]');
        if (joinBtn) {
            joinBtn.addEventListener('click', (event) =>
                handleJoinSession(event.currentTarget, session),
            );
        }
        
        article.querySelector('[data-action="resources"]').addEventListener('click', () => {
            window.location.href = `/pages/kn_chat.html?sessionId=${session.id}`;
        });
        
        return article;
    }

    async function handleJoinSession(button, session) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
        try {
            await window.KN.api.post(`/sessions/${session.id}/join`);
            state.joinedSessionIds.add(session.id);
            
            // Update button in the card
            button.innerHTML = '<i class="fas fa-check"></i> Joined';
            button.classList.remove('btn--primary');
            button.classList.add('btn--success');
            button.disabled = true;
            
            showMessage(`You joined ${escapeHtml(session.title)}`, 'success');
            if (elements.communityList) {
                renderCommunities(state.sessions, true);
        }
        } catch (error) {
            console.error('[Skills] Failed to join session', error);
            showMessage(error.message || 'Unable to join this session.', 'error');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-users"></i> Join Community';
        }
    }

    function renderCommunities(sessions, forceRefresh = false) {
        if (!elements.communityList) return;
        if (!state.user) {
            elements.communityList.innerHTML = '<p class="status status--muted">Sign in to manage your communities.</p>';
            return;
        }
        
        // Show sessions user has joined (created or explicitly joined)
        const joinedSessions = sessions.filter((session) => 
            state.joinedSessionIds.has(session.id) || session.created_by === state.user.id
        );
        
        if (!joinedSessions.length && !forceRefresh) {
            elements.communityList.innerHTML = `
                <p class="status status--muted">
                    You haven't joined any communities yet. Join a session to get started.
                </p>
            `;
            return;
        }
        
        elements.communityList.innerHTML = '';
        joinedSessions.forEach((session) => {
            const item = document.createElement('div');
            item.className = 'community-item';
            const isOwner = session.created_by === state.user.id;
            item.innerHTML = `
                <div class="community-avatar">${escapeHtml(session.title?.charAt(0) || '?')}</div>
                <div class="community-info">
                    <h4>${escapeHtml(session.title)}</h4>
                    <p>${escapeHtml(session.location || 'Remote')} • ${escapeHtml(formatDate(session))} ${isOwner ? '• Owned' : ''}</p>
                </div>
                <a class="btn btn--secondary" href="/pages/kn_chat.html?sessionId=${session.id}">Chat</a>
            `;
            elements.communityList.appendChild(item);
        });
    }

    function renderDiscussions(sessions) {
        if (!elements.discussionsList) return;
        elements.discussionsList.innerHTML = '';
        if (!sessions.length) {
            elements.discussionsList.innerHTML = '<p class="status status--muted">No discussions yet. Join a session to start chatting.</p>';
            return;
        }
        const featured = sessions.slice(0, 3);
        featured.forEach((session) => {
            const item = document.createElement('div');
            item.className = 'discussion-item';
            item.innerHTML = `
                <div class="discussion-avatar">${session.title?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div class="discussion-content">
                    <h4>${escapeHtml(session.title)}</h4>
                    <p>${escapeHtml(session.description || 'New community discussion')}</p>
                    <div class="discussion-meta">
                        <span><i class="fas fa-users"></i> Host: ${session.created_by === state.user?.id ? 'You' : 'Mentor #' + session.created_by}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(session.location || 'Remote')}</span>
                        <span>${escapeHtml(formatDate(session))}</span>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                window.location.href = `/pages/kn_chat.html?sessionId=${session.id}`;
            });
            elements.discussionsList.appendChild(item);
        });
    }

    function formatDate(session) {
        if (session.start_time) {
            return new Date(session.start_time).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        if (session.date && session.time) {
            return `${session.date} @ ${session.time}`;
        }
        return 'Schedule TBD';
    }

    function showMessage(message, type = 'info') {
        const existing = document.querySelector('.message');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = `message message--${type}`;
        el.innerHTML = `
            <span>${message}</span>
            <button class="message-close">&times;</button>
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 5000);
        el.querySelector('.message-close').addEventListener('click', () => el.remove());
    }
});
