export const getSlugFromUrl = () => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];
    return ['auth', 'login', 'register', 'forgot-password', 'category', 'lorum'].includes(slug) ? undefined : slug
}