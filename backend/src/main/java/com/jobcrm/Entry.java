package com.jobcrm;

import jakarta.persistence.*;
import java.util.*;

@Entity
@Table(name = "entries", indexes = @Index(name = "owner_idx", columnList = "ownerId"))
public class Entry {
  @Id public String id;

  @com.fasterxml.jackson.annotation.JsonIgnore
  @Column(nullable = false)
  public String ownerId;

  @Column(nullable = false)
  public String kind;

  @Column(length = 1000)
  public String title = "",
      firstName = "",
      lastName = "",
      email = "",
      phone = "",
      linkedinUrl = "",
      eventType = "",
      relatedTaskId = "",
      company = "",
      relationship = "",
      url = "",
      source = "",
      status = "",
      opportunityId = "",
      contactId = "",
      dueDate = "",
      submittedDate = "",
      occurredDate = "",
      createdAt = "",
      updatedAt = "";

  @Column(length = 20000)
  public String notes = "";

  public boolean completed = false, automatic = false;

  @ElementCollection(fetch = FetchType.EAGER)
  @OrderColumn(name = "contact_order")
  public List<String> contactIds = new ArrayList<>();

  @ElementCollection(fetch = FetchType.EAGER)
  @OrderColumn(name = "history_order")
  @Column(length = 200)
  public List<String> history = new ArrayList<>();

  public Entry() {}
}
