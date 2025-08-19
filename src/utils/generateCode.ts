export const generateMatchCode = (length: number = 6): string => {
    const chars = '123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const generateSessionToken = (): string => {
    return `ST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};