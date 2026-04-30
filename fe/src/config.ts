declare global {
    interface Window { __ENV__?: { API_URL?: string } }
}

export const API_URL = window.__ENV__?.API_URL || '/api';
