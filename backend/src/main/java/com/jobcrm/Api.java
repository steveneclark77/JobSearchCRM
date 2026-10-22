package com.jobcrm;

import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.security.Principal;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class Api {
  final Accounts accounts;
  final CrmService service;
  final PasswordEncoder passwords;
  final ObjectMapper mapper;
  final Path backupDir;

  @Value("${crm.mail.enabled}")
  boolean mailEnabled;

  Api(
      Accounts a,
      CrmService s,
      PasswordEncoder p,
      ObjectMapper m,
      @Value("${crm.backup-dir}") String dir) {
    accounts = a;
    service = s;
    passwords = p;
    mapper = m;
    backupDir = Path.of(dir);
  }

  String owner(Principal p) {
    return accounts.findByEmail(p.getName()).orElseThrow().id;
  }

  @GetMapping("/session")
  Map<String, Object> session(Principal p, CsrfToken csrf) {
    return Map.of(
        "email",
        p == null ? "" : p.getName(),
        "setupRequired",
        accounts.count() == 0,
        "csrf",
        csrf.getToken(),
        "mailEnabled",
        mailEnabled);
  }

  record Credentials(String email, String password) {}

  @PostMapping("/register")
  synchronized Map<String, Boolean> register(@RequestBody Credentials c) {
    if (accounts.count() != 0)
      throw new ResponseStatusException(FORBIDDEN, "Personal account already exists");
    CrmService.require(
        c.email() != null
            && c.email().length() <= 254
            && c.email().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
        "Valid email is required");
    CrmService.require(
        c.password() != null
            && c.password().length() >= 12
            && c.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72,
        "Password must be at least 12 characters and at most 72 UTF-8 bytes");
    Account a = new Account();
    a.id = UUID.randomUUID().toString();
    a.email = c.email().strip().toLowerCase(Locale.ROOT);
    a.passwordHash = passwords.encode(c.password());
    accounts.save(a);
    return Map.of("ok", true);
  }

  @GetMapping("/entries")
  List<Entry> list(Principal p) {
    return service.list(owner(p));
  }

  @PostMapping("/entries")
  Entry create(Principal p, @RequestBody Entry e) {
    return service.save(owner(p), null, e);
  }

  @PutMapping("/entries/{id}")
  Entry update(Principal p, @PathVariable String id, @RequestBody Entry e) {
    return service.save(owner(p), id, e);
  }

  @DeleteMapping("/entries/{id}")
  void delete(Principal p, @PathVariable String id) {
    service.delete(owner(p), id);
  }

  record Backup(int version, String exportedAt, List<Entry> entries) {}

  @GetMapping("/backup")
  Backup backup(Principal p) {
    return new Backup(1, Instant.now().toString(), service.list(owner(p)));
  }

  @PostMapping("/restore")
  Map<String, Object> restore(Principal p, @RequestBody Backup backup) throws Exception {
    CrmService.require(backup.version() == 1, "Unsupported backup version");
    CrmService.require(
        backup.entries() != null && backup.entries().size() <= 50000, "Invalid backup size");
    String owner = owner(p);
    Set<String> ids = new HashSet<>();
    for (Entry e : backup.entries()) {
      CrmService.require(e != null && e.id != null, "Missing record ID");
      try {
        UUID.fromString(e.id);
      } catch (Exception ex) {
        CrmService.require(false, "Invalid record ID");
      }
      CrmService.require(ids.add(e.id), "Duplicate record ID");
      e.ownerId = owner;
    }
    for (Entry e : backup.entries()) {
      service.validate(e, backup.entries());
    }
    Files.createDirectories(backupDir);
    Path recovery = Files.createTempFile(backupDir, "before-restore-", ".json");
    Files.write(recovery, mapper.writeValueAsBytes(backup(p)));
    try {
      Files.setPosixFilePermissions(
          recovery, java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));
    } catch (UnsupportedOperationException ignored) {
    }
    service.restore(owner, backup.entries());
    return Map.of(
        "restored", backup.entries().size(), "recoveryFile", recovery.getFileName().toString());
  }

  @ExceptionHandler(ResponseStatusException.class)
  org.springframework.http.ResponseEntity<Map<String, String>> bad(ResponseStatusException e) {
    return org.springframework.http.ResponseEntity.status(e.getStatusCode())
        .body(Map.of("message", Objects.requireNonNullElse(e.getReason(), "Request failed")));
  }
}
