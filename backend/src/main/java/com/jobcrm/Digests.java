package com.jobcrm;

import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class Digests {
  final Accounts accounts;
  final CrmService crm;
  final JavaMailSender mail;

  @Value("${crm.mail.enabled}")
  boolean enabled;

  @Value("${crm.mail.from}")
  String from;

  Digests(Accounts a, CrmService c, JavaMailSender m) {
    accounts = a;
    crm = c;
    mail = m;
  }

  @Scheduled(fixedDelay = 60000)
  public void tick() {
    runAt(ZonedDateTime.now(ZoneId.of("America/Los_Angeles")));
  }

  void runAt(ZonedDateTime now) {
    if (!enabled || now.getHour() < 9) return;
    for (var a : accounts.findAll())
      if (!now.toLocalDate().toString().equals(a.digestDate)) {
        var records = crm.list(a.id);
        var due =
            records.stream()
                .filter(
                    e ->
                        e.kind.equals("todo")
                            && !e.completed
                            && !e.dueDate.isBlank()
                            && !LocalDate.parse(e.dueDate).isAfter(now.toLocalDate()))
                .toList();
        if (due.isEmpty()) continue;
        StringBuilder text = new StringBuilder("Your job search tasks due today or overdue:\n\n");
        for (var e : due) {
          String opportunity =
              records.stream()
                  .filter(
                      o ->
                          o.kind.equals("opportunity")
                              && java.util.Objects.equals(o.id, e.opportunityId))
                  .map(o -> o.title + " at " + o.company)
                  .findFirst()
                  .orElse("");
          if (opportunity.isBlank() && !e.contactId.isBlank()) {
            opportunity =
                records.stream()
                    .filter(
                        contact ->
                            contact.kind.equals("contact")
                                && java.util.Objects.equals(contact.id, e.contactId))
                    .map(contact -> (contact.firstName + " " + contact.lastName).strip())
                    .findFirst()
                    .orElse("");
          }
          text.append("• ")
              .append(e.title)
              .append(" — ")
              .append(e.dueDate)
              .append(opportunity.isBlank() ? "" : " · " + opportunity)
              .append("\n");
        }
        try {
          SimpleMailMessage m = new SimpleMailMessage();
          m.setFrom(from);
          m.setTo(a.email);
          m.setSubject("JobSearchCRM · " + due.size() + " tasks to review");
          m.setText(text.toString());
          mail.send(m);
          a.digestDate = now.toLocalDate().toString();
          accounts.save(a);
        } catch (Exception ex) {
          org.slf4j.LoggerFactory.getLogger(Digests.class)
              .warn("Email digest delivery failed; check SMTP settings. Will retry next minute.");
        }
      }
  }
}
