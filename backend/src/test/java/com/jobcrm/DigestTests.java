package com.jobcrm;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class DigestTests {
  @Test
  void digestIncludesDueAndOverdueAndSendsOncePerPacificDay() {
    Accounts accounts = mock(Accounts.class);
    CrmService crm = mock(CrmService.class);
    JavaMailSender mail = mock(JavaMailSender.class);
    Account a = new Account();
    a.id = "owner";
    a.email = "me@example.com";
    when(accounts.findAll()).thenReturn(List.of(a));
    Entry due = new Entry();
    due.kind = "todo";
    due.title = "First follow-up";
    due.dueDate = "2026-10-26";
    Entry overdue = new Entry();
    overdue.kind = "todo";
    overdue.title = "Call recruiter";
    overdue.dueDate = "2026-10-23";
    Entry future = new Entry();
    future.kind = "todo";
    future.title = "Next week";
    future.dueDate = "2026-11-01";
    Entry done = new Entry();
    done.kind = "todo";
    done.title = "Already done";
    done.dueDate = "2026-10-26";
    done.completed = true;
    when(crm.list("owner")).thenReturn(List.of(due, overdue, future, done));
    Digests d = new Digests(accounts, crm, mail);
    d.enabled = true;
    d.from = "reminders@example.com";
    d.runAt(ZonedDateTime.of(2026, 10, 26, 8, 59, 0, 0, ZoneId.of("America/Los_Angeles")));
    verifyNoInteractions(mail);
    var now = ZonedDateTime.of(2026, 10, 26, 9, 0, 0, 0, ZoneId.of("America/Los_Angeles"));
    d.runAt(now);
    d.runAt(now.plusMinutes(1));
    var message = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, times(1)).send(message.capture());
    assertThat(message.getValue().getTo()).containsExactly("me@example.com");
    assertThat(message.getValue().getText())
        .contains("First follow-up", "Call recruiter")
        .doesNotContain("Next week", "Already done");
    assertThat(a.digestDate).isEqualTo("2026-10-26");
  }

  @Test
  void deliveryFailureDoesNotMarkDigestSent() {
    Accounts accounts = mock(Accounts.class);
    CrmService crm = mock(CrmService.class);
    JavaMailSender mail = mock(JavaMailSender.class);
    Account a = new Account();
    a.id = "owner";
    a.email = "me@example.com";
    when(accounts.findAll()).thenReturn(List.of(a));
    Entry due = new Entry();
    due.kind = "todo";
    due.title = "Follow up";
    due.dueDate = "2026-10-26";
    when(crm.list("owner")).thenReturn(List.of(due));
    doThrow(new MailSendException("Unavailable")).when(mail).send(any(SimpleMailMessage.class));
    Digests d = new Digests(accounts, crm, mail);
    d.enabled = true;
    d.from = "reminders@example.com";
    d.runAt(ZonedDateTime.of(2026, 10, 26, 10, 0, 0, 0, ZoneId.of("America/Los_Angeles")));
    assertThat(a.digestDate).isNull();
    verify(accounts, never()).save(any());
  }
}
