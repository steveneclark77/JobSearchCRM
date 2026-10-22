package com.jobcrm;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface Accounts extends JpaRepository<Account, String> {
  Optional<Account> findByEmail(String email);
}
