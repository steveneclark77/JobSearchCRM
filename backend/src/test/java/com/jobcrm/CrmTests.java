package com.jobcrm;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1",
      "crm.backup-dir=/tmp/jobcrm-test-backups"
    })
@AutoConfigureMockMvc
class CrmTests {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;

  @Test
  void businessDaySchedule() {
    assertThat(CrmService.businessDays(LocalDate.of(2026, 10, 23), 1))
        .isEqualTo(LocalDate.of(2026, 10, 26));
    assertThat(CrmService.businessDays(LocalDate.of(2026, 10, 26), 3))
        .isEqualTo(LocalDate.of(2026, 10, 29));
    assertThat(CrmService.businessDays(LocalDate.of(2026, 10, 22), 1))
        .isEqualTo(LocalDate.of(2026, 10, 23));
    assertThat(CrmService.businessDays(LocalDate.of(2026, 10, 23), 3))
        .isEqualTo(LocalDate.of(2026, 10, 28));
    assertThat(CrmService.businessDays(LocalDate.of(2026, 12, 24), 1))
        .isEqualTo(LocalDate.of(2026, 12, 25));
  }

  JsonNode create(MockHttpSession session, Entry e) throws Exception {
    return mapper.readTree(
        mvc.perform(
                post("/api/entries")
                    .session(session)
                    .with(csrf())
                    .contentType("application/json")
                    .content(mapper.writeValueAsBytes(e)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  @Test
  void personalWorkspaceLifecycleAndRestore() throws Exception {
    mvc.perform(get("/api/entries")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/register").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/register")
                .with(csrf())
                .contentType("application/json")
                .content("{\"email\":\"me@example.com\",\"password\":\"a strong password 123\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/register")
                .with(csrf())
                .contentType("application/json")
                .content(
                    "{\"email\":\"other@example.com\",\"password\":\"a strong password 123\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/login")
                .with(csrf())
                .param("username", "me@example.com")
                .param("password", "wrong"))
        .andExpect(status().isUnauthorized());
    var response =
        mvc.perform(
                post("/api/login")
                    .with(csrf())
                    .param("username", "me@example.com")
                    .param("password", "a strong password 123"))
            .andExpect(status().isOk())
            .andReturn();
    var session = (MockHttpSession) response.getRequest().getSession(false);
    mvc.perform(
            post("/api/entries")
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content("{\"kind\":null}"))
        .andExpect(status().isBadRequest());
    Entry invalidUrl = new Entry();
    invalidUrl.kind = "opportunity";
    invalidUrl.title = "Unsafe URL";
    invalidUrl.company = "Acme";
    invalidUrl.source = "Test";
    invalidUrl.url = "javascript:alert(1)";
    mvc.perform(
            post("/api/entries")
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(invalidUrl)))
        .andExpect(status().isBadRequest());
    Entry c = new Entry();
    c.kind = "contact";
    c.firstName = "Alex";
    c.email = "alex@example.com";
    c.company = "Acme";
    var contact = create(session, c);
    Entry o = new Entry();
    o.kind = "opportunity";
    o.title = "Engineer";
    o.company = "Acme";
    o.source = "Referral " + "a".repeat(300);
    o.contactIds = List.of(contact.get("id").asText());
    var opportunity = create(session, o);
    Entry a = new Entry();
    a.kind = "application";
    a.opportunityId = opportunity.get("id").asText();
    a.status = "submit";
    a.submittedDate = "2026-10-23";
    var application = create(session, a);
    assertThat(application.get("status").asText()).isEqualTo("follow-up");
    var backup =
        mapper.readTree(
            mvc.perform(get("/api/backup").session(session))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    var todos = new ArrayList<JsonNode>();
    backup
        .get("entries")
        .forEach(
            e -> {
              if (e.get("kind").asText().equals("todo")) todos.add(e);
            });
    assertThat(todos).hasSize(2);
    assertThat(todos.stream().map(t -> t.get("dueDate").asText()))
        .containsExactlyInAnyOrder("2026-10-26", "2026-10-29");
    var task = mapper.treeToValue(todos.getFirst(), Entry.class);
    task.dueDate = "2026-11-02";
    mvc.perform(
            put("/api/entries/" + task.id)
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(task)))
        .andExpect(status().isOk());
    // Saving an already submitted application must not generate duplicate tasks.
    mvc.perform(
            put("/api/entries/" + application.get("id").asText())
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(application)))
        .andExpect(status().isOk());
    var data =
        mapper.readTree(
            mvc.perform(get("/api/entries").session(session))
                .andReturn()
                .getResponse()
                .getContentAsString());
    assertThat(data.size()).isEqualTo(5);
    mvc.perform(delete("/api/entries/" + contact.get("id").asText()).session(session).with(csrf()))
        .andExpect(status().isBadRequest());
    Entry i = new Entry();
    i.kind = "interaction";
    i.contactId = contact.get("id").asText();
    i.notes = "Discussed the team";
    i.occurredDate = "2026-10-23";
    create(session, i);
    // Invalid references must be rejected without changing the existing data.
    var invalid = backup.deepCopy();
    ((com.fasterxml.jackson.databind.node.ObjectNode) invalid.get("entries").get(0))
        .put("opportunityId", UUID.randomUUID().toString());
    mvc.perform(
            post("/api/restore")
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(invalid)))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/entries").session(session)).andExpect(jsonPath("$.length()").value(6));
    mvc.perform(
            post("/api/restore")
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(backup)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.restored").value(5));
    mvc.perform(get("/api/entries").session(session)).andExpect(jsonPath("$.length()").value(5));
    var closed = mapper.treeToValue(application, Entry.class);
    closed.status = "rejection";
    mvc.perform(
            put("/api/entries/" + closed.id)
                .session(session)
                .with(csrf())
                .contentType("application/json")
                .content(mapper.writeValueAsBytes(closed)))
        .andExpect(status().isOk());
    var after =
        mapper.readTree(
            mvc.perform(get("/api/entries").session(session))
                .andReturn()
                .getResponse()
                .getContentAsString());
    for (var e : after)
      if (e.get("kind").asText().equals("todo"))
        assertThat(e.get("completed").asBoolean()).isTrue();
    mvc.perform(post("/api/logout").session(session).with(csrf()))
        .andExpect(status().isNoContent());
  }
}
