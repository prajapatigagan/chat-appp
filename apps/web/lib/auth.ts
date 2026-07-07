// // export const saveToken = (token: string) => {
// //   localStorage.setItem("token", token);
// // };

// // export const getToken = () => {
// //   return localStorage.getItem("token");
// // };

// // export const logout = () => {
// //   localStorage.removeItem("token");
// // };
// import { disconnectSocket } from "@/lib/socket";

// // ✅ Token save karo
// export const saveToken = (token: string) => {
//   localStorage.setItem("token", token);
// };

// // ✅ Token get karo
// export const getToken = () => {
//   return localStorage.getItem("token");
// };

// // ✅ UserId save karo (login ke baad call karo)
// export const saveUserId = (userId: string) => {
//   localStorage.setItem("userId", userId);
// };

// // ✅ UserId get karo
// export const getUserId = () => {
//   return localStorage.getItem("userId");
// };

// // ✅ Check karo logged in hai ya nahi
// export const isLoggedIn = (): boolean => {
//   return !!localStorage.getItem("token");
// };

// // ✅ Pura logout — WebSocket + localStorage clear + redirect
// export const logout = async () => {
//   const token = localStorage.getItem("token");
//   const email = localStorage.getItem("email");

//   try {
//     await fetch("${process.env.NEXT_PUBLIC_BACKEND_URL}auth/logout", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ email }),
//     });
//   } catch (error) {
//     console.error("Logout error:", error);
//   }

//   // ✅ WebSocket disconnect
//   disconnectSocket();

//   // ✅ Sab kuch clear karo
//   localStorage.removeItem("token");
//   localStorage.removeItem("userId");
//   localStorage.removeItem("email");
//   localStorage.removeItem("roomId");

//   // ✅ Login page pe redirect
//   window.location.href = "/login";
// };
import { disconnectSocket } from "@/lib/socket";

// ✅ Token save karo
export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

// ✅ Token get karo
export const getToken = () => {
  return localStorage.getItem("token");
};

// ✅ UserId save karo (login ke baad call karo)
export const saveUserId = (userId: string) => {
  localStorage.setItem("userId", userId);
};

// ✅ UserId get karo
export const getUserId = () => {
  return localStorage.getItem("userId");
};

// ✅ Check karo logged in hai ya nahi
export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem("token");
};

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
}

// ✅ Pura logout — WebSocket + localStorage clear + redirect
export const logout = async () => {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  try {
    // FIX: was using "..." (double quotes) so ${...} never interpolated —
    // it was literally sending the request to a URL that doesn't exist.
    // Must use backticks for template literals, plus a "/" before "auth/logout".
    await fetch(`${getApiBase()}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  // ✅ WebSocket disconnect
  disconnectSocket();

  // ✅ Sab kuch clear karo
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("email");
  localStorage.removeItem("roomId");

  // ✅ Login page pe redirect
  window.location.href = "/login";
};