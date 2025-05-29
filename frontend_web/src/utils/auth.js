export const setAuthState = (tokens, user) => {
    try {
        if (!tokens?.access || !tokens?.refresh) {
            throw new Error('Invalid tokens provided');
        }

        if (!user?.id) {
            throw new Error('Invalid user data provided');
        }

        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(user));

        return true;
    } catch (error) {
        console.error('Error setting auth state:', error);
        clearAuthState();
        return false;
    }
};

export const clearAuthState = () => {
    try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('remember_token');
    } catch (error) {
        console.error('Error clearing auth state:', error);
    }
};

export const getAuthState = () => {
    try {
        const accessToken = localStorage.getItem('access_token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return { accessToken, user };
    } catch (error) {
        console.error('Error getting auth state:', error);
        clearAuthState();
        return { accessToken: null, user: null };
    }
};