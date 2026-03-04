export const getAvatarStorageKey = (username: string): string => `user_avatar_${username}`;

export const getUserAvatar = (
    username: string | null | undefined,
    defaultAvatar: string
): string => {
    if (!username) {
        return defaultAvatar;
    }
    try {
        const value = window.localStorage.getItem(getAvatarStorageKey(username));
        return value && value.trim() ? value : defaultAvatar;
    } catch {
        return defaultAvatar;
    }
};

export const ensureUserAvatar = (username: string | null | undefined, defaultAvatar: string): void => {
    if (!username) {
        return;
    }
    try {
        const key = getAvatarStorageKey(username);
        if (!window.localStorage.getItem(key)) {
            window.localStorage.setItem(key, defaultAvatar);
        }
    } catch {
        // ignore localStorage errors
    }
};

export const setUserAvatar = (username: string | null | undefined, avatar: string): void => {
    if (!username || !avatar) {
        return;
    }
    try {
        window.localStorage.setItem(getAvatarStorageKey(username), avatar);
    } catch {
        // ignore localStorage errors
    }
};
