// package com.gagan.chat.config;

// import jakarta.servlet.FilterChain;
// import jakarta.servlet.ServletException;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.servlet.http.HttpServletResponse;

// import org.springframework.stereotype.Component;
// import org.springframework.web.filter.OncePerRequestFilter;

// import java.io.IOException;

// @Component
// public class JwtFilter extends OncePerRequestFilter {

//     @Override
//     protected void doFilterInternal(
//             HttpServletRequest request,
//             HttpServletResponse response,
//             FilterChain filterChain
//     ) throws ServletException, IOException {

//         String authHeader = request.getHeader("Authorization");

//         if (authHeader != null && authHeader.startsWith("Bearer ")) {
//             String token = authHeader.substring(7);

//             try {
//                 String email = JwtUtil.extractEmail(token);
//                 request.setAttribute("userEmail", email);
//             } catch (Exception e) {
//                 response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
//                 return;
//             }
//         }

//         filterChain.doFilter(request, response);
//     }
// }
package com.gagan.chat.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    // These paths are public (permitAll in SecurityConfig) — the JWT filter
    // must never run on them. Without this, a stray/expired/invalid token
    // sent by the frontend (e.g. a leftover Authorization header from a
    // previous session) would block signup/login/websocket-connect before
    // the request even reaches the controller.
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/auth/")
                || path.startsWith("/api/files/")
                || path.startsWith("/uploads/")
                || path.startsWith("/ws/")
                || path.startsWith("/chat/")
                || path.startsWith("/api/users/")
                || path.startsWith("/api/bot/")
                || request.getMethod().equals("OPTIONS"); // never block CORS preflight
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                String email = JwtUtil.extractEmail(token);
                request.setAttribute("userEmail", email);
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}