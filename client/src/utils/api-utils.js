export const getSlugFromUrl = () => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];
    console.log('slug', slug); // "slug"
    return slug
}