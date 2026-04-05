export const getToken = () => localStorage.getItem("faas_token");
export const setToken = (token: string) => localStorage.setItem("faas_token", token);
export const removeToken = () => localStorage.removeItem("faas_token");
