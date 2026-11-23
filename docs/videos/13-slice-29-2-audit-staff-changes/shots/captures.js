window.FILM_CAPTURES = {
  "session": {
    "name": "Dana Reyes",
    "role": "Admin"
  },
  "wrongCode": {
    "error": "That code doesn't match. Codes change every 30 seconds, so enter the newest one."
  },
  "backend": {
    "command": "dotnet test",
    "passed": 411,
    "acceptance": [
      "Given_staff_with_two_step_set_up_When_their_code_starts_the_staff_session_Then_an_audit_entry_records_who_what_which_record_and_when",
      "Given_signed_in_staff_When_they_sign_out_Then_an_audit_entry_records_the_session_they_ended",
      "Given_staff_When_their_sign_in_is_refused_or_not_finished_Then_no_audit_entry_is_recorded: a wrong code",
      "Given_staff_When_their_sign_in_is_refused_or_not_finished_Then_no_audit_entry_is_recorded: a wrong password",
      "Given_staff_When_their_sign_in_is_refused_or_not_finished_Then_no_audit_entry_is_recorded: the password step alone, which starts no session"
    ],
    "telemetry": [
      "Given_staff_When_they_sign_in_and_out_Then_telemetry_names_each_audited_action_and_no_person_or_record"
    ],
    "behaviour": [
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: an auditable change that records and leaves the sa",
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: an auditable change that records, then saves with ",
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: an auditable change refused after recording, befor",
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: an auditable change refused before recording",
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: an auditable change that names no record",
      "Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds: a request that is not auditable",
      "Given_a_handler_outside_an_auditable_command_When_it_records_Then_it_is_refused"
    ]
  },
  "table": {
    "command": "dotnet ef migrations script",
    "columns": [
      "\"Id\" uuid NOT NULL",
      "\"ActorMemberId\" uuid NOT NULL",
      "\"Action\" character varying(64) NOT NULL",
      "\"RecordType\" character varying(64) NOT NULL",
      "\"RecordId\" uuid NOT NULL",
      "\"OccurredAt\" timestamp with time zone NOT NULL"
    ]
  }
};
