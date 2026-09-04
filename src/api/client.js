const originalFetch = window.fetch.bind(window);

export const installAuthenticatedFetch = () => {
  window.fetch = (input, init = {}) => {
    const token = localStorage.getItem("token");
    const headers = new Headers(init.headers || {});
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
};
