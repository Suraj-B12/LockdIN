/**
 * API Client — fetch wrapper that auto-injects the JWT token.
 * Depends on supabase-client.js being loaded first.
 */

const API_BASE = '/api';

const api = {
    /**
     * Make an authenticated GET request.
     */
    async get(path) {
        return this._request('GET', path);
    },

    /**
     * Make an authenticated POST request.
     */
    async post(path, body = null) {
        return this._request('POST', path, body);
    },

    /**
     * Make an authenticated PUT request.
     */
    async put(path, body = null) {
        return this._request('PUT', path, body);
    },

    /**
     * Make an authenticated DELETE request.
     */
    async delete(path) {
        return this._request('DELETE', path);
    },

    /**
     * Internal request handler — adds auth header and handles errors.
     */
    async _request(method, path, body = null) {
        const token = await getAccessToken();

        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE}${path}`, options);

            // If token expired, try refreshing
            if (response.status === 401) {
                const refreshed = await this._tryRefresh();
                if (refreshed) {
                    // Retry the request with the new token
                    return this._request(method, path, body);
                } else {
                    // Refresh failed — redirect to login
                    window.location.href = '/login.html';
                    return null;
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API error: ${response.status}`);
            }

            // Handle 204 No Content
            if (response.status === 204) return null;

            return await response.json();
        } catch (error) {
            console.error(`API ${method} ${path} failed:`, error);
            throw error;
        }
    },

    /**
     * Try to refresh the access token using Supabase's built-in refresh.
     */
    async _tryRefresh() {
        try {
            const { data, error } = await window.supabaseClient.auth.refreshSession();
            return !error && data?.session;
        } catch {
            return false;
        }
    },

    _hasTriedRefresh: false
};
