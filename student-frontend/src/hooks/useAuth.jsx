// src/hooks/useAuth.jsx
import { useContext } from "react";
import AuthContext from "../context/authContext";

export const useAuth = () => useContext(AuthContext);

export default useAuth;
