package com.jobcrm;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class Security {
  @Bean
  PasswordEncoder passwords() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService users(Accounts accounts) {
    return email ->
        accounts
            .findByEmail(email)
            .map(a -> User.withUsername(a.email).password(a.passwordHash).roles("USER").build())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
  }

  @Bean
  SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/session",
                        "/api/register",
                        "/api/login",
                        "/",
                        "/index.html",
                        "/assets/**",
                        "/favicon.svg",
                        "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .formLogin(
            f ->
                f.loginProcessingUrl("/api/login")
                    .successHandler(
                        (q, s, a) -> {
                          s.setContentType("application/json");
                          s.getWriter().write("{\"ok\":true}");
                        })
                    .failureHandler((q, s, e) -> s.sendError(401, "Invalid email or password")))
        .logout(l -> l.logoutUrl("/api/logout").logoutSuccessHandler((q, s, a) -> s.setStatus(204)))
        .exceptionHandling(e -> e.authenticationEntryPoint((q, s, x) -> s.sendError(401)))
        .build();
  }
}
