package com.jobcrm;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface Entries extends JpaRepository<Entry, String> {
  List<Entry> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

  Optional<Entry> findByIdAndOwnerId(String id, String ownerId);
}
