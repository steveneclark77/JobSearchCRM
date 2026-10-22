package com.jobcrm;

import jakarta.persistence.*;

@Entity
@Table(name = "accounts")
public class Account {
  @Id public String id;

  @Column(unique = true, nullable = false)
  public String email;

  @com.fasterxml.jackson.annotation.JsonIgnore public String passwordHash;
  public String digestDate;

  public Account() {}
}
