package com.jobcrm;

import static org.springframework.http.HttpStatus.*;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CrmService {
  final Entries entries;
  static final Set<String> KINDS =
      Set.of("contact", "opportunity", "application", "todo", "interaction");
  static final Set<String> STATUSES =
      Set.of(
          "lead",
          "research",
          "submit",
          "follow-up",
          "interview",
          "rejection",
          "pending",
          "offer",
          "withdrawn",
          "closed");
  static final Set<String> CLOSED = Set.of("rejection", "withdrawn", "closed", "offer");

  public CrmService(Entries entries) {
    this.entries = entries;
  }

  static void require(boolean ok, String message) {
    if (!ok) throw new ResponseStatusException(BAD_REQUEST, message);
  }

  public static LocalDate businessDays(LocalDate date, int days) {
    while (days > 0) {
      date = date.plusDays(1);
      if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY)
        days--;
    }
    return date;
  }

  public static LocalDate today() {
    return LocalDate.now(ZoneId.of("America/Los_Angeles"));
  }

  public List<Entry> list(String owner) {
    return entries.findByOwnerIdOrderByCreatedAtDesc(owner);
  }

  Entry get(String owner, String id) {
    return entries
        .findByIdAndOwnerId(id, owner)
        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Record not found"));
  }

  void validate(Entry e, List<Entry> all) {
    require(e.kind != null && KINDS.contains(e.kind), "Unknown record type");
    for (var field : Entry.class.getFields())
      try {
        if (field.getType() == String.class) {
          String value = (String) field.get(e);
          if (field.getName().equals("updatedAt") && value == null) continue;
          require(value != null, "Fields cannot be null");
          require(
              value.length() <= (field.getName().equals("notes") ? 20000 : 1000), "Field too long");
        }
      } catch (IllegalAccessException ex) {
        throw new IllegalStateException(ex);
      }
    require(
        e.history != null
            && e.history.size() <= 2000
            && e.history.stream().allMatch(h -> h != null && h.length() <= 200),
        "Invalid stage history");
    require(e.contactIds != null && e.contactIds.size() <= 100, "Invalid contact list");
    require(new HashSet<>(e.contactIds).size() == e.contactIds.size(), "Duplicate contacts");
    for (String date : List.of(e.dueDate, e.submittedDate, e.occurredDate))
      if (!date.isBlank())
        try {
          LocalDate.parse(date);
        } catch (Exception ex) {
          require(false, "Dates must use YYYY-MM-DD");
        }
    if (e.kind.equals("contact")) {
      require(!e.firstName.isBlank() || !e.lastName.isBlank(), "Contact needs a name");
      require(
          e.email.isBlank() || e.email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
          "Invalid email address");
    }
    if (Set.of("opportunity", "todo").contains(e.kind))
      require(!e.title.isBlank(), "Title is required");
    if (e.kind.equals("opportunity")) require(!e.company.isBlank(), "Company is required");
    if (e.kind.equals("opportunity"))
      require(
          !e.source.isBlank() || !e.contactId.isBlank(), "Add a source or choose a source contact");
    if (e.kind.equals("application")) {
      require(STATUSES.contains(e.status), "Invalid application status");
      require(!e.opportunityId.isBlank(), "Choose an opportunity");
    }
    if (e.kind.equals("interaction")) {
      require(!e.contactId.isBlank(), "Choose a contact");
      require(!e.notes.isBlank(), "Interaction notes are required");
      require(!e.occurredDate.isBlank(), "Interaction date is required");
    }
    if (!e.url.isBlank())
      try {
        var uri = java.net.URI.create(e.url);
        require(
            Set.of("https", "http").contains(uri.getScheme()) && uri.getHost() != null,
            "Use an http or https job URL");
      } catch (IllegalArgumentException ex) {
        require(false, "Invalid URL");
      }
    for (String id : e.contactIds)
      require(
          all.stream().anyMatch(x -> x.id.equals(id) && x.kind.equals("contact")),
          "Linked contact does not exist");
    if (!e.contactId.isBlank())
      require(
          all.stream().anyMatch(x -> x.id.equals(e.contactId) && x.kind.equals("contact")),
          "Linked contact does not exist");
    if (!e.opportunityId.isBlank())
      require(
          all.stream().anyMatch(x -> x.id.equals(e.opportunityId) && x.kind.equals("opportunity")),
          "Linked opportunity does not exist");
    if (e.kind.equals("application"))
      require(
          all.stream()
              .noneMatch(
                  x ->
                      !x.id.equals(e.id)
                          && x.kind.equals("application")
                          && x.opportunityId.equals(e.opportunityId)),
          "This opportunity already has an application");
  }

  @Transactional
  public Entry save(String owner, String id, Entry e) {
    require(e.kind != null && KINDS.contains(e.kind), "Unknown record type");
    Entry old = id == null ? null : get(owner, id);
    if (old != null) require(old.kind.equals(e.kind), "Record type cannot change");
    String previousOpportunityId = old == null ? "" : old.opportunityId;
    e.id = id == null ? UUID.randomUUID().toString() : id;
    e.ownerId = owner;
    e.createdAt = old == null ? Instant.now().toString() : old.createdAt;
    e.updatedAt = Instant.now().toString();
    e.automatic = old != null && old.automatic;
    var all = list(owner);
    validate(e, all);
    e.history = old == null ? new ArrayList<>() : new ArrayList<>(old.history);
    if (e.kind.equals("application") && (old == null || !old.status.equals(e.status)))
      e.history.add(Instant.now() + " | " + e.status);
    if (old != null && old.kind.equals("application") && !old.submittedDate.isBlank())
      require(
          old.opportunityId.equals(e.opportunityId),
          "Submitted applications cannot be moved to another opportunity");
    if (e.kind.equals("application") && e.status.equals("submit") && e.submittedDate.isBlank())
      e.submittedDate = today().toString();
    boolean submitted =
        e.kind.equals("application")
            && !e.submittedDate.isBlank()
            && (old == null || old.submittedDate.isBlank());
    if (e.kind.equals("application") && e.status.equals("follow-up"))
      require(!e.submittedDate.isBlank(), "Set the submission date first");
    if (old != null && old.kind.equals("application") && !old.submittedDate.isBlank())
      require(!e.submittedDate.isBlank(), "Keep the submission date once submitted");
    entries.save(e);
    if (submitted && !CLOSED.contains(e.status)) {
      LocalDate first = businessDays(LocalDate.parse(e.submittedDate), 1);
      createFollowup(owner, e, first, "First follow-up");
      createFollowup(owner, e, businessDays(first, 3), "Second follow-up");
      if (Set.of("lead", "research", "submit").contains(e.status)) {
        e.status = "follow-up";
        e.history.add(Instant.now() + " | follow-up");
      }
    }
    if (e.kind.equals("application") && CLOSED.contains(e.status))
      for (Entry task : all)
        if (task.kind.equals("todo")
            && task.automatic
            && task.opportunityId.equals(e.opportunityId)
            && !task.completed) {
          task.completed = true;
          task.updatedAt = e.updatedAt;
          entries.save(task);
        }
    Entry saved = entries.save(e);
    touchOpportunity(owner, e.opportunityId);
    if (!previousOpportunityId.equals(e.opportunityId))
      touchOpportunity(owner, previousOpportunityId);
    return saved;
  }

  void createFollowup(String owner, Entry app, LocalDate date, String title) {
    Entry t = new Entry();
    t.id = UUID.randomUUID().toString();
    t.ownerId = owner;
    t.kind = "todo";
    t.title = title;
    t.opportunityId = app.opportunityId;
    t.dueDate = date.toString();
    t.automatic = true;
    t.createdAt = Instant.now().toString();
    t.updatedAt = t.createdAt;
    entries.save(t);
  }

  @Transactional
  public void delete(String owner, String id) {
    var e = get(owner, id);
    var all = list(owner);
    require(
        all.stream()
            .noneMatch(
                x ->
                    !x.id.equals(id)
                        && (x.opportunityId.equals(id)
                            || x.contactId.equals(id)
                            || x.contactIds.contains(id))),
        "Remove linked records or contact links first");
    if (e.kind.equals("application"))
      require(
          all.stream().noneMatch(x -> x.automatic && x.opportunityId.equals(e.opportunityId)),
          "Delete this application's automatic follow-ups first");
    entries.delete(e);
    touchOpportunity(owner, e.opportunityId);
  }

  private void touchOpportunity(String owner, String id) {
    if (id == null || id.isBlank()) return;
    Entry opportunity = get(owner, id);
    opportunity.updatedAt = Instant.now().toString();
    entries.save(opportunity);
  }

  @Transactional
  public void restore(String owner, List<Entry> records) {
    entries.deleteAll(list(owner));
    entries.flush();
    for (Entry e : records) {
      e.ownerId = owner;
      entries.save(e);
    }
    entries.flush();
  }
}
